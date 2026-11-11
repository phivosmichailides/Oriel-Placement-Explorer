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
  assert(starting.name.startsWith('Placement Atlas'),'Unexpected page title: '+starting.name);
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
  const visibleNav=await page.evaluate(()=>[...document.querySelectorAll('header.top nav.tabs > .tab')]
    .filter(el=>getComputedStyle(el).display!=='none').map(el=>el.dataset.tab));
  assert.deepEqual(visibleNav,['explore','shortlist','outcome'],'Primary navigation should contain only the main decision paths');
  assert(await page.locator('header.top nav.tabs > .atlasMoreNav > summary').isVisible(),'Secondary navigation disclosure is missing');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('header.top nav.tabs .atlasMoreMenu .tab')].map(el=>el.dataset.tab)),
    ['simulator','tinderMode','prefs'],'Advanced tools should remain available under More');
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

  // Secondary tools remain available in the compact More menu.
  await page.locator('header.top nav.tabs > .atlasMoreNav > summary').click();
  // Tinder preloads the next programme, but only one card is ever visible.
  await page.locator('header.top nav.tabs .atlasMoreMenu [data-tab=tinderMode]').click();
  await page.waitForFunction(()=>document.getElementById('tinderActiveCard')&&
    document.querySelector('#tinderCardSlot > .tdNextCard'),null,{timeout:20000});
  const initialDeck=await page.evaluate(()=>{
    const top=document.querySelector('#tinderActiveCard');
    const below=document.querySelector('#tinderCardSlot > .tdNextCard');
    const title=card=>card?.querySelector('.tdProgrammeName')?.textContent.trim();
    const nextRect=below?.getBoundingClientRect();
    return {top:title(top),next:title(below),hidden:below?.getAttribute('aria-hidden'),
      duplicateIds:document.querySelectorAll('#tinderActiveCard').length,
      nextDisplay:getComputedStyle(below).display,nextWidth:nextRect?.width,nextHeight:nextRect?.height,
      underFilter:getComputedStyle(below).filter};
  });
  assert(initialDeck.top&&initialDeck.next&&initialDeck.top!==initialDeck.next,
    'Next programme was not pre-rendered: '+JSON.stringify(initialDeck));
  assert.equal(initialDeck.hidden,'true','Preview should not be an interactive screen-reader duplicate');
  assert.equal(initialDeck.duplicateIds,1,'Duplicate active-card IDs');
  assert.equal(initialDeck.underFilter,'none','Preloaded next card should not be blurred');
  assert.equal(initialDeck.nextDisplay,'none','Preloaded next card must remain completely concealed');
  assert.equal(initialDeck.nextWidth,0,'Hidden next card must not paint beyond the active card');
  assert.equal(initialDeck.nextHeight,0,'Hidden next card must not extend into the action area');
  const initialActionLayout=await page.evaluate(()=>{
    const rect=el=>{const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};
    return {
      card:rect(document.querySelector('#tinderActiveCard')),
      actions:rect(document.querySelector('#tinderMode .tdActions')),
      legend:rect(document.querySelector('#tinderMode .tdActionLegend')),
      existing:rect(document.querySelector('#tinderExisting')),
      notice:rect(document.querySelector('#tinderNotice')),
      buttons:[...document.querySelectorAll('#tinderMode .tdActions button')].map(rect),
      actionLayer:getComputedStyle(document.querySelector('#tinderMode .tdActions')).zIndex,
      legendLayer:getComputedStyle(document.querySelector('#tinderMode .tdActionLegend')).zIndex
    };
  });
  assert(initialActionLayout.card&&initialActionLayout.actions&&initialActionLayout.legend&&initialActionLayout.existing,
    'Card/action layout elements are missing: '+JSON.stringify(initialActionLayout));
  assert(initialActionLayout.actions.top>=initialActionLayout.card.bottom-1,
    'Action buttons overlap the active card: '+JSON.stringify(initialActionLayout));
  assert(initialActionLayout.legend.top>=initialActionLayout.actions.bottom-1,
    'Action labels overlap the buttons: '+JSON.stringify(initialActionLayout));
  assert(initialActionLayout.existing.top>=initialActionLayout.legend.bottom-1,
    'Current-decision text overlaps the action labels: '+JSON.stringify(initialActionLayout));
  assert(initialActionLayout.notice.top>=initialActionLayout.existing.bottom-1,
    'Keyboard guidance overlaps the current-decision text: '+JSON.stringify(initialActionLayout));
  assert.equal(initialActionLayout.buttons.length,4,'All four Tinder action buttons must be present');
  assert(initialActionLayout.buttons.every(r=>r&&r.width>0&&r.height>0),
    'One or more Tinder action buttons are hidden: '+JSON.stringify(initialActionLayout));
  assert.equal(initialActionLayout.actionLayer,'1','Action buttons must have their own layer above the card deck');
  assert.equal(initialActionLayout.legendLayer,'1','Action labels must have their own layer above the card deck');
  assert.equal(await page.locator('#tinderFilterPanel').isVisible(),false,'Tinder filter controls should begin closed');
  await page.locator('#tinderFilterToggle').click();
  assert(await page.locator('#tinderFilterPanel').isVisible(),'Tinder filter popover did not open');
  assert.equal(await page.locator('#tinderFilterToggle').getAttribute('aria-expanded'),'true');
  await page.locator('#tdMinSalary').selectOption('36000');
  assert((await page.locator('#tinderProgress').textContent()).includes('0 /'),'Tinder round did not update filtered count');
  await page.locator('#tdFiltersReset').click();
  await page.locator('#tinderFilterToggle').click();
  assert.equal(await page.locator('#tinderFilterPanel').isVisible(),false,'Tinder filters failed to close');
  assert(await page.locator('#tinderSwipeHints').isVisible(),'New visitors should see swipe instructions');
  assert(await page.locator('#tinderSwipeHints').evaluate(el=>el.textContent.includes('Swipe left to exclude')&&el.textContent.includes('Swipe right to shortlist')),'Hints must describe both directions');
  assert(await page.locator('#tdOpenLiked').isVisible(),'Tinder-only shortlist launcher is missing');
  assert(await page.locator('#tdOpenRejected').isVisible(),'Tinder-only rejected launcher is missing');
  assert.equal(await page.locator('#uxDrawerLauncher').isVisible(),false,'Ordinary shortlist launcher must be hidden only inside Tinder');
  await page.locator('#tinderYes').click();
  await page.waitForFunction(()=>!!document.querySelector('#tinderActiveCard.tdLeaving'),null,{timeout:4000});
  const flight=await page.evaluate(()=>{
    const top=document.querySelector('#tinderActiveCard');
    const below=document.querySelector('#tinderCardSlot > .tdNextCard');
    const deck=document.querySelector('#tinderMode .tdCardDeck');
    const nextRect=below?.getBoundingClientRect();
    return {next:below?.querySelector('.tdProgrammeName')?.textContent.trim(),
      display:getComputedStyle(below).display,width:nextRect?.width,height:nextRect?.height,
      filter:getComputedStyle(below).filter,topOpacity:getComputedStyle(top).opacity,
      feedback:deck?.classList.contains('tdFeedbackYes')||
        deck?.classList.contains('tdFeedbackNo')||deck?.classList.contains('tdFeedbackSuper')};
  });
  assert.equal(flight.next,initialDeck.next,'Preloaded next programme changed mid-flight');
  assert.equal(flight.display,'none','Next programme became visible during the outgoing animation');
  assert.equal(flight.width,0,'Hidden next programme painted over the action area');
  assert.equal(flight.height,0,'Hidden next programme extended below the active card');
  assert.equal(flight.filter,'none','Preloaded next programme should not be blurred');
  assert.equal(flight.topOpacity,'1','Departing card became transparent');
  assert.equal(flight.feedback,false,'Blurred feedback overlay still active');
  assert(await page.locator('#tinderActiveCard .tdExitTwinkles-Yes i').count()>=6,
    'Green card-attached exit stars should be visible during Like');
  assert(await page.locator('#tinderMode .tdCardDeck.tdShineYes .tdDirectionalParticles .tdSparkle').count()>0,
    'Instant green Like sparkles did not appear');
  assert.equal(await page.locator('#tinderSwipeHints').isVisible(),false,'First successful swipe should dismiss the hints');
  await page.waitForFunction(expected=>document.querySelector('#tinderActiveCard .tdProgrammeName')?.textContent.trim()===expected,
    initialDeck.next,{timeout:10000});
  assert(await page.locator('#tinderCardSlot > .tdNextCard').count()>0,'New programme is not preloaded');
  // Only on Tinder Mode: shortlist and rejection drawers share canonical marks.
  await page.locator('#tdOpenLiked').click();
  await page.waitForFunction(()=>document.querySelector('#tdDecisionDrawer')?.getAttribute('aria-hidden')==='false',null,{timeout:5000});
  assert(await page.locator('#tdDrawerItems .tdDrawerItem').count()>=1,'Liked programme absent in Tinder shortlist drawer');
  await page.locator('#tdDrawerItems .tdDrawerSummary').first().click();
  await page.locator('#tdDrawerItems .tdDrawerCard .tdFitScore').first().waitFor({state:'visible',timeout:5000});
  assert(await page.locator('#tdDrawerItems .tdDrawerCard .tdFitScore').first().isVisible(),
    'Tapping the title should open the real programme detail card with personalised fit');
  assert(await page.locator('#tdDrawerItems .tdDrawerCard .tdMetrics').first().isVisible(),
    'Expanded programme details should include salary and hours');
  await page.locator('#tdDrawerItems .tdDrawerMove').first().click();
  await page.waitForFunction(()=>document.querySelector('#tdShortlistedCount')?.textContent==='(0)'&&
    document.querySelector('#tdRejectedCount')?.textContent==='(1)',null,{timeout:5000});
  await page.locator('#tdDrawerClose').click();
  await page.locator('#tdOpenRejected').click();
  assert(await page.locator('#tdDrawerItems .tdDrawerItem').count()>=1,'Rejected programme missing from the Like No drawer');
  await page.locator('#tdDrawerItems .tdDrawerSummary').first().click();
  await page.locator('#tdDrawerItems .tdDrawerCard .tdFitScore').first().waitFor({state:'visible',timeout:5000});
  assert(await page.locator('#tdDrawerItems .tdDrawerCard .tdFitScore').first().isVisible(),
    'Rejected programme details must show the personalised fit score');
  await page.locator('#tdDrawerItems .tdDrawerMove').first().click();
  await page.waitForFunction(()=>document.querySelector('#tdShortlistedCount')?.textContent==='(1)'&&
    document.querySelector('#tdRejectedCount')?.textContent==='(0)',null,{timeout:5000});
  await page.locator('#tdDrawerClose').click();
  // At this point the tall card may lie below the browser viewport after
  // navigation. Hovering its title scrolls to a confirmed on-card start point
  // before issuing raw mouse events (local viewport heights may differ).
  const dragTarget=page.locator('#tinderActiveCard .tdProgrammeName');
  await dragTarget.hover();
  const dragBox=await dragTarget.boundingBox();
  assert(dragBox,'Programme title not visible for pointer drag');
  const dragX=dragBox.x+dragBox.width*.5,dragY=dragBox.y+dragBox.height*.5;
  const hitCard=await page.evaluate(({x,y})=>
    document.elementFromPoint(x,y)?.closest('#tinderActiveCard')?.id||'',{x:dragX,y:dragY});
  assert.equal(hitCard,'tinderActiveCard','Simulated drag start is not on the active card');
  await page.mouse.down();
  await page.mouse.move(dragX-60,dragY+4,{steps:5});
  const dragging=await page.evaluate(()=>{
    const next=document.querySelector('#tinderCardSlot > .tdNextCard');
    return {next:next?.querySelector('.tdProgrammeName')?.textContent.trim(),
      display:getComputedStyle(next).display,
      transform:document.querySelector('#tinderActiveCard')?.style.transform,
      filter:getComputedStyle(next).filter};
  });
  assert(dragging.next&&dragging.transform?.includes('translate3d(-'),
    'Preloaded next programme missing during pointer drag: '+JSON.stringify(dragging));
  assert.equal(dragging.display,'none','Next programme became visible during pointer drag');
  assert.equal(dragging.filter,'none','Preloaded next programme should not be blurred');
  assert(await page.locator('#tinderActiveCard.tdDragNo').count()===1,
    'Red directional shine should activate during a left drag');
  await page.mouse.move(dragX-125,dragY+5,{steps:5});
  await page.mouse.up();
  await page.waitForFunction(expected=>document.querySelector('#tinderActiveCard .tdProgrammeName')?.textContent.trim()===expected,
    dragging.next,{timeout:10000});
  // Test the special upward Super Like gesture and blue shine.
  await page.locator('#tinderSuper').click();
  await page.waitForFunction(()=>document.querySelector('#tinderActiveCard.tdLeavingSuper')&&
    document.querySelector('#tinderMode .tdCardDeck.tdShineSuper'),null,{timeout:4000});
  await page.waitForFunction(()=>
    /translate3d\(\s*0px\s*,\s*-\d+(?:\.\d+)?px\s*,/.test(document.querySelector('#tinderActiveCard')?.style.transform||''),
    null,{timeout:3000});
  const superFlight=await page.evaluate(()=>{
    const next=document.querySelector('#tinderCardSlot>.tdNextCard');
    return {transform:document.querySelector('#tinderActiveCard')?.style.transform,
      blue:getComputedStyle(document.querySelector('#tinderActiveCard')).boxShadow,
      nextDisplay:getComputedStyle(next).display};
  });
  assert(/translate3d\(\s*0px\s*,\s*-\d+(?:\.\d+)?px\s*,/.test(superFlight.transform),'Super Like should send the card upward: '+superFlight.transform);
  assert.equal(superFlight.nextDisplay,'none','Super Like exposed the preloaded next programme');
  assert(await page.locator('#tinderActiveCard .tdExitTwinkles-Super i').count()>=6,
    'Blue card-attached exit stars should appear on Super Like');
  await page.waitForFunction(()=>!document.querySelector('#tinderActiveCard.tdLeavingSuper'),null,{timeout:10000});
  await page.locator('nav.tabs [data-tab=explore]').click();
  assert(await page.locator('#uxDrawerLauncher').isVisible(),
    'Ordinary shortlist launcher must remain available outside Tinder');
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
  if(await page.locator('html.atlasPremiumPreview').count()){
    // The imported sample must be backed by real existing controls rather
    // than an independent mock state. All five detail categories are reusable.
    await page.waitForFunction(()=>document.querySelector('#results .placement.atlasSampleCard')?.dataset.atlasDetailTabs==='1',null,{timeout:15000});
    const previewCard=page.locator('#results .placement.atlasSampleCard').first();
    assert.equal(await previewCard.locator('[role=tab]').count(),5,'Five progressive-disclosure tabs missing');
    assert.equal(await previewCard.locator('.atlasCardSections').isVisible(),false,'Compact card should begin collapsed');
    await previewCard.locator('[data-ux-expand]').click();
    assert(await previewCard.locator('.atlasCardSections').isVisible(),'Detailed card did not expand');
    await previewCard.locator('[data-atlas-card-tab=training]').click();
    assert(await previewCard.locator('[data-atlas-card-page=training]').isVisible(),'Training panel did not show');
    await previewCard.locator('[data-atlas-card-tab=pay]').click();
    assert(await previewCard.locator('.atlasPayEstimateValue').isVisible(),'Real pay estimate missing from Pay tab');
    await previewCard.locator('[data-atlas-card-tab=locations]').click();
    assert(await previewCard.locator('.uxMiniMap').isVisible(),'Existing mini-map missing from Locations tab');
    await previewCard.locator('[data-atlas-card-tab=assessment]').click();
    assert(await previewCard.locator('[data-action=note]').isVisible(),'Existing notes editor missing from My assessment');
    await previewCard.locator('[data-atlas-card-tab=overview]').click();
    assert(await previewCard.locator('.fit').isVisible(),'Existing personalised assessment missing from Overview');
    await previewCard.locator('[data-ux-expand]').click();
    assert.equal(await previewCard.locator('.atlasCardSections').isVisible(),false,'Card could not collapse');
    assert(await previewCard.locator('[data-action=prefer]').isVisible(),'Shortlist action missing after collapse');
    assert(await previewCard.locator('[data-action=compare]').isVisible(),'Compare action missing after collapse');
  }

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
  const shortlistMore=page.locator('#shortlist .atlasShortlistMore');
  assert(await shortlistMore.locator('summary').isVisible(),'Secondary shortlist actions need a More disclosure');
  assert.equal(await page.locator('#atlasShortlistExportDecisions').isVisible(),false,'Decision export should be tucked away until requested');
  await shortlistMore.locator('summary').click();
  assert(await page.locator('#atlasShortlistExportDecisions').isVisible(),'Shortlist decision export shortcut missing from More');
  assert(await page.locator('#atlasShortlistBackup').isVisible(),'Shortlist backup shortcut missing from More');
  assert(await page.locator('#shortlistViewOrder').isVisible(),'Display order should remain available inside More');
  await shortlistMore.locator('summary').click();
  await page.waitForFunction(id=>!![...document.querySelectorAll('#shortlistList>.rank-row .placement')].find(el=>el.dataset.id===id),id,{timeout:12000});
  const x=page.locator('#shortlistList>.rank-row .atlasRemoveShortlist[data-atlas-remove-shortlist='+JSON.stringify(id)+']');
  assert(await x.count()>0,'Shortlist remove action missing');
  const row=x.first().locator('xpath=..');
  await row.hover();
  await page.waitForFunction(id=>{const el=document.querySelector('#shortlistList>.rank-row .atlasRemoveShortlist[data-atlas-remove-shortlist='+JSON.stringify(id)+']');return el&&getComputedStyle(el).opacity==='1';},id,{timeout:2000});
  assert.equal(await x.first().evaluate(el=>getComputedStyle(el).opacity),'1',
    'Remove action should appear only when its card is hovered');
  await x.first().click();
  await page.waitForFunction(count=>ranked().length===count,countBefore,{timeout:12000});
  await page.setViewportSize({width:390,height:844});
  const mobileNav=await page.locator('header.top').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,position:getComputedStyle(el).position}));
  assert(mobileNav.left>=-1&&mobileNav.right<=391&&mobileNav.position==='sticky','Mobile navigation overflows the viewport: '+JSON.stringify(mobileNav));
  assert.equal(await page.locator('#atlasHeaderTools #themeToggle').count(),1,'Theme action missing on mobile');
  assert(await page.locator('header.top .atlasLogoGlyph').isVisible(),'Mobile cross icon missing');
  // At phone width, For You and Compare may never collide or overflow.
  await page.locator('nav.tabs [data-tab=explore]').click();
  await page.waitForFunction(()=>document.getElementById('explore')?.classList.contains('uxFiltersCollapsed'),
    null,{timeout:5000});
  assert.equal(await page.locator('#explore.uxFiltersCollapsed').count(),1,
    'Mobile Explore filters should start folded instead of covering the map');
  const mobileSubnav=await page.evaluate(()=>{
    const choices=document.querySelector('#atlasExploreSubnav .atlasSubnavChoices');
    const compare=document.querySelector('#atlasCompareOpen');
    const a=choices?.getBoundingClientRect(),b=compare?.getBoundingClientRect();
    return {choicesBottom:a?.bottom,compareTop:b?.top,compareRight:b?.right,
      viewport:window.innerWidth};
  });
  assert(mobileSubnav.compareTop>=mobileSubnav.choicesBottom-2,
    'Compare selected overlaps mobile Explore tabs: '+JSON.stringify(mobileSubnav));
  assert(mobileSubnav.compareRight<=mobileSubnav.viewport+1,
    'Compare selected extends outside mobile viewport');
  await page.setViewportSize({width:1440,height:900});

  // Earlier map tests intentionally preload a completed quiz profile. Remove
  // it for this separate, genuinely unpersonalised-user scenario.
  await page.evaluate(()=>{
    delete state.prefs.onboarding;
    localStorage.removeItem('phivos-onboarding-v1');
    localStorage.removeItem('phivos-onboarding-profile-v1');
    save();
    renderAll();
  });
  // A visitor who has not completed a quiz must never see a claimed fit score.
  await page.waitForFunction(()=>document.querySelector('#results .score[data-fit-tone=unpersonalised]'),null,{timeout:12000}).catch(async error=>{
    const diagnostic=await page.evaluate(()=>({
      onboarding:typeof state==='undefined'?'undefined':state.prefs?.onboarding,
      active:document.querySelector('.panel.active')?.id,
      resultsCount:document.querySelectorAll('#results .placement').length,
      scores:[...document.querySelectorAll('#results .score')].slice(0,4).map(el=>({tone:el.dataset.fitTone,text:el.textContent.slice(0,90)})),
      scripts:[...document.scripts].filter(el=>el.src.includes('app-product')).map(el=>el.src),
      state:document.body.dataset.atlasView
    }));
    throw new Error('Unpersonalised fit missing: '+JSON.stringify(diagnostic)+'; '+error.message);
  });
  assert(await page.locator('#results .atlasFitQuizLink').first().isVisible(),
    'Neutral Personal Fit lacks its accessible quiz CTA');
  await page.locator('#results .atlasFitQuizLink').first().click();
  await page.locator('.onboardOverlay #obStart').waitFor({state:'visible',timeout:12000});
  await page.locator('#obStart').click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('1 / 6'));
  const firstQuizPage=await page.evaluate(()=>{
    const card=document.querySelector('.onboardCard');
    return {selected:card.querySelectorAll('.onboardChoice[aria-pressed="true"]').length,
      scrollHeight:card.scrollHeight,clientHeight:card.clientHeight};
  });
  assert.equal(firstQuizPage.selected,0,'A fresh quiz must not preselect a region');
  assert(firstQuizPage.scrollHeight<=firstQuizPage.clientHeight,
    'Desktop region step should fit without scrolling: '+JSON.stringify(firstQuizPage));
  await page.setViewportSize({width:390,height:844});
  const mobileQuizPage=await page.evaluate(()=>{
    const card=document.querySelector('.onboardCard');
    return {scrollHeight:card.scrollHeight,clientHeight:card.clientHeight};
  });
  assert(mobileQuizPage.scrollHeight<=mobileQuizPage.clientHeight,
    'Mobile region step should fit without scrolling: '+JSON.stringify(mobileQuizPage));
  await page.setViewportSize({width:1440,height:900});
  await page.locator('.onboardChoice').filter({hasText:'All regions'}).click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('2 / 6'));
  assert.equal(await page.locator('#obNext').count(),0,'Single-choice location should advance immediately');
  assert.equal(await page.locator('.onboardChoice[aria-pressed="true"]').count(),0,
    'Setting choice should start unselected');
  await page.locator('.onboardChoice').filter({hasText:'Not sure yet'}).click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('3 / 6'));
  assert.equal(await page.locator('.onboardChoice[aria-pressed="true"]').count(),0,
    'Priorities should start unselected');
  assert.equal(await page.locator('#obNext').isEnabled(),false,
    'Priorities should require at least one choice');
  await page.locator('.onboardChoice').filter({hasText:'Pay'}).click();
  await page.locator('.onboardChoice').filter({hasText:'Work-life balance'}).click();
  await page.locator('.onboardChoice').filter({hasText:'Career progression'}).click();
  assert(await page.locator('#obNext').isEnabled(),'One to three priorities should enable Continue');
  await page.locator('.onboardChoice').filter({hasText:'Location'}).click();
  assert.equal(await page.locator('.onboardChoice[aria-pressed="true"]').count(),3,
    'The priorities step must cap selections at three');
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('4 / 6'));
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('5 / 6'));
  assert.equal(await page.locator('#obNext').count(),0,'Single-choice community step should advance immediately');
  await page.locator('.onboardChoice').filter({hasText:'Some is fine'}).click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.textContent.includes('6 / 6'));
  assert(await page.locator('[data-ob-palette]').count()===6,
    'Appearance screen should present six real palettes');
  assert.equal(await page.locator('[data-ob-mode]').count(),2,
    'Appearance step should have light and dark controls');
  assert.equal(await page.locator('[data-ob-palette][aria-pressed="true"]').count(),1,
    'Appearance palette should be preselected');
  assert.equal(await page.locator('[data-ob-mode][aria-pressed="true"]').count(),1,
    'Appearance brightness should be preselected');
  await page.locator('[data-ob-palette=mauve]').click();
  assert.equal(await page.locator('html').getAttribute('data-palette'),'mauve',
    'Quiz palette should immediately recolour the app');
  await page.locator('[data-ob-mode=dark]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark',
    'Quiz mode should immediately preview dark mode');
  await page.locator('#obFinish').click();
  await page.waitForFunction(()=>!document.querySelector('.onboardOverlay')&&
    !!state.prefs?.onboarding,null,{timeout:12000});
  const savedAppearance=await page.evaluate(()=>({
    palette:localStorage.getItem('oriel-desk-palette-v1'),
    mode:localStorage.getItem('oriel-desk-theme-v1'),
    hasProfile:!!state.prefs.onboarding
  }));
  assert.deepEqual(savedAppearance,{palette:'mauve',mode:'dark',hasProfile:true},
    'Saved quiz appearance did not persist');
  if(await page.locator('.onboardSyncOverlay').count()){
    assert(await page.locator('.onboardSyncOverlay [data-ob-later]').isVisible(),
      'Optional cross-device sign-in prompt must offer Maybe later');
    await page.locator('.onboardSyncOverlay [data-ob-later]').click();
  }
  assert(!errors.some(x=>/ReferenceError|SyntaxError/.test(x)),'Browser exceptions: '+errors.join(';'));
  console.log('RELIABLE MAP SMOKE PASS',JSON.stringify({starting,provider:initial.provider,tiles:initial.tiles.length,filtered,shortlistRestored:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error('RELIABLE MAP SMOKE FAILED:',error.stack||error);process.exit(1);});