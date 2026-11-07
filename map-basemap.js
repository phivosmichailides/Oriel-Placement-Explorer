'use strict';
/*
 * A MapTiler Editorial Light (light) / OpenFreeMap Dark vector basemap.
 * The underlying programme markers remain Leaflet layers.
 *
 * We deliberately NEVER use CARTO's current unkeyed raster endpoint:
 * it responds with a decorative "API KEY REQUIRED" bitmap and HTTP 200.
 * WebGL, CDN failure, stylesheet failure or a map service outage fallback
 * to OpenStreetMap's standard raster tiles with proper attribution.
 *
 * Third parties: MapTiler, OpenFreeMap, OpenMapTiles and OpenStreetMap.
 */
(()=>{
    const MAPTILER_KEY = 'JDEneNwTjuuyOGnlUckz';

const STYLES = Object.freeze({
  editorial: `https://api.maptiler.com/maps/01a1b7cf-4ca7-7662-9861-84b5b44c218c/style.json?key=${MAPTILER_KEY}`,
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fiord: 'https://tiles.openfreemap.org/styles/fiord'
});
  const STYLE_KEY='oriel-basemap-style-v1';
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
  const OPENFREE_ATTR='<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · '+OSM_ATTR;
  const RASTER_ATTR=OSM_ATTR;
  const instances=new Set();
  const mode=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  const activeStyleName=()=>preference==='auto'?(mode()==='dark'?'dark':'editorial'):preference;
  const style=()=>STYLES[activeStyleName()];
  const styleAttribution=()=>activeStyleName()==='editorial'?MAPTILER_ATTR:OPENFREE_ATTR;
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
  const addTo=(map,{mini=false}={})=>{
    if(!map||!window.L)return null;
    const holder=map.getContainer();
    if(!holder)return null;
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
  let previousMode=mode();
  new MutationObserver(()=>{
    const current=mode();
    if(previousMode===current)return;
    previousMode=current;
    if(preference==='auto')applyStyle();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.OrielBasemap={addTo,mode,styles:STYLES,choose,get preference(){return preference;}};
})();
