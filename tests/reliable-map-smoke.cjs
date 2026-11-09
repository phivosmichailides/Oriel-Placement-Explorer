'use strict';
/* Production-focused map/browser regression. Fresh anonymous context only. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TARGET||'https://placementatlas.co.uk/';
const output='/tmp/oriel-map-theme-smoke';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   localStorage.setItem('phivos-onboarding-v1','1');
   localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify({region:'',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'}));
   localStorage.removeItem('oriel-basemap-style-v3');
  });
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>typeof placements!=='undefined'&&placements.length===4064&&!!window.OrielMapStats&&!!placementMap,null,{timeout:90000});
  const starting=await page.evaluate(()=>({center:placementMap.getCenter(),zoom:placementMap.getZoom(),name:document.title}));
  assert.equal(starting.name,'Placement Atlas');
  assert(starting.zoom>=9.1&&starting.zoom<=9.7&&Math.abs(starting.center.lat-51.5074)<.2,'Default map did not start in London: '+JSON.stringify(starting));
  await page.waitForFunction(()=>{
   const el=document.querySelector('#placementMap');
   return el&&(['streets-editorial-light','streets-editorial-dark','osm-fallback'].includes(el.dataset.basemap))&&
    el.querySelectorAll('.leaflet-tile-loaded').length>=3;
  },null,{timeout:45000});
  const initial=await page.evaluate(()=>({
    provider:document.querySelector('#placementMap').dataset.basemap,
    tiles:[...document.querySelectorAll('#placementMap .leaflet-tile-loaded')].map(x=>x.currentSrc||x.src),
    programmes:window.OrielMapStats.programmes,
    markers:window.OrielMapRenderedMarkerCount
  }));
  assert.equal(initial.programmes,4064);
  assert(initial.tiles.length>=3,'The map has not loaded adequate street tiles');
  assert(initial.markers>0&&initial.markers<1400,'Unexpected number of London overview markers: '+initial.markers);
  assert(await page.locator('#placementMap .oriel-group-count').first().evaluate(el=>el.getBoundingClientRect().width<=24),'Overview cluster icons should be small');
  assert(initial.tiles.some(x=>/maptiler\.com|openstreetmap\.org/.test(x)),'Map has no real street tile provider');
  await page.locator('#placementMap').screenshot({path:output+'/map-initial-london.png'});
  // Tube markers must be absent until close street-level zoom.
  await page.waitForFunction(()=>Array.isArray(window.ORIEL_TUBE_STATIONS)&&window.ORIEL_TUBE_STATIONS.length>=250,null,{timeout:20000});
  assert.equal(await page.locator('#placementMap .oriel-tube-roundel').count(),0,'Underground icons clutter the initial London view');
  await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],13.8,{animate:false}));
  await page.waitForFunction(()=>Math.abs(placementMap.getZoom()-13.8)<.05,null,{timeout:10000});
  assert.equal(await page.locator('#placementMap .oriel-tube-roundel').count(),0,'Underground icons appeared at wide neighbourhood zoom');
  await page.evaluate(()=>placementMap.setZoom(14.4,{animate:false}));
  await page.waitForFunction(()=>document.querySelectorAll('#placementMap .oriel-tube-roundel').length>0,null,{timeout:12000});
  const localTubeCount=await page.locator('#placementMap .oriel-tube-roundel').count();
  assert(localTubeCount>0&&localTubeCount<=24,'Local Tube stations are missing or overcrowded: '+localTubeCount);
  await page.evaluate(()=>placementMap.setZoom(15.6,{animate:false}));
  await page.waitForFunction(()=>document.querySelectorAll('#placementMap .oriel-tube-roundel').length>0,null,{timeout:12000});
  assert(await page.locator('#placementMap .oriel-tube-roundel').count()>0,'Underground icons missing at street-level zoom');
  await page.evaluate(()=>placementMap.setZoom(12,{animate:false}));
  await page.waitForFunction(()=>Math.abs(placementMap.getZoom()-12)<.05&&!document.querySelector('#placementMap .oriel-tube-roundel'),null,{timeout:10000});
  await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],9.4,{animate:false}));
  // Custom controls and map interactions.
  const controls=page.locator('#atlasMapZoom');
  await controls.waitFor({state:'visible'});
  assert.equal(await controls.locator('button').first().getAttribute('data-atlas-zoom'),'in','Plus must be above minus');
  assert.equal(await controls.locator('button').last().getAttribute('data-atlas-zoom'),'out','Minus must be below plus');
  const z=await page.evaluate(()=>placementMap.getZoom());
  await controls.locator('[data-atlas-zoom=in]').click();
  await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-(z+1))<.05&&!placementMap._animatingZoom,z,{timeout:10000});
  await controls.locator('[data-atlas-zoom=out]').click();
  await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-z)<.05&&!placementMap._animatingZoom,z,{timeout:10000});
  // Rapid taps should also reverse cleanly without a fractional-zoom drift.
  await controls.locator('[data-atlas-zoom=in]').click();
  await controls.locator('[data-atlas-zoom=out]').click();
  await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-z)<.05&&!placementMap._animatingZoom,z,{timeout:10000});
  await page.locator('#atlasMapExpand').click();
  await page.waitForFunction(()=>!document.getElementById('atlasMapFocus')?.hidden,null,{timeout:10000});
  assert.equal(await page.locator('#atlasMapFocus #placementMap').count(),1,'Focus opened a duplicate map');
  await page.locator('#atlasMapFocusClose').click();
  await page.waitForFunction(()=>document.getElementById('atlasMapFocus')?.hidden===true,null,{timeout:10000});
  // Dark and light themes should update actual map tiles without dropping pins.
  await page.locator('#mapStyle').selectOption('editorial-dark');
  await page.waitForFunction(()=>document.getElementById('placementMap')?.dataset.basemap==='streets-editorial-dark',null,{timeout:12000});
  await page.locator('#mapStyle').selectOption('editorial-light');
  await page.waitForFunction(()=>document.getElementById('placementMap')?.dataset.basemap==='streets-editorial-light',null,{timeout:12000});
  assert((await page.evaluate(()=>window.OrielMapStats?.programmes))===4064,'Changing theme lost programme pins');
  await page.locator('#placementMap').screenshot({path:output+'/map-light-road-network.png'});
  // Filtering changes map data without forcibly zooming to the country.
  await page.locator('[data-q=london]').first().click();
  await page.waitForFunction(()=>window.OrielMapStats?.programmes<4064,null,{timeout:12000});
  const filtered=await page.evaluate(()=>({zoom:placementMap.getZoom(),programmes:window.OrielMapStats.programmes,results:placements.filter(matches).length}));
  assert.equal(filtered.programmes,filtered.results);
  assert(filtered.zoom>8,'Filtering unexpectedly zoomed out to national view');
  await page.locator('[data-q=london]').first().click();
  await page.waitForFunction(()=>window.OrielMapStats?.programmes===4064,null,{timeout:12000});
  // Only an explicit user action should show full geographic bounds.
  await page.locator('#fitMap').click();
  await page.waitForFunction(()=>placementMap.getZoom()<8,null,{timeout:12000});
  await page.locator('#placementMap').screenshot({path:output+'/map-fit-all.png'});
  await page.evaluate(()=>placementMap.setView([51.5074,-.1278],12,{animate:false}));
  await page.waitForFunction(()=>document.querySelector('#placementMap .leaflet-tile-loaded'),null,{timeout:12000});
  await page.locator('#placementMap').screenshot({path:output+'/map-neighbourhood.png'});
  await page.locator('nav.tabs [data-tab=foryou]').click();
  assert(await page.locator('.productIntro').isVisible(),'Intro should remain on For You');
  await page.locator('nav.tabs [data-tab=tinderMode]').click();
  assert.equal(await page.locator('.productIntro').isVisible(),false,'Intro should hide on Tinder Mode');
  assert(await page.locator('#tinderMode .tdBoard').isVisible(),'Centred Tinder game should be visible');
  await page.locator('nav.tabs [data-tab=explore]').click();
  assert(await page.locator('.productIntro').isVisible(),'Intro should return on Explore');
  assert(await page.locator('#results .placement').count()>0,'Explore programme cards disappeared');
  assert(await page.locator('#results .uxMiniMap').count()>0,'Programme mini maps missing');
  // PWA metadata, install assets and shortlist interactions remain available.
  assert.equal(await page.locator('link[rel=manifest]').count(),1);
  assert.equal(await page.locator('link[rel=icon]').count()>=1,true);
  const toAdd=page.locator('#results .placement [data-action=prefer]').filter({hasText:'Add to shortlist'}).first();
  await toAdd.waitFor({state:'visible',timeout:10000});
  const id=await toAdd.evaluate(el=>el.closest('.placement')?.dataset.id);
  assert(id,'Selected placement has no stable ID');
  const countBefore=await page.evaluate(()=>ranked().length);
  await toAdd.click();
  await page.waitForFunction(count=>ranked().length===count+1,countBefore,{timeout:10000});
  await page.locator('nav.tabs [data-tab=shortlist]').click();
  await page.waitForFunction(id=>!![...document.querySelectorAll('#shortlistList>.rank-row .placement')].find(el=>el.dataset.id===id),id,{timeout:12000});
  const x=page.locator('#shortlistList>.rank-row .atlasRemoveShortlist[data-atlas-remove-shortlist='+JSON.stringify(id)+']');
  assert(await x.count()>0,'Desktop red X missing');
  await x.first().click();
  await page.waitForFunction(count=>ranked().length===count,countBefore,{timeout:12000});
  assert(!errors.some(x=>/ReferenceError|SyntaxError/.test(x)),'Browser exceptions: '+errors.join(';'));
  console.log('RELIABLE MAP SMOKE PASS',JSON.stringify({starting,provider:initial.provider,tiles:initial.tiles.length,filtered,shortlistRestored:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error('RELIABLE MAP SMOKE FAILED:',error.stack||error);process.exit(1);});