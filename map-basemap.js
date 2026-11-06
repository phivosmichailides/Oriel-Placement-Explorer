'use strict';
/*
 * A modern, key-free OpenFreeMap Positron (light) / Dark vector basemap.
 * The underlying programme markers remain Leaflet layers.
 *
 * We deliberately NEVER use CARTO's current unkeyed raster endpoint:
 * it responds with a decorative "API KEY REQUIRED" bitmap and HTTP 200.
 * WebGL, CDN failure, stylesheet failure or a map service outage fallback
 * to OpenStreetMap's standard raster tiles with proper attribution.
 *
 * Third party: https://openfreemap.org, © OpenMapTiles © OpenStreetMap.
 */
(()=>{
  const STYLES={
    light:'https://tiles.openfreemap.org/styles/positron',
    dark:'https://tiles.openfreemap.org/styles/dark'
  };
  const ATTRIBUTION='&copy; <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';
  const RASTER_ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';
  const instances=new Set();
  const mode=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  const style=()=>STYLES[mode()];
  // Browsers limit concurrent WebGL contexts. Mini-maps load lazily,
  // and after five vector maps use OSM fallback to avoid blank canvases.
  const MAX_GL_MAPS=7;
  const raster=map=>{
    const layer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,keepBuffer:2,updateWhenIdle:true,attribution:RASTER_ATTR
    }).addTo(map);
    map.getContainer().dataset.basemap='raster-fallback';
    return {layer,kind:'raster'};
  };
  const addTo=(map,{mini=false}={})=>{
    if(!map||!window.L)return null;
    const holder=map.getContainer();
    if(!holder)return null;
    if(!L.maplibreGL||!window.maplibregl||!window.maplibregl.supported?.()||instances.size>=MAX_GL_MAPS){
      return raster(map);
    }
    // Keep a lightweight raster frame underneath the main vector map.
    // If WebGL temporarily clears during a zoom, the user sees a map
    // instead of a black flash or a tile boundary grid.
    let retainedUnderlay=null;
    if(!mini){
      retainedUnderlay=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,keepBuffer:3,updateWhenIdle:true,
        className:'oriel-map-backup',
        attribution:RASTER_ATTR
      }).addTo(map);
    }
    let layer,glMap,loaded=false,ended=false,timeout;
    const record={map:null,leaflet:map,layer:null,change:null};
    const fail=()=>{
      if(ended||loaded)return;
      ended=true;
      if(timeout)clearTimeout(timeout);
      instances.delete(record);
      try{map.removeLayer(layer)}catch{}
      if(retainedUnderlay)holder.dataset.basemap='raster-fallback';
      else raster(map);
    };
    try{
      layer=L.maplibreGL({
        style:style(),attribution:ATTRIBUTION,
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
      glMap.on('load',()=>{
        if(ended)return;
        loaded=true;
        if(timeout)clearTimeout(timeout);
        holder.dataset.basemap=mode()==='dark'?'vector-dark':'vector-positron';
      });
      glMap.on('error',event=>{
        const message=String(event.error?.message||event.error||'');
        // Failure to fetch a style/tiles: show a working raster fallback
        // instead of leaving a blank map. Do not fallback for incidental
        // glyph errors after the basemap has already rendered.
        if(!loaded&&/style|fetch|network|failed|http|request|webgl|context/i.test(message)){
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
  // Match the original app's six light/dark palettes without changing
  // sector pins, shortlist flags, or programme map behaviours.
  let previousMode=mode();
  new MutationObserver(()=>{
    const current=mode();
    if(previousMode===current)return;
    previousMode=current;
    for(const record of instances){
      try{
        if(record.leaflet.getContainer().isConnected&&record.map){
          record.map.setStyle(style());
          record.leaflet.getContainer().dataset.basemap=current==='dark'?'vector-dark':'vector-positron';
        }
      }catch(error){console.warn('Map style could not switch',error)}
    }
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.OrielBasemap={addTo,mode,styles:STYLES};
})();
