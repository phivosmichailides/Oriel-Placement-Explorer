'use strict';
/* Anonymous-browser regression for the current Placement Atlas experience.
   Runs against the checked-out site locally and the deployed public site. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TARGET||'https://placementatlas.co.uk/';
const output='/tmp/oriel-map-theme-smoke';
fs.mkdirSync(output,{recursive:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{
   localStorage.clear();
   localStorage.setItem('phivos-onboarding-v1','1');
  });
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof placements!=='undefined'&&placements.length===4064&&
    !!document.getElementById('results')&&!!document.querySelector('#uxExplorePager select'),null,{timeout:90000});

  // First visit is monochrome and the default results page is a manageable 100.
  assert.equal(await page.locator('html').getAttribute('data-palette'),'mono','New visitors should start in the monochrome palette');
  const pageSize=page.locator('#uxExplorePager select');
  assert.equal(await pageSize.inputValue(),'100','Default programme page size should be 100');
  assert.deepEqual(await pageSize.locator('option').evaluateAll(options=>options.map(option=>option.value)),['100','200','500','all']);
  await page.waitForFunction(()=>document.querySelectorAll('#results .placement').length===100,null,{timeout:45000});
  await pageSize.selectOption('200');
  await page.waitForFunction(()=>document.querySelectorAll('#results .placement').length===200,null,{timeout:45000});
  await page.locator('#uxExplorePager select').selectOption('100');
  await page.waitForFunction(()=>document.querySelectorAll('#results .placement').length===100,null,{timeout:45000});

  const saveNote=page.locator('#uxFilterSidebar .footerbar .smallnote');
  assert.equal(await saveNote.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap','Saved locally note should stay on one line');
  const firstTitle=page.locator('#results .placement .placementTop h3').first();
  const titleMetrics=await firstTitle.evaluate(el=>({letterSpacing:getComputedStyle(el).letterSpacing,text:el.innerText}));
  assert(parseFloat(titleMetrics.letterSpacing)>=-.5,'Programme title tracking is still too compressed: '+JSON.stringify(titleMetrics));

  // Dynamic navigation must have one readable label, not icon-span duplicates.
  for(const [id,label] of [['simulator','Oriel Simulation'],['tinderMode','Swipe Mode']]){
   const button=page.locator('header.top nav.tabs [data-tab="'+id+'"]');
   assert.equal(await button.getAttribute('aria-label'),label,'Wrong accessible label for '+id);
   assert.equal((await button.locator('.atlasTabLabel').innerText()).trim(),label,'Duplicated or overlapping navigation text for '+id);
  }
  assert.equal(await page.locator('header.top nav.tabs [data-tab=learn]').count(),1,'Learn navigation tab is missing');
  assert.equal(await page.locator('.atlasFooterMark').count(),1,'Footer compass-pin logo is missing');
  const footerLogo=await page.locator('.atlasFooterMark').getAttribute('src');
  const headerLogo=await page.locator('.brand .logo img').getAttribute('src');
  assert(footerLogo.includes('placement-atlas-compass-pin.webp'));
  assert(headerLogo.includes('placement-atlas-compass-pin.webp'),'Header and footer must use the same compass-pin mark');
  const strayMiniMapCloses=await page.locator('#results .placement').evaluateAll(cards=>cards.reduce((total,card)=>total+[...card.querySelectorAll('button')].filter(button=>{
   const text=button.textContent.trim(),label=((button.getAttribute('aria-label')||'')+' '+(button.className||'')).toLowerCase();
   return ['×','x','✕','✖'].includes(text)||/map[-_ ]close|close[-_ ]map|popup-close-button/.test(label);
  }).length,0));
  assert.equal(strayMiniMapCloses,0,'Stray close buttons should not float over programme mini-maps');

  // The live map must render, retain its credits and use a compact attribution treatment.
  await page.waitForFunction(()=>{
   const map=document.getElementById('placementMap');
   return map&&(map.dataset.basemap||map.querySelector('canvas')||map.querySelector('.leaflet-tile-loaded'));
  },null,{timeout:60000});
  await page.waitForFunction(()=>!!document.querySelector('#placementMap .leaflet-control-attribution, #placementMap .maplibregl-ctrl-attrib'),null,{timeout:30000});
  const mapInfo=await page.evaluate(()=>{
   const host=document.getElementById('placementMap'),credit=host.querySelector('.leaflet-control-attribution, .maplibregl-ctrl-attrib');
   const layer=typeof placementMap!=='undefined'&&placementMap?placementMap._orielBasemapRecord?.layer:null;
   return {provider:host.dataset.basemap||'',tileCount:host.querySelectorAll('.leaflet-tile-loaded').length,
    canvasCount:host.querySelectorAll('canvas').length,credit:credit?.innerText||'',creditHtml:credit?.innerHTML||'',
    creditFont:credit?getComputedStyle(credit).fontSize:null,
    tileFilter:getComputedStyle(host.querySelector('.leaflet-tile-pane')||host).filter,
    keepBuffer:layer?.options?.keepBuffer,updateWhenZooming:layer?.options?.updateWhenZooming};
  });
  assert(mapInfo.provider||mapInfo.canvasCount||mapInfo.tileCount,'Map renderer did not initialise');
  assert(mapInfo.credit.includes('OpenStreetMap')||mapInfo.creditHtml.includes('openstreetmap.org'),'OpenStreetMap attribution is missing');
  assert(parseFloat(mapInfo.creditFont)<=9,'Map attribution is still visually oversized: '+mapInfo.creditFont);
  if(mapInfo.provider==='raster-fallback')assert(mapInfo.tileFilter!=='none','The actual raster fallback is not receiving the muted editorial colour treatment');
  if(mapInfo.keepBuffer!==undefined)assert(mapInfo.keepBuffer>=6&&mapInfo.updateWhenZooming===false,
    'Main raster fallback should retain tiles during zoom: '+JSON.stringify(mapInfo));
  await page.locator('#placementMap').screenshot({path:output+'/placement-atlas-map.png'});
  await page.screenshot({path:output+'/placement-atlas-desktop.png',fullPage:true});
  if(typeof placementMap!=='undefined'){
   const before=await page.evaluate(()=>placementMap.getZoom());
   await page.evaluate(()=>placementMap.setZoom(placementMap.getZoom()+1));
   await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-z-1)<.1,before,{timeout:12000});
   await wait(350);
   assert(await page.locator('#placementMap').evaluate(el=>el.getBoundingClientRect().width>200&&el.getBoundingClientRect().height>200),
    'Map became blank after zooming');
  }

  // Profile benefits are concrete and the learning library is a separate destination.
  await page.locator('header.top nav.tabs [data-tab=outcome]').click();
  await page.waitForFunction(()=>document.getElementById('outcome')?.classList.contains('active'),null,{timeout:12000});
  assert.equal(await page.locator('#paJoinBanner').count(),1,'Existing Profile account banner should remain intact');
  assert((await page.locator('#paJoinBanner').innerText()).includes('Join the pharmacy community'));
  assert.equal((await page.locator('.atlasStickyHeader .brand h1').innerText()).trim(),'Placement Atlas');
  assert((await page.locator('.atlasStickyHeader .brand h1').innerText()).trim()==='Placement Atlas','Header must identify the site clearly');
  const navLabels=await page.locator('header.top nav.tabs > .tab .atlasTabLabel').allInnerTexts();
  assert.equal(navLabels.filter(x=>x==='Oriel Simulation').length,1,'Oriel Simulation should appear once');
  assert.equal(navLabels.filter(x=>x==='Swipe Mode').length,1,'Swipe Mode should appear once');
  assert.equal(navLabels.filter(x=>x==='Tinder Mode').length,0,'Legacy Tinder Mode label must not remain');
  assert.equal(navLabels.at(-1),'Preferences','Preferences must remain the final navigation item');
  await page.setViewportSize({width:1090,height:960});
  const headerMetrics=await page.locator('.atlasStickyHeader').evaluate(el=>{
   const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
   const brand=el.querySelector('.brand'),utility=el.querySelector('.atlasHeaderUtilities'),nav=el.querySelector('nav.tabs');
   return {brand:box(brand),utility:box(utility),nav:box(nav),navScrollWidth:nav.scrollWidth,navClientWidth:nav.clientWidth};
  });
  assert(headerMetrics.brand.right<=headerMetrics.utility.left+2,'Brand and utility controls overlap: '+JSON.stringify(headerMetrics));
  assert(headerMetrics.utility.right<=headerMetrics.nav.left+2,'Utility controls and navigation overlap: '+JSON.stringify(headerMetrics));
  assert(headerMetrics.navScrollWidth<=headerMetrics.navClientWidth+2,'Navigation labels do not fit the 1090px desktop banner: '+JSON.stringify(headerMetrics));
  await page.setViewportSize({width:1440,height:960});
  await page.locator('header.top nav.tabs [data-tab=learn]').click();
  await page.waitForFunction(()=>document.getElementById('learn')?.classList.contains('active'),null,{timeout:12000});
  assert(await page.locator('#atlasLearnSettings').isVisible(),'Learning library settings guide did not open');
  const southWest=page.locator('#atlasLearnRegion option').filter({hasText:'South West'});
  assert.equal(await southWest.count(),1,'Region names should use consistent title case');
  await page.locator('#atlasLearnRegion').selectOption({label:'South West'});
  assert(await page.locator('#atlasLearnRegionLinks a').count()>=3,'Region research links are missing');
  await page.locator('#atlasLearnProgrammeSearch').fill('Royal Free');
  await page.waitForFunction(()=>document.querySelectorAll('.atlasLearnProgrammeResult').length>0,null,{timeout:20000});
  await page.locator('.atlasLearnProgrammeResult').first().click();
  assert(await page.locator('#atlasLearnSelectedProgramme').isVisible(),'Programme public-research panel did not open');
  assert(await page.locator('#atlasLearnSelectedProgramme a').filter({hasText:'Reddit'}).count()===1,'Reddit research link is missing');

  // Oriel Simulation explains the difference between the three decision columns.
  await page.locator('header.top nav.tabs [data-tab=simulator]').click();
  await page.waitForFunction(()=>document.getElementById('simulator')?.classList.contains('active'),null,{timeout:12000});
  assert.equal(await page.locator('#simulator .simColHelp').count(),3,'Simulation column explanations are missing');
  assert((await page.locator('#simulator').innerText()).includes('You could accept a programme'));

  // Swipe Mode: fresh visitors start across all regions with no filters; chosen filters remain visible.
  await page.locator('header.top nav.tabs [data-tab=tinderMode]').click();
  await page.waitForFunction(()=>document.getElementById('tinderMode')?.classList.contains('active')&&
    !!document.querySelector('#tinderCardSlot .tdCard'),null,{timeout:30000});
  const refine=page.locator('#tinderFilterToggle');
  assert.equal((await refine.innerText()).trim(),'Refine','Fresh Swipe Mode should not silently select a region or other filters');
  assert.equal(await page.locator('#tdSoundToggle').innerText().then(x=>x.trim()),'Sound off','Optional sound control should default to off');
  await refine.click();
  await page.locator('#tdSetting').selectOption('gp');
  await page.locator('#tdMaxHours').selectOption('35');
  await page.waitForFunction(()=>document.getElementById('tinderFilterToggle')?.innerText.includes('2 selected'),null,{timeout:5000});
  assert((await refine.innerText()).includes('2 selected'),'Collapsed filter label does not disclose active filters');
  await refine.click();
  assert((await refine.innerText()).includes('2 selected'),'Active filter count disappeared when the panel was collapsed');
  await refine.click();
  await page.locator('#tdFiltersReset').click();
  assert.equal((await refine.innerText()).trim(),'Refine','Clearing filters must restore the unfiltered region and setting state');
  await refine.click();

  const detailsButton=page.locator('#tinderCardSlot .tdShowDetails');
  assert.equal((await detailsButton.innerText()).trim(),'Show details','Swipe card details disclosure is missing');
  await detailsButton.click();
  assert(await page.locator('#tinderCardSlot .tdDetailsPanel').isVisible(),'Swipe programme details did not expand');
  assert.equal(await page.locator('#tinderCardSlot .tdResearchLinks a').count(),3,'Swipe details should include public research links');
  await page.locator('#tinderCardSlot .tdShowDetails').click();
  assert.equal((await page.locator('#tinderCardSlot .tdShowDetails').innerText()).trim(),'Show details');

  const sound=page.locator('#tdSoundToggle');
  await sound.click();assert.equal((await sound.innerText()).trim(),'Sound on');
  await sound.click();assert.equal((await sound.innerText()).trim(),'Sound off');
  assert((await page.locator('#tinderCardSlot .tdStampNo').innerText()).trim().toLowerCase().includes('like no'));
  await page.locator('#tdOpenRejected').click();
  await page.waitForFunction(()=>document.getElementById('tdDecisionDrawer')?.getAttribute('aria-hidden')==='false',null,{timeout:5000});
  assert.equal((await page.locator('#tdDrawerHeading').innerText()).trim(),'Like No','Like No drawer heading should not include "Rejected"');
  await page.locator('#tdDrawerClose').click();

  // Quiz: no substantive answer is preselected; single choices advance,
  // multi-select waits for Continue, and the final appearance previews immediately.
  await page.evaluate(()=>window.openOrielPersonalisation?.());
  await page.waitForSelector('.onboardOverlay',{timeout:10000});
  await page.locator('#obStart').click();
  const assertQuizFits=async label=>{
   const metrics=await page.locator('.onboardCard').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));
   assert(metrics.scroll<=metrics.client+2,label+' requires scrolling: '+JSON.stringify(metrics));
  };
  await assertQuizFits('Region step');
  assert.equal(await page.locator('.onboardChoice.selected').count(),0,'Region should not be preselected');
  assert.equal(await page.locator('#obNext').count(),0,'Single-choice region step should advance automatically');
  assert.equal(await page.locator('.onboardChoice').filter({hasText:'South West'}).count(),1);
  await page.locator('.onboardChoice').first().click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.innerText.includes('2 of 5'),null,{timeout:5000});
  await assertQuizFits('Training setting step');
  assert.equal(await page.locator('.onboardChoice.selected').count(),0,'Training setting should not be preselected');
  await page.locator('.onboardChoice').first().click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.innerText.includes('3 of 5'),null,{timeout:5000});
  await assertQuizFits('Priorities step');
  await page.locator('.onboardChoice').first().click();
  assert((await page.locator('.onboardStepLabel').innerText()).includes('3 of 5'),'Multi-select step should wait for Continue');
  assert(await page.locator('#obNext').isVisible(),'Priorities step needs a visible Continue action');
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.innerText.includes('4 of 5'),null,{timeout:5000});
  await assertQuizFits('Practical details step');
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.innerText.includes('5 of 5'),null,{timeout:5000});
  await assertQuizFits('Community exposure step');
  await page.locator('.onboardChoice').first().click();
  await page.waitForFunction(()=>document.querySelector('.onboardStepLabel')?.innerText.includes('6 of 6'),null,{timeout:5000});
  await assertQuizFits('Appearance step');
  assert.equal((await page.locator('#obFinish').innerText()).trim(),'Done');
  assert.equal(await page.locator('[data-ob-palette="mono"]').getAttribute('aria-pressed'),'true','Monochrome should be the first-visit palette');
  await page.locator('[data-ob-palette="copper"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.palette==='copper',null,{timeout:3000});
  await page.locator('[data-ob-palette="mono"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.palette==='mono',null,{timeout:3000});
  await page.locator('[data-ob-mode="dark"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark',null,{timeout:3000});
  await page.locator('[data-ob-mode="light"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light',null,{timeout:3000});
  await page.locator('.onboardClose').click();

  // The quiz should also fit on a narrow phone viewport.
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile layout has horizontal overflow');
  await page.evaluate(()=>window.openOrielPersonalisation?.());
  await page.waitForSelector('.onboardOverlay',{timeout:10000});
  await page.locator('#obStart').click();
  await assertQuizFits('Mobile region step');
  await page.screenshot({path:output+'/placement-atlas-mobile-quiz.png',fullPage:true});
  await page.locator('.onboardClose').click();
  await page.evaluate(()=>window.scrollTo(0,0));
  assert.equal(errors.length,0,'Browser runtime errors: '+errors.join(' | '));
  console.log(JSON.stringify({target:base,programmes:4064,pageSize:100,map:mapInfo.provider,tiles:mapInfo.tileCount,nav:'ok',learn:'ok',swipe:'ok',quiz:'ok',runtimeErrors:errors}));
 }finally{
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});
