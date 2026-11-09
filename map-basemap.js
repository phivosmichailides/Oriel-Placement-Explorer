'use strict';
/*
 * Two coordinated Editorial style documents are hosted with the application.
 * Both use MapTiler Planet vector data; Automatic follows the app's light/dark
 * theme. Programme markers and filtering remain independent Leaflet layers.
 */
(()=>{
    const MAPTILER_KEY = 'JDEneNwTjuuyOGnlUckz';

const STYLE_ID='01a1b7cf-4ca7-7662-9861-84b5b44c218c';
const styleUrl=file=>new URL(file+'?v=20261109roads3',document.baseURI).toString();
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
  const fallbackInstances=new Set();
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
  // Empty tile areas use the style's real canvas colour; no tile-shaped blue overlay.
  const mapBackdropColour=()=>activeStyleName()==='editorial-dark'?'#1b2520':'#f7f3e9';
  const setMapBackdrop=map=>{
    const holder=map?.getContainer?.();
    if(holder)holder.style.backgroundColor=mapBackdropColour();
    const pane=map?.getPane?.('tilePane');
    if(pane)pane.style.backgroundColor='';
  };
  const styleAttribution=()=>MAPTILER_ATTR;
  const applyEditorialRoadDetail=map=>{
  if(!map||typeof map.getLayer!=='function')return false;
  try{
    if(!map.isStyleLoaded?.()||!map.getSource('maptiler_planet_v4'))return false;
    const existing=map.getStyle()?.layers||[],beforeId=existing.find(layer=>layer.type==='symbol')?.id;
    const dark=activeStyleName()==='editorial-dark',filter=['==',['geometry-type'],'LineString'];
    const baseWidth=['interpolate',['linear'],['zoom'],3,.8,5,1.05,7,1.3,9,1.55,11,1.85,13,2.2,15,2.75,17,3.45,19,4.3];
    const classScale=['match',['get','class'],'motorway',1.75,'trunk',1.55,'primary',1.4,'secondary',1.22,'tertiary',1.1,'minor',1,'service',.86,'track',.78,.95];
    const surfaceWidth=['*',baseWidth,classScale],casingWidth=['+',surfaceWidth,1.15];
    const casingColour=dark?'#1b2520':'#f7f3e9';
    const roadColour=dark
      ?['match',['get','class'],'motorway','#c79a70','trunk','#b88f68','primary','#a98361','secondary','#8e8d78','tertiary','#78867c','minor','#6f7d74','service','#64746c','track','#596b63','#65746c']
      :['match',['get','class'],'motorway','#9f7654','trunk','#a9825e','primary','#b48f68','secondary','#bea17c','tertiary','#c8b18f','minor','#cdbb9f','service','#d4c5ad','track','#d0c0a7','#d2c4ad'];
    const layout={'line-cap':'round','line-join':'round'};
    const layers=[
      {id:'atlas-road-casing',type:'line',source:'maptiler_planet_v4','source-layer':'road',minzoom:3,filter,layout,paint:{'line-color':casingColour,'line-opacity':1,'line-width':casingWidth}},
      {id:'atlas-road-surface',type:'line',source:'maptiler_planet_v4','source-layer':'road',minzoom:3,filter,layout,paint:{'line-color':roadColour,'line-opacity':1,'line-width':surfaceWidth}}
    ];
    let added=false;
    for(const layer of layers){
      if(!map.getLayer(layer.id)){map.addLayer(layer,beforeId);added=true;}
      else{map.setFilter(layer.id,filter);map.setLayoutProperty(layer.id,'line-cap','round');map.setLayoutProperty(layer.id,'line-join','round');for(const [name,value] of Object.entries(layer.paint))map.setPaintProperty(layer.id,name,value);}
    }
    if(added)return false;
    for(const id of ['Water','Water intermittent','Swimming pool'])if(map.getLayer(id))map.setPaintProperty(id,'fill-color',dark?'#2c413d':'#dfe8e4');
    for(const id of ['River','River intermittent','River tunnel','Stream','Stream intermittent','Stream tunnel'])if(map.getLayer(id))map.setPaintProperty(id,'line-color',dark?'#668982':'#a9c5c1');
    return true;
  }catch(error){console.warn('Editorial road detail could not be applied.',error);return false;}
};
  const removeFallbackRecord=record=>{
    if(!record)return;
    const map=record.leaflet;
    if(record.layer){try{map?.removeLayer(record.layer)}catch{}}
    rasterInstances.delete(record);
    fallbackInstances.delete(record);
    if(record.provider==='maptiler')map?.attributionControl?.removeAttribution(MAPTILER_ATTR);
    if(record.provider==='osm')map?.attributionControl?.removeAttribution(OSM_ATTR);
    if(map?._orielBasemapRecord===record)delete map._orielBasemapRecord;
  };
  const applyStyle=()=>{
    for(const record of instances){
      try{
        if(record.leaflet.getContainer().isConnected&&record.map){
          setMapBackdrop(record.leaflet);
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
        setMapBackdrop(record.leaflet);
        holder.dataset.basemap='vector-loading';
        queueMiniRender(record);
      }catch(error){console.warn('Mini-map style could not switch',error)}
    }
    for(const record of rasterInstances){
      try{
        const holder=record.leaflet.getContainer();
        if(!holder.isConnected){rasterInstances.delete(record);fallbackInstances.delete(record);continue;}
        setMapBackdrop(record.leaflet);
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
      note.textContent=isFallback?(String(reason||'').toLowerCase().includes('openstreetmap')?'OpenStreetMap fallback':'MapTiler raster fallback'):'';
      note.title=reason||'MapTiler raster tiles are shown because vector rendering is unavailable.';
    }
  };
  const MAX_GL_MAPS=7;
  const OSM_TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const osmFallback=(map,reason='MapTiler tiles are unavailable.')=>{
    const previous=map._orielBasemapRecord;
    if(previous?.layer)removeFallbackRecord(previous);
    map.attributionControl?.removeAttribution(MAPTILER_ATTR);
    map.attributionControl?.removeAttribution(RASTER_ATTR);
    setMapBackdrop(map);
    const layer=L.tileLayer(OSM_TILE_URL,{
      maxZoom:19,keepBuffer:3,updateWhenIdle:false,updateWhenZooming:true,updateInterval:200,
      attribution:OSM_ATTR,className:'oriel-osm-fallback'
    }).addTo(map);
    const record={leaflet:map,layer,provider:'osm',attribution:OSM_ATTR};
    map._orielBasemapRecord=record;
    fallbackInstances.add(record);
    const holder=map.getContainer();
    holder.dataset.basemap='osm-fallback';
    holder.dataset.basemapReason=reason;
    if(holder.classList.contains('uxMiniMap'))holder.dataset.miniStatus='osm-fallback';
    reportMainRenderer(map,true,'OpenStreetMap fallback: '+reason+' Programme pins remain interactive.');
    scheduleFallbackRetry();
    layer.on('tileerror',()=>{holder.dataset.mapTileStatus='tile-error';});
    map.on('unload',()=>{fallbackInstances.delete(record);if(map._orielBasemapRecord===record)delete map._orielBasemapRecord;});
    return {layer,kind:'osm',record};
  };
  const raster=(map,reason='Vector rendering is unavailable; the MapTiler raster map is being tried as a fallback.')=>{
    const previous=map._orielBasemapRecord;
    if(previous?.layer){try{map.removeLayer(previous.layer)}catch{}rasterInstances.delete(previous)}
    setMapBackdrop(map);
    const layer=L.tileLayer(rasterTileUrl(),{
      maxZoom:19,keepBuffer:3,updateWhenIdle:false,updateWhenZooming:true,updateInterval:200,
      attribution:MAPTILER_ATTR,className:'oriel-maptile-raster'
    }).addTo(map);
    const record={leaflet:map,layer,provider:'maptiler',attribution:MAPTILER_ATTR};
    map._orielBasemapRecord=record;
    rasterInstances.add(record);
    fallbackInstances.add(record);
    let loadedTiles=0,errorTiles=0,switched=false,timer;
    const useOpenStreetMap=reason=>{
      if(switched||!map.getContainer().isConnected)return;
      switched=true;
      if(timer)clearTimeout(timer);
      rasterInstances.delete(record);
      fallbackInstances.delete(record);
      try{map.removeLayer(layer)}catch{}
      osmFallback(map,reason);
    };
    layer.on('tileload',()=>{loadedTiles++;if(timer)clearTimeout(timer);});
    layer.on('tileerror',()=>{errorTiles++;if(errorTiles>=2)useOpenStreetMap('MapTiler raster tiles returned repeated errors; switching to a complete OpenStreetMap tile layer rather than leaving missing patches.');});
    map.on('unload',()=>{if(timer)clearTimeout(timer);rasterInstances.delete(record);fallbackInstances.delete(record);});
    timer=setTimeout(()=>{
      if(loadedTiles===0)useOpenStreetMap(errorTiles?'MapTiler raster tiles returned errors.':'MapTiler raster tiles did not arrive before the loading timeout.');
    },7000);
    const holder=map.getContainer();
    holder.dataset.basemap='raster-fallback';
    holder.dataset.basemapReason=reason;
    if(holder.classList.contains('uxMiniMap'))holder.dataset.miniStatus='raster-fallback';
    reportMainRenderer(map,true,reason);
    scheduleFallbackRetry();
    return {layer,kind:'raster',record};
  };
  const waitForMiniEvent=(target,event,timeoutMs=12000)=>new Promise((resolve,reject)=>{
    let settled=false;
    const onReady=()=>finish();
    const onError=event=>{
      const status=Number(event?.error?.status||event?.error?.statusCode||event?.status||0);
      if(status>=400)finish(Error('MapTiler mini-map request failed (HTTP '+status+'): '+String(event?.error?.message||event?.error||'')));
    };
    const finish=(error)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      target.off?.(event,onReady);
      target.off?.('error',onError);
      error?reject(error):resolve();
    };
    const timer=setTimeout(()=>finish(Error('Mini-map renderer timed out waiting for '+event)),timeoutMs);
    target.once(event,onReady);
    target.on('error',onError);
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
      miniRenderer.on('style.load',()=>applyEditorialRoadDetail(miniRenderer));
      await waitForMiniEvent(miniRenderer,'load',18000);
      applyEditorialRoadDetail(miniRenderer);
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
      applyEditorialRoadDetail(miniRenderer);
      miniRendererStyle=nextStyle;
    }
    return miniRenderer;
  };
  const watchMiniSize=record=>{
    const holder=record.leaflet.getContainer();
    if(record.sizeObserver||!window.ResizeObserver||!holder.isConnected)return;
    record.sizeObserver=new ResizeObserver(()=>{
      const size=record.leaflet.getSize();
      if(size.x>=80&&size.y>=60){record.sizeObserver?.disconnect();record.sizeObserver=null;queueMiniRender(record);}
    });
    record.sizeObserver.observe(holder);
  };
  const renderMiniRecord=async record=>{
    const map=record.leaflet,holder=map.getContainer();
    if(!holder.isConnected)return;
    holder.dataset.miniStatus='checking-size';
    const size=map.getSize();
    if(size.x<80||size.y<60){
      holder.dataset.miniStatus='waiting-for-size-'+Math.round(size.x)+'x'+Math.round(size.y);
      watchMiniSize(record);
      return;
    }
    if(!map._loaded){
      holder.dataset.miniStatus='leaflet-map-not-ready';
      if(!record.waitingForLoad){record.waitingForLoad=true;map.once('load',()=>{record.waitingForLoad=false;queueMiniRender(record);});}
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
    const renderedFeatures=renderer.queryRenderedFeatures();
    const vectorFeatures=renderedFeatures.some(feature=>feature.source==='maptiler_planet_v4');
    const roadFeatures=renderedFeatures.some(feature=>feature.source==='maptiler_planet_v4'&&feature.sourceLayer==='road');
    if(!vectorFeatures||!roadFeatures)throw Error('MapTiler did not render both map features and the road network for this mini-map.');
    const image=renderer.getCanvas().toDataURL('image/png');
    const bounds=map.getBounds();
    if(record.overlay){try{map.removeLayer(record.overlay)}catch{}}
    record.overlay=L.imageOverlay(image,bounds,{
      pane:'orielMiniSnapshot',interactive:false,opacity:1
    }).addTo(map);
    if(record.replaceFallback){removeFallbackRecord(record.replaceFallback);record.replaceFallback=null;}
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
      if(holder.isConnected){
        const message=String(error?.message||error||'');
        if(/\b403\b|forbidden|unauthori/i.test(message))osmFallback(map,'MapTiler rejected the mini-map request. '+message);
        else raster(map);
      }
    }).finally(()=>{
      record.queued=false;
      if(record.needsRender&&record.leaflet.getContainer().isConnected)queueMiniRender(record);
    });
    miniQueue=record.promise.catch(()=>{});
    return record.promise;
  };
  const addMiniSnapshot=(map,replaceFallback=null)=>{
    const holder=map.getContainer();
    const maplibre=window.maplibregl;
    const unsupported=typeof maplibre?.supported==='function'&&!maplibre.supported();
    if(!maplibre?.Map||unsupported||instances.size>=MAX_GL_MAPS)return raster(map);
    try{
      const pane=map.getPane('orielMiniSnapshot')||map.createPane('orielMiniSnapshot');
      pane.style.zIndex='250';
      pane.style.pointerEvents='none';
      map.attributionControl?.addAttribution(MAPTILER_ATTR);
      const record={leaflet:map,overlay:null,attribution:MAPTILER_ATTR,queued:false,needsRender:false,promise:null,sizeObserver:null,waitingForLoad:false,replaceFallback};
      miniInstances.add(record);
      holder.dataset.basemap='vector-loading';
      holder.dataset.miniStatus='registered';
      map.on('resize',()=>queueMiniRender(record));
      map.on('unload',()=>{record.sizeObserver?.disconnect();miniInstances.delete(record)});
      return {kind:'snapshot',provider:'maptiler',render:()=>queueMiniRender(record)};
    }catch(error){
      console.warn('Custom mini-map setup failed; displaying MapTiler raster tiles',error);
      return raster(map);
    }
  };
  const addTo=(map,{mini=false,replaceFallback=null}={})=>{
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
    if(mini)return addMiniSnapshot(map,replaceFallback);
    // MapLibre GL JS v5 may not expose supported(); absence is not a WebGL failure.
    const maplibre=window.maplibregl;
    const explicitlyUnsupported=typeof maplibre?.supported==='function'&&!maplibre.supported();
    if(!L.maplibreGL||!maplibre||explicitlyUnsupported||instances.size>=MAX_GL_MAPS){
      const reason=!maplibre?'MapLibre GL JS did not load.':!L.maplibreGL?'The Leaflet–MapLibre adapter did not load.':explicitlyUnsupported?'This browser reports WebGL as unavailable.':'The page has reached its MapLibre renderer limit.';
      return raster(map,reason);
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
    let layer,glMap,loaded=false,ready=false,ended=false,timeout,tileErrorCount=0;
    const record={map:null,leaflet:map,layer:null,attribution:styleAttribution(),replaceFallback};
    map._orielBasemapRecord=record;
    const fail=(reason='MapTiler vector rendering did not produce a usable map.',forceOsm=false)=>{
      if(ended)return;
      ready=false;
      ended=true;
      if(timeout)clearTimeout(timeout);
      instances.delete(record);
      if(map._orielBasemapRecord===record)delete map._orielBasemapRecord;
      if(record.replaceFallback){removeFallbackRecord(record.replaceFallback);record.replaceFallback=null;}
      try{map.removeLayer(layer)}catch{}
      if(retainedUnderlay){
        try{map.removeLayer(retainedUnderlay)}catch{}
        retainedUnderlay=null;
      }
      holder.dataset.basemapReason=reason;
      if(forceOsm)osmFallback(map,reason);
      else raster(map,reason);
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
        applyEditorialRoadDetail(glMap);
      });
      // The style's "load" event can precede the first fully rendered frame.
      // Keep the neutral OSM underlay until MapLibre is genuinely idle, so the
      // main map never exposes a blank cream canvas while vector tiles arrive.
      glMap.on('idle',()=>{
        if(ended||!loaded)return;
        if(!applyEditorialRoadDetail(glMap))return;
        let visibleVectorFeatures=0,visibleRoadFeatures=0;
        try{const rendered=glMap.queryRenderedFeatures();visibleVectorFeatures=rendered.filter(feature=>feature.source==='maptiler_planet_v4').length;visibleRoadFeatures=rendered.filter(feature=>feature.source==='maptiler_planet_v4'&&feature.sourceLayer==='road').length;}catch{}
        holder.dataset.roadFeatureCount=String(visibleRoadFeatures);
        if(!visibleVectorFeatures||!visibleRoadFeatures){fail('MapTiler loaded its style but did not render a usable road network.');return;}
        ready=true;
        if(timeout)clearTimeout(timeout);
        if(retainedUnderlay){
          try{map.removeLayer(retainedUnderlay)}catch{}
          retainedUnderlay=null;
        }
        setMapBackdrop(map);
        if(record.replaceFallback){removeFallbackRecord(record.replaceFallback);record.replaceFallback=null;}
        delete holder.dataset.basemapReason;
        holder.dataset.basemap='vector-'+mapAppearance();
        reportMainRenderer(map,false);
      });
      glMap.on('style.load',()=>{
        if(!ended){ready=false;holder.dataset.basemap='vector-loading';applyEditorialRoadDetail(glMap);}
      });
      glMap.on('error',event=>{
        const message=String(event.error?.message||event.error||'');
        const status=Number(event.error?.status||event.error?.statusCode||event.status||0);
        if(status>=400&&!/abort|cancel/i.test(message)){
          tileErrorCount++;
          if(ready&&tileErrorCount>=2){
            console.warn('Vector basemap developed repeated tile/request errors after initial render:',message,status);
            fail('MapTiler vector tiles became incomplete after loading ('+tileErrorCount+' failed requests).',status===403);
            return;
          }
        }
        // An initial style/tile failure should fall back rather than leave a
        // blank map. Aborted requests during later style switches are expected.
        if(!ready&&(status>=400||/style|fetch|network|failed|http|request|webgl|context|forbidden|unauthori|not found/i.test(message))){
          console.warn('Vector basemap failed before its first rendered frame:',message,status||'');
          fail('MapTiler vector request failed'+(status?' (HTTP '+status+')':'')+': '+message,status===403);
        }
      });
      timeout=setTimeout(()=>{if(!ready)fail('MapTiler vector tiles did not render before the loading timeout.')},30000);
      map.on('unload',()=>{
        ended=true;
        instances.delete(record);
        if(timeout)clearTimeout(timeout);
        if(map._orielBasemapRecord===record)delete map._orielBasemapRecord;
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
  const MAPLIBRE_JS='https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.js';
  const MAPLIBRE_CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.css';
  const MAPLIBRE_LEAFLET='https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js';
  const loadMapScript=(src,ready)=>{
    if(ready())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=[...document.querySelectorAll('script[data-oriel-map-asset]')].find(node=>node.dataset.orielMapAsset===src);
      if(existing)existing.remove();
      const script=document.createElement('script');
      script.src=src;script.crossOrigin='anonymous';script.dataset.orielMapAsset=src;
      const timer=setTimeout(()=>{script.remove();reject(Error('Map library timed out: '+src));},18000);
      script.onload=()=>{clearTimeout(timer);ready()?resolve():reject(Error('Map library loaded without its expected API: '+src));};
      script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Map library could not be loaded: '+src));};
      document.head.appendChild(script);
    });
  };
  const ensureMapLibraries=async()=>{
    if(navigator.onLine===false)throw Error('The browser is offline.');
    if(![...document.querySelectorAll('link[rel=stylesheet]')].some(link=>link.href===MAPLIBRE_CSS)){
      const link=document.createElement('link');link.rel='stylesheet';link.href=MAPLIBRE_CSS;
      link.crossOrigin='anonymous';link.dataset.orielMapAsset=MAPLIBRE_CSS;document.head.appendChild(link);
    }
    if(!window.maplibregl?.Map)await loadMapScript(MAPLIBRE_JS,()=>!!window.maplibregl?.Map);
    if(!window.L?.maplibreGL)await loadMapScript(MAPLIBRE_LEAFLET,()=>!!window.L?.maplibreGL);
    if(!window.maplibregl?.Map||!window.L?.maplibreGL)throw Error('MapLibre or its Leaflet adapter is still unavailable.');
  };
  let retryPromise=null;
  const retryFallbacks=()=>{
    if(navigator.onLine===false)return Promise.resolve(false);
    if(retryPromise)return retryPromise;
    retryPromise=(async()=>{
      try{await ensureMapLibraries();}catch(error){console.warn('MapLibre retry is not ready yet.',error);return false;}
      let recovered=0;
      for(const old of [...fallbackInstances]){
        const map=old.leaflet,holder=map?.getContainer?.();
        if(!holder?.isConnected){fallbackInstances.delete(old);rasterInstances.delete(old);continue;}
        const reason=String(holder.dataset.basemapReason||'');
        if(/webgl.{0,30}unavailable|renderer limit|HTTP 403|forbidden|unauthori/i.test(reason))continue;
        if(holder.dataset.basemap==='vector-loading')continue;
        const mini=holder.classList.contains('uxMiniMap');
        const result=addTo(map,{mini,replaceFallback:old});
        if(mini&&result?.kind==='snapshot'){
          try{await result.render();if(holder.dataset.basemap?.startsWith('vector-'))recovered++;}catch{}
        }else if(result?.kind==='vector')recovered++;
      }
      return recovered>0;
    })().finally(()=>{retryPromise=null;});
    return retryPromise;
  };
  let fallbackRetryAttempt=0,fallbackRetryTimer=null;
  const scheduleFallbackRetry=()=>{
    if(fallbackRetryTimer||!fallbackInstances.size||navigator.onLine===false)return;
    const retryable=[...fallbackInstances].some(record=>{const holder=record.leaflet?.getContainer?.(),reason=String(holder?.dataset.basemapReason||'');return !!holder?.isConnected&&!/webgl.{0,30}unavailable|renderer limit|HTTP 403|forbidden|unauthori/i.test(reason);});
    if(!retryable){fallbackRetryAttempt=0;return;}
    const delays=[3000,9000,20000,40000];
    if(fallbackRetryAttempt>=delays.length)return;
    fallbackRetryTimer=setTimeout(async()=>{
      fallbackRetryTimer=null;
      try{await retryFallbacks()}catch(error){console.warn('Automatic map recovery attempt failed.',error)}
      if(!fallbackInstances.size)fallbackRetryAttempt=0;else scheduleFallbackRetry();
    },delays[fallbackRetryAttempt++]);
  };
  window.addEventListener('online',()=>{
    fallbackRetryAttempt=0;
    if(fallbackRetryTimer){clearTimeout(fallbackRetryTimer);fallbackRetryTimer=null;}
    setTimeout(async()=>{await retryFallbacks();scheduleFallbackRetry();},450);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleFallbackRetry();});

  window.OrielBasemap={addTo,mode,styles:STYLES,choose,retry:retryFallbacks,get preference(){return preference;}};
})();
