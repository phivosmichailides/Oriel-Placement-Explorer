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
  // A skipped quiz must not display fabricated personal-fit scores.
  await page.waitForFunction(()=>document.querySelector('#results .placement .score[data-fit-tone="unknown"]'),null,{timeout:15000});
  assert(await page.locator('#results .placement .score[data-fit-tone=unknown]').count()>0,
    'Unpersonalised applicants should see a neutral fit panel');
  assert(await page.locator('#results .placement .fitQuizLink').first().isVisible(),
    'Unpersonalised fit must link to the questionnaire');
  assert.equal(await page.evaluate(()=>window.OrielHasPersonalProfile?.()),false,
    'A default profile was incorrectly treated as a completed questionnaire');
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

  // Tinder swipes reveal a real upcoming programme, not an empty gradient.
  await page.locator('header.top nav.tabs [data-tab=tinderMode]').click();
  await page.waitForFunction(()=>document.getElementById('tinderActiveCard')&&
    document.querySelector('#tinderCardSlot > .tdNextCard'),null,{timeout:20000});
  const initialDeck=await page.evaluate(()=>{
    const top=document.querySelector('#tinderActiveCard');
    const below=document.querySelector('#tinderCardSlot > .tdNextCard');
    const title=card=>card?.querySelector('.tdProgrammeName')?.textContent.trim();
    return {top:title(top),next:title(below),hidden:below?.getAttribute('aria-hidden'),
      duplicateIds:document.querySelectorAll('#tinderActiveCard').length,
      underFilter:getComputedStyle(below).filter};
  });
  assert(initialDeck.top&&initialDeck.next&&initialDeck.top!==initialDeck.next,
    'Next programme was not pre-rendered: '+JSON.stringify(initialDeck));
  assert.equal(initialDeck.hidden,'true','Preview should not be an interactive screen-reader duplicate');
  assert.equal(initialDeck.duplicateIds,1,'Duplicate active-card IDs');
  assert.equal(initialDeck.underFilter,'none','Next card blurred before swiping');
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
  await page.waitForFunction(()=>!!document.querySelector('#tinderActiveCard.tdLeaving')&&
    !!document.querySelector('#tinderCardSlot.tdShowingNext > .tdNextCard'),null,{timeout:4000});
  const flight=await page.evaluate(()=>{
    const top=document.querySelector('#tinderActiveCard');
    const below=document.querySelector('#tinderCardSlot > .tdNextCard');
    const deck=document.querySelector('#tinderMode .tdCardDeck');
    return {next:below?.querySelector('.tdProgrammeName')?.textContent.trim(),
      width:below?.getBoundingClientRect().width,height:below?.getBoundingClientRect().height,
      opacity:getComputedStyle(below).opacity,filter:getComputedStyle(below).filter,
      topOpacity:getComputedStyle(top).opacity,feedback:deck?.classList.contains('tdFeedbackYes')||
        deck?.classList.contains('tdFeedbackNo')||deck?.classList.contains('tdFeedbackSuper')};
  });
  assert.equal(flight.next,initialDeck.next,'Underlying card changed mid-flight');
  assert(flight.width>200&&flight.height>300,'Underlying card was not fully rendered');
  assert.equal(flight.opacity,'1','Underlying card faded');
  assert.equal(flight.filter,'none','Underlying card blurred');
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
  const dragging=await page.evaluate(()=>({
    next:document.querySelector('#tinderCardSlot > .tdNextCard .tdProgrammeName')?.textContent.trim(),
    transform:document.querySelector('#tinderActiveCard')?.style.transform,
    filter:getComputedStyle(document.querySelector('#tinderCardSlot > .tdNextCard')).filter
  }));
  assert(dragging.next&&dragging.transform?.includes('translate3d(-'),
    'Following programme missing during pointer drag: '+JSON.stringify(dragging));
  assert.equal(dragging.filter,'none','Drag blurred upcoming card');
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
  const superFlight=await page.evaluate(()=>({
    transform:document.querySelector('#tinderActiveCard')?.style.transform,
    blue:getComputedStyle(document.querySelector('#tinderActiveCard')).boxShadow,
    underOpacity:getComputedStyle(document.querySelector('#tinderCardSlot>.tdNextCard')).opacity
  }));
  assert(/translate3d\(\s*0px\s*,\s*-\d+(?:\.\d+)?px\s*,/.test(superFlight.transform),'Super Like should send the card upward: '+superFlight.transform);
  assert.equal(superFlight.underOpacity,'1','Blue shine blurred the next programme');
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
  await page.locator('nav.tabs [data-tab=explore]').click();
  const mobileSubnav=await page.evaluate(()=>{
    const one=document.querySelector('#atlasExploreSubnav .atlasSubnavChoices');
    const compare=document.getElementById('atlasCompareOpen');
    const rect1=one?.getBoundingClientRect(),rect2=compare?.getBoundingClientRect();
    return {groupWidth:rect1?.width,compareWidth:rect2?.width,overlap:!!(rect1&&rect2&&
      rect1.left<rect2.right&&rect2.left<rect1.right&&rect1.top<rect2.bottom&&rect2.top<rect1.bottom)};
  });
  assert(mobileSubnav.groupWidth>200&&!mobileSubnav.overlap,
    'Mobile For You and Compare selected controls overlap: '+JSON.stringify(mobileSubnav));
  await page.setViewportSize({width:1440,height:900});

  // Simulate the real quiz after initially declining personalisation. The
  // last step must preview palette/mode instantly and require both choices.
  await page.evaluate(()=>window.openOrielPersonalisation());
  await page.locator('#obStart').click();
  for(let i=0;i<5;i++)await page.locator('#obNext').click();
  const saveLook=page.locator('#obFinish');
  assert.equal(await saveLook.isDisabled(),true,
    'Finish must wait for explicit palette and brightness choices');
  assert.equal(await page.locator('.onboardPaletteCard').count(),6,
    'Expected all six site appearance palettes on last quiz page');
  await page.locator('[data-ob-palette=mauve]').click();
  assert.equal(await saveLook.isDisabled(),true,'Brightness choice is still required');
  await page.locator('[data-ob-brightness=dark]').click();
  assert.equal(await saveLook.isEnabled(),true,'Finish should unlock after both appearance choices');
  const look=await page.evaluate(()=>({
    palette:document.documentElement.dataset.palette,
    brightness:document.documentElement.dataset.theme,
    overlayBackground:getComputedStyle(document.querySelector('.onboardCard')).backgroundColor
  }));
  assert.equal(look.palette,'mauve','Palette preview did not change entire app');
  assert.equal(look.brightness,'dark','Brightness preview did not change the whole app');
  await saveLook.click();
  await page.waitForFunction(()=>window.OrielHasPersonalProfile?.()===true&&
    state.prefs.onboarding?.appearancePalette==='mauve'&&
    state.prefs.onboarding?.appearanceMode==='dark',null,{timeout:15000});
  await page.waitForTimeout(520);
  if(await page.locator('.cloudMaybeLater').count())await page.locator('.cloudMaybeLater').click();
  await page.evaluate(()=>document.querySelector('header.top nav.tabs [data-tab=explore]')?.click());
  await page.waitForFunction(()=>!!document.querySelector('#results .placement .score:not([data-fit-tone="unknown"])'),
    null,{timeout:15000});
  assert.equal(await page.locator('#results .placement .fitQuizLink').count(),0,
    'Fit CTA should disappear when applicant has supplied personal preferences');
  assert(await page.locator('#results .placement .score[data-fit-tone=excellent],#results .placement .score[data-fit-tone=good],#results .placement .score[data-fit-tone=mixed],#results .placement .score[data-fit-tone=poor]').count()>0,
    'Completed quiz did not unlock calibrated fit colouring');

  // Separate narrow initial page load: filter sidebar starts hidden, so the
  // map is first on screen even when browser storage has no collapse choice.
  const mobileFirstPage=await browser.newPage({viewport:{width:390,height:844}});
  await mobileFirstPage.addInitScript(()=>localStorage.setItem('phivos-onboarding-v1','1'));
  await mobileFirstPage.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await mobileFirstPage.waitForFunction(()=>document.getElementById('explore')?.classList.contains('uxFiltersCollapsed'),
    null,{timeout:25000});
  assert.equal(await mobileFirstPage.locator('#uxFilterSidebar').isVisible(),false,
    'Mobile first visit should not present the long filters before the map');
  assert(await mobileFirstPage.locator('#placementMap').isVisible(),'Map not visible when mobile filters are collapsed');
  await mobileFirstPage.close();
  assert(!errors.some(x=>/ReferenceError|SyntaxError/.test(x)),'Browser exceptions: '+errors.join(';'));
  console.log('RELIABLE MAP SMOKE PASS',JSON.stringify({starting,provider:initial.provider,tiles:initial.tiles.length,filtered,shortlistRestored:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error('RELIABLE MAP SMOKE FAILED:',error.stack||error);process.exit(1);});