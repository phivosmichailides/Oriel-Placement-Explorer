'use strict';
const CACHE_NAME='placement-atlas-shell-2026-11-08-v2';
const ROOT=new URL('./',self.registration.scope).href;
const EXTRA_ASSETS=[
  'app-base.js?v=20261108atlas2','app-product.js?v=20261108atlas2','generic-public.js?v=20261108atlas2',
  'sector-map.js?v=20261108atlas2','onboarding.js?v=20261108atlas1','deadline-dates.js?v=20261106g',
  'map-basemap.js?v=20261108atlas2','workspace-ux.js?v=20261108atlas1',
  'location-blacklist.js?v=20261108atlas1','specialist-settings.js','area-rules.js',
  'locations-bundled.js?v=20261106a','tube-stations.js?v=20261108tfl2',
  'desk-enhancements.js?v=20261108atlas1','tinder-mode.js?v=20261108atlas1',
  'commute-guide.js?v=20261106a','commute-profile.js?v=20261106pcfix',
  'programme-preview.js?v=20261106fixed1','location-guides.js?v=20261106j',
  'pay-estimate.js?v=20261105c','research-core.js?v=1','research.js?v=20261015-no-ratings',
  'preferences-ui.js?v=20261107segmented1','theme-outcome.js?v=20261106i',
  'simulator.js?v=20261106preview1','motion-effects.js?v=20261107a',
  'session-ui.js?v=20261106filters1','interface-polish.js?v=20261107responsive2',
  'data/oriel-2026.part-01.txt','data/oriel-2026.part-02.txt','data/oriel-2026.part-03.txt',
  'data/oriel-2026.part-04.txt','data/oriel-2026.part-05.txt',
  'data/london-borough-labels.geojson','data/tube-stations.json',
  'locations.json','map-styles/editorial-light.json?v=20261108atlas2',
  'map-styles/editorial-dark.json?v=20261108atlas2',
  'vendor/leaflet.js','vendor/leaflet.css','icons/placement-atlas-192.png?v=20261108atlas2','icons/placement-atlas-512.png?v=20261108atlas2'
];
const localURL=value=>new URL(value,ROOT).href;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const urls=new Set([localURL('./'),localURL('index.html'),localURL('manifest.webmanifest?v=20261108atlas2'),localURL('favicon.svg?v=20261108atlas2'),localURL('pwa.css?v=20261108atlas1'),localURL('pwa.js?v=20261108atlas1'),...EXTRA_ASSETS.map(localURL)]);
    try{
      const response=await fetch(localURL('index.html'),{cache:'reload'});
      if(response.ok){
        await cache.put(localURL('index.html'),response.clone());
        const html=await response.text();
        for(const match of html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){
          try{const url=new URL(match[1],ROOT);if(url.origin===self.location.origin)urls.add(url.href)}catch{}
        }
      }
    }catch{}
    await Promise.all([...urls].map(async url=>{
      try{const response=await fetch(url,{cache:'reload'});if(response.ok&&response.type==='basic')await cache.put(url,response.clone())}catch{}
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
