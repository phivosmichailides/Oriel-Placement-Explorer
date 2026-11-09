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
  assert(starting.zoom>=10&&starting.zoom<=11.6&&Math.abs(starting.center.lat-51.5074)<.2,'Default map did not start in London: '+JSON.stringify(starting));
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
  // Regression: the map must not discard its previous tile level mid-zoom.
  const mainRasterOptions=await page.evaluate(()=>{
    const layer=placementMap._orielBasemapRecord?.layer;
    return {keepBuffer:layer?.options?.keepBuffer,updateWhenZooming:layer?.options?.updateWhenZooming};
  });
  assert(mainRasterOptions.keepBuffer>=6&&mainRasterOptions.updateWhenZooming===false,
    'Main map should retain previous tiles while zooming: '+JSON.stringify(mainRasterOptions));
  assert(initial.tiles.some(x=>/maptiler\.com|openstreetmap\.org/.test(x)),'Map has no real street tile provider');
  // Sticky app navigation reuses the original page controllers.
  await page.waitForFunction(()=>!!document.querySelector('header.top nav.tabs')&&!!document.getElementById('atlasDataTools'),null,{timeout:12000}).catch(async error=>{
    const detail=await page.evaluate(()=>({header:!!document.querySelector('header.top'),navParent:document.querySelector('nav.tabs')?.parentElement?.tagName,footer:!!document.getElementById('atlasDataTools'),scripts:[...document.scripts].filter(el=>el.src.includes('atlas-navigation')).map(el=>el.src),message:document.body.dataset.atlasView}));
    throw new Error('Persistent navigation did not mount: '+JSON.stringify(detail)+'; '+error.message);
  });
  await page.waitForFunction(()=>!!document.querySelector('header.top nav.tabs [data-tab=tinderMode]'),null,{timeout:20000}).catch(async error=>{
    const detail=await page.evaluate(()=>({tabs:[...document.querySelectorAll('nav.tabs .tab')].map(el=>el.dataset.tab),placements:typeof placements==='undefined'?'undefined':placements.length,simPanel:!!document.getElementById('simulator'),tinderPanel:!!document.getElementById('tinderMode')}));
    throw new Error('Dynamic navigation not ready: '+JSON.stringify(detail)+'; '+error.message);
  });
  assert.equal(await page.locator('header.top nav.tabs').count(),1,'Main navigation is not in the persistent header');
  assert.equal(await page.locator('header.top #exportBtn').count(),0,'Export decisions still occupies the top toolbar');
  assert.equal(await page.locator('#atlasDataTools #exportBtn').count(),1,'Export decisions is missing from footer');
  assert.equal(await page.locator('#atlasDataTools #backupBtn').count(),1,'Backup is missing from footer');
  assert.equal(await page.locator('#atlasDataTools #restoreBtn').count(),1,'Restore is missing from footer');
  assert.equal(await page.locator('#atlasDataTools #uploadBtn').count(),1,'CSV upload is missing from footer');
  assert.equal(await page.locator('#atlasHeaderTools #themeToggle').count(),1,'Theme control missing below the main banner');
  assert.equal(await page.locator('header.top #themeToggle').count(),0,'Theme control should be below the sticky navigation');
  await page.waitForFunction(()=>!!document.querySelector('#atlasHeaderTools #orielDeadline')&&!!document.querySelector('#atlasHeaderTools #orielCloudAccount'),null,{timeout:20000});
  assert.equal(await page.locator('header.top #orielDeadline').count(),0,'Recruitment panel is still enlarging the permanent banner');
  const headerDimensions=await page.evaluate(()=>{
    const header=document.querySelector('header.top'),brand=header.querySelector('.brand'),nav=header.querySelector('nav.tabs'),status=document.getElementById('atlasHeaderTools');
    const h=header.getBoundingClientRect(),b=brand.getBoundingClientRect(),n=nav.getBoundingClientRect(),t=status.getBoundingClientRect();
    return {height:h.height,brandY:b.y+b.height/2,navY:n.y+n.height/2,navRight:n.right,headerRight:h.right,statusY:t.y,headerBottom:h.bottom};
  });
  assert(headerDimensions.height<98,'Desktop permanent banner too tall: '+JSON.stringify(headerDimensions));
  assert(Math.abs(headerDimensions.brandY-headerDimensions.navY)<16,'Logo/title and nav are not on the same row: '+JSON.stringify(headerDimensions));
  assert(headerDimensions.navRight<=headerDimensions.headerRight+1,'Primary navigation spills beyond header');
  assert(headerDimensions.statusY>=headerDimensions.headerBottom-1,'Status and account controls are not below header');
  assert.equal(await page.locator('header.top .brand .logo img').count(),0,'Square favicon should not appear as the page logo');
  assert.equal(await page.locator('header.top .brand .atlasLogoGlyph path').count(),1,'Palette-aware cross is missing');
  await page.waitForFunction(()=>!!document.querySelector('.panel.active .historyControls'),null,{timeout:20000});
  assert.equal(await page.locator('header.top .historyControls').count(),0,'Undo/redo should not be in sticky banner');
  const tileFilter=await page.evaluate(()=>getComputedStyle(document.querySelector('#placementMap .leaflet-tile-pane')).filter);
  assert.notEqual(tileFilter,'none','MapTiler Streets raster colour treatment did not apply');
  assert(await page.locator('header.top').evaluate(el=>getComputedStyle(el).position==='sticky'),'Main header must remain sticky');
  const visibleNav=await page.evaluate(()=>[...document.querySelectorAll('header.top nav.tabs .tab')]
    .filter(el=>getComputedStyle(el).display!=='none').map(el=>el.dataset.tab));
  assert.deepEqual(visibleNav,['explore','shortlist','simulator','tinderMode','outcome','prefs'],'Unexpected main navigation order');
  await page.locator('#atlasExploreSubnav [data-atlas-subtab=foryou]').click();
  assert(await page.locator('#foryou .historyControls').count()===1,'Undo/redo should follow For You view');
  await page.waitForFunction(()=>document.getElementById('foryou')?.classList.contains('active'),null,{timeout:10000});
  assert(await page.locator('header.top [data-tab=explore]').evaluate(el=>el.classList.contains('atlasParentActive')),'Explore should remain the parent of For You');
  assert(await page.locator('#foryou .atlasExploreSubnav').isVisible(),'For You nested navigation is missing');
  await page.locator('#atlasForYouSubnav [data-atlas-subtab=explore]').click();
  await page.waitForFunction(()=>document.getElementById('explore')?.classList.contains('active'),null,{timeout:10000});
  await page.locator('#atlasCompareOpen').click();
  await page.waitForFunction(()=>document.getElementById('compare')?.classList.contains('active'),null,{timeout:10000});
  assert.equal(await page.locator('header.top [data-tab=compare]').isVisible(),false,'Compare should not occupy the main navigation');
  await page.locator('#atlasCompareBack').click();
  await page.waitForFunction(()=>document.getElementById('explore')?.classList.contains('active'),null,{timeout:10000});
  await page.evaluate(()=>window.scrollTo(0,700));
  await page.waitForFunction(()=>window.scrollY>250,null,{timeout:10000});
  assert(await page.locator('header.top').evaluate(el=>{const y=el.getBoundingClientRect().top;return y>=-2&&y<=12}),'Navigation disappeared on scroll');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#placementMap').screenshot({path:output+'/map-initial-london.png'});
  // Tube markers must be absent until close street-level zoom.
  await page.waitForFunction(()=>Array.isArray(window.ORIEL_TUBE_STATIONS)&&window.ORIEL_TUBE_STATIONS.length>=250,null,{timeout:20000});
  assert.equal(await page.locator('#placementMap .oriel-tube-roundel').count(),0,'Underground icons clutter the initial London view');
  await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],15.4,{animate:false}));
  await page.waitForFunction(()=>Math.abs(placementMap.getZoom()-15.4)<.05,null,{timeout:10000});
  assert.equal(await page.locator('#placementMap .oriel-tube-roundel').count(),0,'Underground icons appeared before street-level zoom');
  await page.evaluate(()=>placementMap.setZoom(15.6,{animate:false}));
  await page.waitForFunction(()=>document.querySelectorAll('#placementMap .oriel-tube-roundel').length>0,null,{timeout:12000});
  assert(await page.locator('#placementMap .oriel-tube-roundel').count()>0,'Underground icons missing at close street-level zoom');
  await page.evaluate(()=>placementMap.setZoom(12,{animate:false}));
  await page.waitForFunction(()=>Math.abs(placementMap.getZoom()-12)<.05&&!document.querySelector('#placementMap .oriel-tube-roundel'),null,{timeout:10000});
  await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],10.4,{animate:false}));
  // Custom controls and map interactions.
  const controls=page.locator('#atlasMapZoom');
  await controls.waitFor({state:'visible'});
  assert.equal(await controls.locator('button').first().getAttribute('data-atlas-zoom'),'in','Plus must be above minus');
  assert.equal(await controls.locator('button').last().getAttribute('data-atlas-zoom'),'out','Minus must be below plus');
  const z=await page.evaluate(()=>placementMap.getZoom());
  await controls.locator('[data-atlas-zoom=in]').click();
  await page.waitForFunction(z=>placementMap.getZoom()>z,z,{timeout:10000});
  await controls.locator('[data-atlas-zoom=out]').click();
  await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-z)<.05,z,{timeout:10000});
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
  assert.equal(await page.locator('#shortlist .historyControls').count(),1,'Undo/redo should appear inside shortlist content');
  assert(await page.locator('#atlasShortlistExportDecisions').isVisible(),'Shortlist decision export shortcut missing');
  assert(await page.locator('#atlasShortlistBackup').isVisible(),'Shortlist backup shortcut missing');
  await page.waitForFunction(id=>!![...document.querySelectorAll('#shortlistList>.rank-row .placement')].find(el=>el.dataset.id===id),id,{timeout:12000});
  const x=page.locator('#shortlistList>.rank-row .atlasRemoveShortlist[data-atlas-remove-shortlist='+JSON.stringify(id)+']');
  assert(await x.count()>0,'Desktop red X missing');
  await x.first().click();
  await page.waitForFunction(count=>ranked().length===count,countBefore,{timeout:12000});
  await page.setViewportSize({width:390,height:844});
  const mobileNav=await page.locator('header.top').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,position:getComputedStyle(el).position}));
  assert(mobileNav.left>=-1&&mobileNav.right<=391&&mobileNav.position==='sticky','Mobile navigation overflows the viewport: '+JSON.stringify(mobileNav));
  assert.equal(await page.locator('#atlasHeaderTools #themeToggle').count(),1,'Theme action missing on mobile');
  assert(await page.locator('header.top .atlasLogoGlyph').isVisible(),'Mobile cross icon missing');
  await page.setViewportSize({width:1440,height:900});
  assert(!errors.some(x=>/ReferenceError|SyntaxError/.test(x)),'Browser exceptions: '+errors.join(';'));
  console.log('RELIABLE MAP SMOKE PASS',JSON.stringify({starting,provider:initial.provider,tiles:initial.tiles.length,filtered,shortlistRestored:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error('RELIABLE MAP SMOKE FAILED:',error.stack||error);process.exit(1);});