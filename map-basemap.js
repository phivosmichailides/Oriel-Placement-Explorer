'use strict';
/*
 * The default is the user's custom MapTiler Editorial style in BOTH website
 * themes. Alternative appearances are also MapTiler vector styles, so the
 * map never silently falls back to a different provider when the app is dark.
 * Programme markers and filtering remain independent Leaflet layers.
 */
(()=>{
    const MAPTILER_KEY = 'JDEneNwTjuuyOGnlUckz';

const STYLE_IDS=Object.freeze({
  editorial:'01a1b7cf-4ca7-7662-9861-84b5b44c218c',
  positron:'base-v4-light',
  bright:'bright-v2',
  liberty:'streets-v4',
  dark:'streets-v4-dark',
  fiord:'landscape-v4'
});
const maptilerStyle=id=>`https://api.maptiler.com/maps/${id}/style.json?key=${MAPTILER_KEY}`;
const STYLES=Object.freeze(Object.fromEntries(Object.entries(STYLE_IDS).map(([name,id])=>[name,maptilerStyle(id)])));
  const STYLE_KEY='oriel-basemap-style-v2';
  const CHOICES=new Set(['auto',...Object.keys(STYLES)]);
  let preference='auto';
  try{
    const saved=localStorage.getItem(STYLE_KEY)||'auto';
    if(CHOICES.has(saved))preference=saved;
  }catch{};
  // The adapter supports a single custom credit per layer. A MapTiler style
  // can repeat attribution across several sources, so supply one canonical credit.
  const OSM_ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';
  const MAPTILER_ATTR='<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> · '+OSM_ATTR;
  const RASTER_ATTR=OSM_ATTR;
  const instances=new Set();
  const miniInstances=new Set();
  const mode=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  // Automatic preserves the custom editorial cartography in both app themes.
  // The explicit Dark option is a separate MapTiler dark map.
  const activeStyleName=()=>preference==='auto'?'editorial':preference;
  const style=()=>STYLES[activeStyleName()];
  const rasterTileUrl=()=>`https://api.maptiler.com/maps/${STYLE_IDS[activeStyleName()]}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
  const styleAttribution=()=>MAPTILER_ATTR;
  const applyStyle=()=>{
    for(const record of instances){
      try{
        if(record.leaflet.getContainer().isConnected&&record.map){
          const nextAttribution=styleAttribution();
          if(record.attribution!==nextAttribution){
            record.leaflet.attributionControl?.removeAttribution(record.attribution);
            record.leaflet.attributionControl?.addAttribution(nextAttribution);
            record.layer.options.attributionControl.customAttribution=nextAttribution;
            record.attribution=nextAttribution;
          }
          record.map.setStyle(style(),{diff:false});
          record.leaflet.getContainer().dataset.basemap='vector-loading';
        }
      }catch(error){console.warn('Map style could not switch',error)}
    }
    // Mini-maps use MapTiler's raster rendering of the exact same style.
    // This avoids creating another WebGL context for every programme card.
    for(const record of miniInstances){
      try{
        const holder=record.leaflet.getContainer();
        if(!holder.isConnected){miniInstances.delete(record);continue;}
        record.reset();
        record.layer.setUrl(rasterTileUrl());
        holder.dataset.basemap='maptiler-raster-'+activeStyleName();
      }catch(error){console.warn('Mini-map style could not switch',error)}
    }
  };
  const choose=choice=>{
    if(!CHOICES.has(choice))return false;
    preference=choice;
    try{localStorage.setItem(STYLE_KEY,choice)}catch{}
    applyStyle();
    return true;
  };
  // Browsers limit concurrent WebGL contexts. Mini-maps load lazily,
  // and beyond the configured vector-map limit use OSM fallback.
  const reportMainRenderer=(map,isFallback,reason='')=>{
    if(map.getContainer()?.id!=='placementMap')return;
    const control=document.getElementById('mapStyle');
    const note=document.getElementById('mapStyleStatus');
    if(control){
      control.disabled=isFallback;
      control.title=isFallback?(reason||'Vector rendering is unavailable. Standard map is active.'):'';
    }
    if(note){
      note.hidden=!isFallback;
      note.textContent=isFallback?'Standard map (fallback)':'';
      note.title=reason||'A standard OpenStreetMap background is shown because vector rendering is unavailable.';
    }
  };
  const MAX_GL_MAPS=7;
  const raster=map=>{
    const layer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,keepBuffer:2,updateWhenIdle:true,attribution:RASTER_ATTR
    }).addTo(map);
    map.getContainer().dataset.basemap='raster-fallback';
    reportMainRenderer(map,true,'WebGL or the map provider is unavailable; the standard map remains interactive.');
    return {layer,kind:'raster'};
  };
  const addMiniRaster=map=>{
    const holder=map.getContainer();
    let layer,record,loaded=false,finished=false,timer=null,errors=0;
    const armFallback=()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(fallback,12000);
    };
    const cleanup=()=>{
      if(timer)clearTimeout(timer);
      if(record)miniInstances.delete(record);
    };
    const fallback=()=>{
      if(finished||loaded)return;
      finished=true;cleanup();
      try{if(layer)map.removeLayer(layer)}catch{}
      raster(map);
    };
    try{
      layer=L.tileLayer(rasterTileUrl(),{
        tileSize:256,minZoom:0,maxZoom:20,maxNativeZoom:20,
        keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false,
        crossOrigin:true,className:'oriel-maptiler-mini',
        attribution:MAPTILER_ATTR
      }).addTo(map);
      record={
        leaflet:map,layer,attribution:MAPTILER_ATTR,
        reset:()=>{loaded=false;errors=0;armFallback();}
      };
      miniInstances.add(record);
      holder.dataset.basemap='maptiler-raster-'+activeStyleName();
      layer.on('tileload',()=>{
        loaded=true;
        holder.dataset.basemap='maptiler-raster-'+activeStyleName();
        if(timer){clearTimeout(timer);timer=null;}
      });
      layer.on('tileerror',()=>{
        errors++;
        if(!loaded&&errors>=4)fallback();
      });
      armFallback();
      map.on('unload',cleanup);
      return {layer,kind:'raster',provider:'maptiler'};
    }catch(error){
      console.warn('MapTiler mini-map tiles unavailable; displaying OpenStreetMap',error);
      cleanup();
      try{if(layer)map.removeLayer(layer)}catch{}
      return raster(map);
    }
  };
  const addTo=(map,{mini=false}={})=>{
    if(!map||!window.L)return null;
    const holder=map.getContainer();
    if(!holder)return null;
    // Mini-maps use the same selected MapTiler style through raster XYZ tiles.
    // They retain their own Leaflet pins, site navigation and click behaviour,
    // without consuming scarce browser WebGL contexts.
    if(mini)return addMiniRaster(map);
    // MapLibre GL JS v5 may not expose supported(); absence is not a WebGL failure.
    const maplibre=window.maplibregl;
    const explicitlyUnsupported=typeof maplibre?.supported==='function'&&!maplibre.supported();
    if(!L.maplibreGL||!maplibre||explicitlyUnsupported||instances.size>=MAX_GL_MAPS){
      return raster(map);
    }
    // Keep OSM tiles only while the vector style initially loads. Once the
    // MapLibre canvas is ready, remove those tiles and their attribution:
    // retaining them can paint the standard map *over* the custom style.
    let retainedUnderlay=null;
    if(!mini){
      retainedUnderlay=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,keepBuffer:3,updateWhenIdle:true,
        className:'oriel-map-backup',
        attribution:RASTER_ATTR
      }).addTo(map);
    }
    // An explicit pane ensures vector tiles sit above any raster fallback
    // but below Leaflet programme markers and popups (overlayPane=400).
    const vectorPane=map.getPane('orielVectorBasemap')||map.createPane('orielVectorBasemap');
    vectorPane.style.zIndex='250';
    vectorPane.style.pointerEvents='none';
    let layer,glMap,loaded=false,ended=false,timeout;
    const record={map:null,leaflet:map,layer:null,attribution:styleAttribution()};
    const fail=()=>{
      if(ended||loaded)return;
      ended=true;
      if(timeout)clearTimeout(timeout);
      instances.delete(record);
      try{map.removeLayer(layer)}catch{}
      if(retainedUnderlay){
        holder.dataset.basemap='raster-fallback';
        reportMainRenderer(map,true,'Vector tiles could not load; the standard map remains interactive.');
      }
      else raster(map);
    };
    try{
      layer=L.maplibreGL({
        style:style(),pane:'orielVectorBasemap',
        attributionControl:{customAttribution:styleAttribution()},
        interactive:false,
        // The Leaflet adapter needs overscan: zero padding creates exposed
        // tile boundaries and flashes during zoom and pan.
        padding:mini?0.23:0.40,
        fadeDuration:80,
        cancelPendingTileRequestsWhileZooming:false,
        canvasContextAttributes:{
          alpha:true,
          antialias:true,
          preserveDrawingBuffer:!mini,
          powerPreference:'high-performance'
        }
      }).addTo(map);
      glMap=layer.getMaplibreMap();
      if(!glMap)throw Error('MapLibre layer did not initialise');
      record.map=glMap;
      record.layer=layer;
      instances.add(record);
      holder.dataset.basemap='vector-loading';
      const mapAppearance=()=>activeStyleName();
      glMap.on('load',()=>{
        if(ended)return;
        loaded=true;
        if(timeout)clearTimeout(timeout);
        // Do not keep the OSM raster drawn above the custom basemap.
        if(retainedUnderlay){
          try{map.removeLayer(retainedUnderlay)}catch{}
          retainedUnderlay=null;
        }
        holder.dataset.basemap='vector-'+mapAppearance();
        reportMainRenderer(map,false);
      });
      glMap.on('style.load',()=>{
        if(!ended)holder.dataset.basemap='vector-'+mapAppearance();
      });
      glMap.on('error',event=>{
        const message=String(event.error?.message||event.error||'');
        // Failure to fetch a style/tiles: show a working raster fallback
        // instead of leaving a blank map. Do not fallback for incidental
        // glyph errors after the basemap has already rendered.
        if(!loaded&&/style|fetch|network|failed|http|request|webgl|context/i.test(message)){
          console.warn('Vector basemap failed to load:',message);
          fail();
        }
      });
      timeout=setTimeout(()=>{if(!loaded)fail()},11000);
      map.on('unload',()=>{
        ended=true;
        instances.delete(record);
        if(timeout)clearTimeout(timeout);
      });
      return {layer,kind:'vector',map:glMap};
    }catch(error){
      console.warn('Modern basemap unavailable; displaying OpenStreetMap',error);
      fail();
      return {layer:null,kind:'raster'};
    }
  };
  // Basemap changes never change placement pins, sectors, shortlist flags or filters.
  const selector=document.getElementById('mapStyle');
  if(selector){
    selector.value=preference;
    selector.addEventListener('change',()=>choose(selector.value));
  }
  window.OrielBasemap={addTo,mode,styles:STYLES,choose,get preference(){return preference;}};
})();
