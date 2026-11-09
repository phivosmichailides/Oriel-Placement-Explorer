'use strict';
const CACHE_NAME='placement-atlas-shell-2026-11-09-v28';
const ROOT=new URL('./',self.registration.scope).href;
const EXTRA_ASSETS=[
  'app-base.js?v=20261109fix1','app-product.js?v=20261109fix2','generic-public.js?v=20261108atlas3',
  'sector-map.js?v=20261109fix2','onboarding.js?v=20261108atlas1','deadline-dates.js?v=20261106g',
  'map-basemap.js?v=20261109stable1','workspace-ux.js?v=20261109fix2','rail-stations.js?v=20261109national1',
  'location-blacklist.js?v=20261108atlas1','specialist-settings.js','area-rules.js',
  'locations-bundled.js?v=20261106a','tube-stations.js?v=20261108tfl2',
  'desk-enhancements.js?v=20261108atlas1','tinder-mode.js?v=20261108atlas1',
  'commute-guide.js?v=20261106a','commute-profile.js?v=20261106pcfix',
  'programme-preview.js?v=20261106fixed1','location-guides.js?v=20261109national1',
  'pay-estimate.js?v=20261105c','research-core.js?v=1','research.js?v=20261015-no-ratings',
  'preferences-ui.js?v=20261107segmented1','theme-outcome.js?v=20261106i',
  'simulator.js?v=20261106preview1','motion-effects.js?v=20261107a',
  'session-ui.js?v=20261108filters3','interface-polish.js?v=20261107responsive2',
  'data/oriel-2026.part-01.txt','data/oriel-2026.part-02.txt','data/oriel-2026.part-03.txt',
  'data/oriel-2026.part-04.txt','data/oriel-2026.part-05.txt',
  'data/london-borough-labels.geojson','data/tube-stations.json','data/rail-stations-ew.json?v=20261109national1',
  'data/rail-stations-ew-ODbL.txt','data/rail-stations-ew-ATTRIBUTION.md',
  'locations.json','map-styles/editorial-light.json?v=20261109roads3',
  'map-styles/editorial-dark.json?v=20261109roads3',
  'vendor/leaflet.js','vendor/leaflet.css','icons/placement-atlas-192.png?v=20261108atlas2','icons/placement-atlas-512.png?v=20261108atlas2'
];
const localURL=value=>new URL(value,ROOT).href;
const MAP_ASSET_CACHE='placement-atlas-map-assets-v1';
const MAP_TILE_CACHE='placement-atlas-map-tiles-v1';
const REMOTE_MAP_ASSETS=[
 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.js',
 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.css',
 'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'
];
const MAP_TILE_HOSTS=new Set(['api.maptiler.com','tile.openstreetmap.org']);
const trimMapTileCache=async cache=>{
 const keys=await cache.keys();
 for(let i=0;i<keys.length-700;i++)await cache.delete(keys[i]);
};
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const urls=new Set([localURL('./'),localURL('index.html'),localURL('manifest.webmanifest?v=20261108atlas2'),localURL('favicon.svg?v=20261108atlas2'),localURL('pwa.css?v=20261108atlas1'),localURL('pwa.js?v=20261109national2'),...EXTRA_ASSETS.map(localURL)]);
    // Do not activate a new worker unless the current app shell was
    // successfully fetched. This preserves the previous working offline app
    // if an update is attempted during a connection failure.
    const response=await fetch(localURL('index.html'),{cache:'reload'});
    if(!response.ok)throw Error('Placement Atlas app shell could not be refreshed.');
    await cache.put(localURL('index.html'),response.clone());
    const html=await response.text();
    for(const match of html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){
      try{const url=new URL(match[1],ROOT);if(url.origin===self.location.origin)urls.add(url.href)}catch{}
    }
    await Promise.all([...urls].map(async url=>{
      try{const response=await fetch(url,{cache:'reload'});if(response.ok&&response.type==='basic')await cache.put(url,response.clone())}catch{}
    }));
    // Cache the MapLibre runtime separately so a later offline reopen can still initialise the vector renderer.
    const mapAssets=await caches.open(MAP_ASSET_CACHE);
    await Promise.all(REMOTE_MAP_ASSETS.map(async url=>{
      try{const response=await fetch(url,{mode:'cors',cache:'reload'});if(response.ok)await mapAssets.put(url,response.clone())}catch{}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('placement-atlas-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('range'))return;
  const url=new URL(request.url);
  if(REMOTE_MAP_ASSETS.includes(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(MAP_ASSET_CACHE);
      const cached=await cache.match(request,{ignoreVary:true});
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response.ok)await cache.put(url.href,response.clone());
        return response;
      }catch{return Response.error();}
    })());
    return;
  }
  if(MAP_TILE_HOSTS.has(url.hostname)){
    event.respondWith((async()=>{
      const cache=await caches.open(MAP_TILE_CACHE);
      const cached=await cache.match(request,{ignoreVary:true});
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response.ok||response.type==='opaque'){
          try{await cache.put(request,response.clone());await trimMapTileCache(cache)}catch{}
        }
        return response;
      }catch{return Response.error();}
    })());
    return;
  }
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}
        return response;
      }catch{
        return await caches.match(request)||await caches.match(localURL('index.html'))||new Response('Placement Atlas is offline. Reconnect and refresh to continue.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }
  if(!/\.(?:js|css|json|geojson|txt|svg|png|webmanifest|html)$/i.test(url.pathname))return;
  event.respondWith((async()=>{
    const cached=await caches.match(request);
    try{
      const response=await fetch(request);
      if(response.ok&&response.type==='basic'){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}
      return response;
    }catch{return cached||Response.error()}
  })());
});
