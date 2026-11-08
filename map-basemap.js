'use strict';
/*
 * Two coordinated Editorial style documents are hosted with the application.
 * Both use MapTiler Planet vector data; Automatic follows the app's light/dark
 * theme. Programme markers and filtering remain independent Leaflet layers.
 */
(()=>{
    const MAPTILER_KEY = 'JDEneNwTjuuyOGnlUckz';

const STYLE_ID='01a1b7cf-4ca7-7662-9861-84b5b44c218c';
const styleUrl=file=>new URL(file+'?v=20261108atlas1',document.baseURI).toString();
const STYLES=Object.freeze({
  'editorial-light':styleUrl('map-styles/editorial-light.json'),
  'editorial-dark':styleUrl('map-styles/editorial-dark.json')
});
  const STYLE_KEY='oriel-basemap-style-v3';
  const CHOICES=new Set(['auto',...Object.keys(STYLES)]);
  let preference='auto';
  try{
    const saved=localStorage.getItem(STYLE_KEY)||localStorage.getItem('oriel-basemap-style-v2')||'auto';
    if(saved==='dark'||saved==='editorial-dark')preference='editorial-dark';
    else if(saved==='editorial-light'||saved==='editorial'||['positron','bright','liberty','fiord'].includes(saved))preference='editorial-light';
    else if(saved==='auto')preference='auto';
    localStorage.setItem(STYLE_KEY,preference);
  }catch{};
  // The adapter supports a single custom credit per layer. A MapTiler style
  // can repeat attribution across several sources, so supply one canonical credit.
  const OSM_ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';
  const MAPTILER_ATTR='<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> · '+OSM_ATTR+' · Contains Ordnance Survey data © Crown copyright and database right (London borough labels, OGL v3.0)';
  const RASTER_ATTR=OSM_ATTR;
  const instances=new Set();
  const miniInstances=new Set();
  const rasterInstances=new Set();
  let miniRenderer=null,miniRendererHost=null,miniRendererStyle=null,miniQueue=Promise.resolve();
  const mode=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  // Automatic switches between two coordinated versions of the same map design.
  const activeStyleName=()=>preference==='auto'?(mode()==='dark'?'editorial-dark':'editorial-light'):preference;
  const style=()=>STYLES[activeStyleName()];
  // A raster fallback remains available on browsers without WebGL. The light
  // version uses the owner's hosted Editorial style; the dark fallback uses
  // MapTiler's native dark streets tiles until a custom raster style is hosted.
  const RASTER_STYLE_IDS={'editorial-light':'streets-v4','editorial-dark':'streets-v4-dark'};
  const rasterTileUrl=()=>`https://api.maptiler.com/maps/${RASTER_STYLE_IDS[activeStyleName()]}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
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
    // Re-render mini-map snapshots through one shared MapLibre context.
    // The image overlays update with the main map's selected custom style.
    for(const record of miniInstances){
      try{
        const holder=record.leaflet.getContainer();
        if(!holder.isConnected){miniInstances.delete(record);continue;}
        holder.dataset.basemap='vector-loading';
        queueMiniRender(record);
      }catch(error){console.warn('Mini-map style could not switch',error)}
    }
    for(const record of rasterInstances){
      try{
        const holder=record.leaflet.getContainer();
        if(!holder.isConnected){rasterInstances.delete(record);continue;}
        record.layer.setUrl(rasterTileUrl());
      }catch(error){console.warn('Raster fallback style could not switch',error)}
    }
  };
  const choose=choice=>{
    if(!CHOICES.has(choice))return false;
    preference=choice;
    try{localStorage.setItem(STYLE_KEY,choice)}catch{}
    applyStyle();
    return true;
  };
  let lastTheme=mode();
  const themeObserver=new MutationObserver(()=>{
    const nextTheme=mode();
    if(nextTheme===lastTheme)return;
    lastTheme=nextTheme;
    if(preference==='auto')applyStyle();
  });
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  // Browsers limit concurrent WebGL contexts. Mini-maps share one snapshot
  // renderer; unsupported devices use MapTiler raster tiles as a fallback.
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
      note.textContent=isFallback?'MapTiler raster fallback':'';
      note.title=reason||'MapTiler raster tiles are shown because vector rendering is unavailable.';
    }
  };
  const MAX_GL_MAPS=7;
  const raster=map=>{
    const layer=L.tileLayer(rasterTileUrl(),{
      maxZoom:19,keepBuffer:2,updateWhenIdle:true,attribution:MAPTILER_ATTR
    }).addTo(map);
    const record={leaflet:map,layer};
    rasterInstances.add(record);
    map.on('unload',()=>rasterInstances.delete(record));
    map.getContainer().dataset.basemap='raster-fallback';
    reportMainRenderer(map,true,'Vector rendering is unavailable; the MapTiler raster map remains interactive.');
    return {layer,kind:'raster',record};
  };
  const waitForMiniEvent=(target,event,timeoutMs=12000)=>new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      error?reject(error):resolve();
    };
    const timer=setTimeout(()=>finish(Error('Mini-map renderer timed out waiting for '+event)),timeoutMs);
    target.once(event,()=>finish());
  });
  const ensureMiniRenderer=async(width,height)=>{
    if(!window.maplibregl?.Map)throw Error('MapLibre is unavailable for mini-map snapshots');
    if(!miniRenderer){
      miniRendererHost=document.createElement('div');
      miniRendererHost.className='oriel-mini-renderer-host';
      miniRendererHost.setAttribute('aria-hidden','true');
      Object.assign(miniRendererHost.style,{
        position:'fixed',left:'-10000px',top:'0',
        width:width+'px',height:height+'px',
        opacity:'0',pointerEvents:'none',zIndex:'-1',
        overflow:'hidden'
      });
      document.body.appendChild(miniRendererHost);
      // Start at the already-loaded main-map view so MapTiler's style,
      // sprites and overlapping vector tiles can be reused from browser cache.
      const mainRecord=[...instances].find(record=>record.leaflet.getContainer()?.id==='placementMap'&&record.map);
      const mainCenter=mainRecord?.map.getCenter();
      const initialCenter=mainCenter?[mainCenter.lng,mainCenter.lat]:[-.1278,51.5074];
      const initialZoom=mainRecord&&Number.isFinite(mainRecord.map.getZoom())?mainRecord.map.getZoom():10;
      miniRenderer=new window.maplibregl.Map({
        container:miniRendererHost,
        style:style(),
        center:initialCenter,zoom:initialZoom,
        interactive:false,
        attributionControl:false,
        fadeDuration:0,
        refreshExpiredTiles:false,
        maxTileCacheSize:48,
        maxTileCacheZoomLevels:2,
        canvasContextAttributes:{
          alpha:true,antialias:false,preserveDrawingBuffer:true,
          powerPreference:'low-power'
        }
      });
      miniRendererStyle=activeStyleName();
      await waitForMiniEvent(miniRenderer,'load',18000);
    }else{
      miniRendererHost.style.width=width+'px';
      miniRendererHost.style.height=height+'px';
      miniRenderer.resize();
    }
    const nextStyle=activeStyleName();
    if(miniRendererStyle!==nextStyle){
      const ready=waitForMiniEvent(miniRenderer,'style.load',18000);
      miniRenderer.setStyle(style(),{diff:false});
      await ready;
      miniRendererStyle=nextStyle;
    }
    return miniRenderer;
  };
  const renderMiniRecord=async record=>{
    const map=record.leaflet,holder=map.getContainer();
    if(!holder.isConnected)return;
    holder.dataset.miniStatus='checking-size';
    const size=map.getSize();
    if(size.x<80||size.y<60){
      holder.dataset.miniStatus='waiting-for-size-'+Math.round(size.x)+'x'+Math.round(size.y);
      return;
    }
    if(!map._loaded){
      holder.dataset.miniStatus='leaflet-map-not-ready';
      return;
    }
    holder.dataset.miniStatus='rendering';
    const renderer=await ensureMiniRenderer(Math.round(size.x),Math.round(size.y));
    const center=map.getCenter();
    const zoom=Math.max(0,map.getZoom()-1);
    const idle=waitForMiniEvent(renderer,'idle',12000);
    renderer.jumpTo({center:[center.lng,center.lat],zoom});
    renderer.triggerRepaint();
    await idle;
    if(!holder.isConnected)return;
    const image=renderer.getCanvas().toDataURL('image/png');
    const bounds=map.getBounds();
    if(record.overlay){try{map.removeLayer(record.overlay)}catch{}}
    record.overlay=L.imageOverlay(image,bounds,{
      pane:'orielMiniSnapshot',interactive:false,opacity:1
    }).addTo(map);
    const renderedStyle=activeStyleName();
    holder.dataset.basemap='vector-'+renderedStyle;
    holder.dataset.miniStyle=renderedStyle;
    holder.dataset.miniStatus='rendered';
  };
  const queueMiniRender=record=>{
    // Coalesce rapid picker changes. A mini-map only needs the latest style,
    // not a queued snapshot for every intermediate option the user previews.
    if(record.queued){
      record.needsRender=true;
      return record.promise||miniQueue;
    }
    record.queued=true;
    record.promise=miniQueue.then(async()=>{
      do{
        record.needsRender=false;
        await renderMiniRecord(record);
      }while(record.needsRender&&record.leaflet.getContainer().isConnected);
    }).catch(error=>{
      console.warn('Custom mini-map snapshot failed; using standard map fallback',error);
      const map=record.leaflet,holder=map.getContainer();
      if(holder.isConnected)holder.dataset.miniStatus='failed: '+String(error?.message||error);
      miniInstances.delete(record);
      if(record.overlay){try{map.removeLayer(record.overlay)}catch{}record.overlay=null;}
      if(holder.isConnected)raster(map);
    }).finally(()=>{
      record.queued=false;
      if(record.needsRender&&record.leaflet.getContainer().isConnected)queueMiniRender(record);
    });
    miniQueue=record.promise.catch(()=>{});
    return record.promise;
  };
  const addMiniSnapshot=map=>{
    const holder=map.getContainer();
    const maplibre=window.maplibregl;
    const unsupported=typeof maplibre?.supported==='function'&&!maplibre.supported();
    if(!maplibre?.Map||unsupported||instances.size>=MAX_GL_MAPS)return raster(map);
    try{
      const pane=map.getPane('orielMiniSnapshot')||map.createPane('orielMiniSnapshot');
      pane.style.zIndex='250';
      pane.style.pointerEvents='none';
      map.attributionControl?.addAttribution(MAPTILER_ATTR);
      const record={leaflet:map,overlay:null,attribution:MAPTILER_ATTR,queued:false,needsRender:false,promise:null};
      miniInstances.add(record);
      holder.dataset.basemap='vector-loading';
      holder.dataset.miniStatus='registered';
      map.on('unload',()=>miniInstances.delete(record));
      return {kind:'snapshot',provider:'maptiler',render:()=>queueMiniRender(record)};
    }catch(error){
      console.warn('Custom mini-map setup failed; displaying MapTiler raster tiles',error);
      return raster(map);
    }
  };
  const addTo=(map,{mini=false}={})=>{
    if(!map||!window.L)return null;
    const holder=map.getContainer();
    if(!holder)return null;
    // Leaflet's library-name prefix is optional, not data attribution.
    // Keep the legally required MapTiler and OpenStreetMap credits, but avoid
    // repeating the "Leaflet" label on every map and programme mini-map.
    map.attributionControl?.setPrefix(false);
    // Mini-maps render snapshots from the same selected Editorial vector style.
    // Leaflet still owns their site/Tube markers, attribution and click target,
    // while a single shared MapLibre context avoids WebGL-context exhaustion.
    if(mini)return addMiniSnapshot(map);
    // MapLibre GL JS v5 may not expose supported(); absence is not a WebGL failure.
    const maplibre=window.maplibregl;
    const explicitlyUnsupported=typeof maplibre?.supported==='function'&&!maplibre.supported();
    if(!L.maplibreGL||!maplibre||explicitlyUnsupported||instances.size>=MAX_GL_MAPS){
      return raster(map);
    }
    // Keep the lightweight OSM underlay only while the Editorial vector style
    // loads. It is removed as soon as the MapLibre canvas is ready; the actual
    // fallback, if required, uses MapTiler's standard light/dark raster tiles.
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
    let layer,glMap,loaded=false,ready=false,ended=false,timeout;
    const record={map:null,leaflet:map,layer:null,attribution:styleAttribution()};
    const fail=()=>{
      if(ended||ready)return;
      ended=true;
      if(timeout)clearTimeout(timeout);
      instances.delete(record);
      try{map.removeLayer(layer)}catch{}
      if(retainedUnderlay){
        try{map.removeLayer(retainedUnderlay)}catch{}
        retainedUnderlay=null;
      }
      raster(map);
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
      });
      // The style's "load" event can precede the first fully rendered frame.
      // Keep the neutral OSM underlay until MapLibre is genuinely idle, so the
      // main map never exposes a blank cream canvas while vector tiles arrive.
      glMap.on('idle',()=>{
        if(ended||!loaded)return;
        ready=true;
        if(timeout)clearTimeout(timeout);
        if(retainedUnderlay){
          try{map.removeLayer(retainedUnderlay)}catch{}
          retainedUnderlay=null;
        }
        holder.dataset.basemap='vector-'+mapAppearance();
        reportMainRenderer(map,false);
      });
      glMap.on('style.load',()=>{
        if(!ended)holder.dataset.basemap='vector-loading';
      });
      glMap.on('error',event=>{
        const message=String(event.error?.message||event.error||'');
        // An initial style/tile failure should fall back rather than leave a
        // blank map. Aborted requests during later style switches are expected.
        if(!ready&&/style|fetch|network|failed|http|request|webgl|context/i.test(message)){
          console.warn('Vector basemap failed before its first rendered frame:',message);
          fail();
        }
      });
      timeout=setTimeout(()=>{if(!ready)fail()},18000);
      map.on('unload',()=>{
        ended=true;
        instances.delete(record);
        if(timeout)clearTimeout(timeout);
      });
      return {layer,kind:'vector',map:glMap};
    }catch(error){
      console.warn('Modern basemap unavailable; displaying MapTiler raster tiles',error);
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
