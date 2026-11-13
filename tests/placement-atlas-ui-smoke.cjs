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
  // The primary navigation must be visibly present immediately, without waiting
  // for dataset or asynchronously built simulation/learning modules.
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('atlasNavLoading')),false,
    'Navigation is still gated behind an asynchronous loading state');
  assert(await page.locator('header.top nav.tabs').isVisible(),
    'Primary navigation must be visible from first paint');
  for(const id of ['explore','shortlist','simulator','tinderMode','learn','prefs']){
    assert.equal(await page.locator('header.top nav.tabs > .tab[data-tab="'+id+'"]').count(),1,
      'Missing or duplicate first-paint navigation: '+id);
  }
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

  // Regression: Learning Hub content must never bleed into Shortlist, Profile,
  // Oriel Simulation or Explore. Only the active section may be rendered.
  const expectExclusivePage=async tab=>{
    await page.evaluate(id=>switchTab(id),tab);
    await page.waitForFunction(id=>document.getElementById(id)?.classList.contains('active'),tab,{timeout:6000});
    const visible=await page.locator('.shell > section.panel').evaluateAll(nodes=>nodes.filter(node=>{
      const style=getComputedStyle(node),box=node.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;
    }).map(node=>node.id));
    assert.deepEqual(visible,[tab],'Unexpected sections visible while '+tab+' is active: '+JSON.stringify(visible));
    if(tab!=='learn')assert.equal(await page.locator('#atlasLearnHome').isVisible(),false,
      'Learning Hub appeared on '+tab);
    assert.equal(await page.locator('#paOutcomeDetails').isVisible(),false,
      'Old My Outcome dropdown is still visible on '+tab);
  };
  for(const tab of ['explore','shortlist','outcome','simulator','learn','prefs','explore'])await expectExclusivePage(tab);
  // Keep the public landing-page state as the entry point for the rest of the test.
  // Device-viewport regression: ordinary content must fit without a
  // document-level sideways scroll at the default 100% page zoom.
  assert.equal(await page.locator('#uxPageZoomValue').innerText(),'100%','The default in-app zoom should start at 100%');
  assert.equal(await page.locator('#atlasDataTools').evaluate(el=>el.parentElement?.id),'prefs',
    'Backup/restore controls belong exclusively to Preferences');
  for(const width of [320,390,600,768,1024,1280,1536]){
    await page.setViewportSize({width,height:920});
    for(const tab of ['explore','shortlist','prefs','learn','simulator']){
      await page.evaluate(id=>switchTab(id),tab);
      await wait(80);
      const result=await page.evaluate(()=>{
        const panel=document.querySelector('.shell > section.panel.active');
        return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
          bodyWidth:document.body.scrollWidth,panel:panel?.id,
          panelRight:panel?.getBoundingClientRect().right||0,
          footerRight:document.querySelector('.app-footer')?.getBoundingClientRect().right||0};
      });
      assert(result.documentWidth<=width+2,
        'Document-level horizontal overflow at '+width+'px on '+tab+': '+JSON.stringify(result));
      assert(result.panelRight<=width+2,
        'Active panel is clipped at '+width+'px on '+tab+': '+JSON.stringify(result));
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>switchTab('prefs'));
  const ratingSpacing=await page.locator('#weights').evaluate(el=>{
    const styles=getComputedStyle(el);
    return {gap:parseFloat(styles.rowGap||styles.gap),rows:el.querySelectorAll('.weightModern').length};
  });
  assert(ratingSpacing.rows>=5&&ratingSpacing.gap>=14,
    'Importance-rating rows should have adequate breathing room: '+JSON.stringify(ratingSpacing));
  const footer=page.locator('footer.app-footer.atlasFooter');
  await footer.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.body.classList.contains('atlasFooterInView'),null,{timeout:5000});
  const footerMetrics=await footer.evaluate(el=>{
    const f=el.getBoundingClientRect();
    const left=el.querySelector('.atlasFooterIdentity')?.getBoundingClientRect();
    const right=el.querySelector('.atlasFooterBottom p:last-child')?.getBoundingClientRect();
    return {innerWidth,left:left?.left,right:right?.right,footerLeft:f.left,footerRight:f.right};
  });
  assert(footerMetrics.left>=12&&footerMetrics.right<=390-12,
    'Footer text needs consistent left/right breathing room: '+JSON.stringify(footerMetrics));
  for(const id of ['uxPageZoomDock','uxBackTop','uxDrawerLauncher','uxFloatingTools']){
    assert.equal(await page.locator('#'+id).evaluate(el=>getComputedStyle(el).visibility),'hidden',
      'Floating '+id+' should disappear when the footer enters view');
  }
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>!document.body.classList.contains('atlasFooterInView'),null,{timeout:5000});
  assert.equal(await page.locator('#uxPageZoomDock').evaluate(el=>getComputedStyle(el).visibility),'visible',
    'Floating zoom controls must return when the footer leaves view');
  await page.setViewportSize({width:1440,height:960});
  await page.evaluate(()=>switchTab('explore'));

  // Profile benefits are concrete and the learning library is a separate destination.
  assert.equal(await page.locator('header.top nav.tabs [data-tab=outcome]').isVisible(),false,'Duplicate Profile navigation should be hidden');
  const headerIdentity=page.locator('header.top .atlasHeaderUtilities .paHeaderIdentity');
  assert.equal(await headerIdentity.locator('.paHeaderLabel').innerText(),'Profile','Guest header shows Profile');
  assert.equal(await headerIdentity.locator('.paHeaderSessionAction').innerText(),'Sign in','Guest header offers Sign in');
  await headerIdentity.locator('.paHeaderProfile').click();
  await page.waitForFunction(()=>document.getElementById('outcome')?.classList.contains('active'),null,{timeout:12000});
  assert.equal(await page.locator('#paJoinBanner').count(),1,'Existing Profile account banner should remain intact');
  assert((await page.locator('#paJoinBanner').innerText()).includes('Join the pharmacy community'));
  assert.equal((await page.locator('.atlasStickyHeader .brand h1').innerText()).trim(),'Placement Atlas');
  assert((await page.locator('.atlasStickyHeader .brand h1').innerText()).trim()==='Placement Atlas','Header must identify the site clearly');
  // Desktop layout regression: a 1536px window previously collapsed the brand,
  // navigation and account buttons into the same space, while a physical-screen
  // positioning adjustment moved the floating shortlist over the map.
  await page.waitForFunction(()=>!!document.querySelector('.productIntro')&&
    !!document.getElementById('orielDeadline')&&!!document.getElementById('atlasDeadlineRow'),
    null,{timeout:25000});
  for(const dims of [{width:1920,height:1080},{width:1536,height:960},
                      {width:1280,height:900},{width:390,height:844}]){
    await page.setViewportSize(dims);
    await wait(120);
    const layout=await page.evaluate(()=>{
      const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      const header=document.querySelector('header.top.atlasStickyHeader');
      const brand=header.querySelector(':scope > .brand'),nav=header.querySelector(':scope > nav.tabs');
      const utility=header.querySelector(':scope > .atlasHeaderUtilities');
      const icon=brand.querySelector('.logo img'),title=brand.querySelector('h1');
      const intro=document.querySelector('.productIntro'),deadline=document.getElementById('orielDeadline');
      const launcher=document.getElementById('uxDrawerLauncher');
      return {vw:innerWidth,vh:innerHeight,pageWidth:document.documentElement.scrollWidth,
        header:bounds(header),brand:bounds(brand),nav:bounds(nav),utility:bounds(utility),
        icon:bounds(icon),iconLoaded:icon.complete&&icon.naturalWidth>0,
        title:bounds(title),deadline:bounds(deadline),intro:bounds(intro),
        deadlineInHeader:header.contains(deadline),deadlineParent:deadline.parentElement?.id,deadlinePrecedesIntro:Boolean(deadline.compareDocumentPosition(intro)&Node.DOCUMENT_POSITION_FOLLOWING),
        launcher:bounds(launcher),launcherPosition:getComputedStyle(launcher).position,
        navOverflow:nav.scrollWidth-nav.clientWidth};
    });
    const intersects=(a,b)=>a.left<b.right-2&&a.right>b.left+2&&a.top<b.bottom-2&&a.bottom>b.top+2;
    assert(layout.iconLoaded,'Header logo failed to load: '+JSON.stringify(layout));
    assert(layout.icon.right<=layout.title.left+2,'Compass logo is not to the left of the title: '+JSON.stringify(layout));
    assert(layout.brand.left<=layout.header.left+40,'Brand is no longer left aligned: '+JSON.stringify(layout));
    assert(!intersects(layout.brand,layout.nav),'Brand and navigation overlap: '+JSON.stringify(layout));
    assert(!intersects(layout.brand,layout.utility),'Brand and utility controls overlap: '+JSON.stringify(layout));
    assert(!intersects(layout.nav,layout.utility),'Navigation and utility controls overlap: '+JSON.stringify(layout));
    assert(layout.pageWidth<=layout.vw+1,'Whole-page horizontal overflow: '+JSON.stringify(layout));
    assert(!layout.deadlineInHeader&&layout.deadlineParent==='atlasDeadlineRow'&&layout.deadlinePrecedesIntro,
      'Oriel recruitment status must precede the hero and never appear inside the header: '+JSON.stringify(layout));
    assert(layout.launcherPosition==='fixed','Shortlist launcher must be viewport-fixed: '+JSON.stringify(layout));
    assert(layout.vw-layout.launcher.right>=5&&layout.vw-layout.launcher.right<=54,
      'Shortlist is not at the bottom-right edge: '+JSON.stringify(layout));
    assert(layout.vh-layout.launcher.bottom>=5&&layout.vh-layout.launcher.bottom<=54,
      'Shortlist is vertically misplaced: '+JSON.stringify(layout));
    await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
    await wait(120);
    const scrolled=await page.locator('#uxDrawerLauncher').evaluate(el=>{const r=el.getBoundingClientRect();return {right:innerWidth-r.right,bottom:innerHeight-r.bottom}});
    assert(scrolled.right>=5&&scrolled.right<=54&&scrolled.bottom>=5&&scrolled.bottom<=54,
      'Shortlist moves away from viewport corner while scrolling: '+JSON.stringify({dims,scrolled}));
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  }
  await page.setViewportSize({width:1440,height:960});
  const gphcAssessment='https://www.pharmacyregulation.org/students-and-trainees/pharmacist-education-and-training/common-registration-assessment/sitting-common-registration-assessment';
  assert.equal(await page.locator('#learn a[href="'+gphcAssessment+'"]').count(),1,
    'Learn must link directly to the current GPhC Common Registration Assessment page');
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
  const boxesOverlap=(a,b)=>a.left<b.right-2&&a.right>b.left+2&&a.top<b.bottom-2&&a.bottom>b.top+2;
  assert(!boxesOverlap(headerMetrics.brand,headerMetrics.utility),'Brand and utility controls overlap: '+JSON.stringify(headerMetrics));
  assert(!boxesOverlap(headerMetrics.utility,headerMetrics.nav),'Utility controls and navigation overlap: '+JSON.stringify(headerMetrics));
  assert(!boxesOverlap(headerMetrics.brand,headerMetrics.nav),'Brand and navigation overlap: '+JSON.stringify(headerMetrics));
  assert(headerMetrics.navScrollWidth<=headerMetrics.navClientWidth+2,'Navigation labels do not fit the 1090px desktop banner: '+JSON.stringify(headerMetrics));
  await page.setViewportSize({width:1440,height:960});
  await page.locator('header.top nav.tabs [data-tab=learn]').click();
  await page.waitForFunction(()=>document.getElementById('learn')?.classList.contains('active'),null,{timeout:12000});
  assert(await page.locator('#atlasLearnHome').isVisible(),'Learning Hub home should open first');
  await page.locator('[data-atlas-learn-view="guide"]').last().click();
  assert(await page.locator('#atlasLearnSettings').isVisible(),'Learning Hub guidance view did not open');
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
    !!document.querySelector('#tinderCardSlot .tdSwipeCard'),null,{timeout:30000});
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

  const detailsButton=page.locator('#tinderCardSlot .tdSwipeCard:not(.tdNextCard) .tdShowDetails');
  assert.equal((await detailsButton.innerText()).trim(),'Show details','Swipe card details disclosure is missing');
  await detailsButton.click();
  assert(await page.locator('#tinderCardSlot .tdSwipeCard:not(.tdNextCard) .tdDetailsPanel').isVisible(),'Swipe programme details did not expand');
  assert.equal(await page.locator('#tinderCardSlot .tdSwipeCard:not(.tdNextCard) .tdResearchLinks a').count(),3,'Swipe details should include public research links');
  await detailsButton.click();
  assert.equal((await detailsButton.innerText()).trim(),'Show details');

  const sound=page.locator('#tdSoundToggle');
  await sound.click();assert.equal((await sound.innerText()).trim(),'Sound on');
  await sound.click();assert.equal((await sound.innerText()).trim(),'Sound off');
  assert((await page.locator('#tinderCardSlot .tdSwipeCard:not(.tdNextCard) .tdStampNo').innerText()).trim().toLowerCase().includes('like no'));
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
  console.log('Quiz after region choice: '+JSON.stringify(await page.locator('.onboardOverlay .onboardStepLabel').allTextContents()));
  await page.waitForFunction(()=>document.querySelector('.onboardOverlay .onboardStepLabel')?.textContent?.includes('2 of 5'),null,{timeout:5000});
  await assertQuizFits('Training setting step');
  assert.equal(await page.locator('.onboardChoice.selected').count(),0,'Training setting should not be preselected');
  await page.locator('.onboardChoice').first().click();
  await page.waitForFunction(()=>document.querySelector('.onboardOverlay .onboardStepLabel')?.textContent?.includes('3 of 5'),null,{timeout:5000});
  await assertQuizFits('Priorities step');
  await page.locator('.onboardChoice').first().click();
  assert((await page.locator('.onboardOverlay .onboardStepLabel').textContent()).includes('3 of 5'),'Multi-select step should wait for Continue');
  assert(await page.locator('#obNext').isVisible(),'Priorities step needs a visible Continue action');
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardOverlay .onboardStepLabel')?.textContent?.includes('4 of 5'),null,{timeout:5000});
  await assertQuizFits('Practical details step');
  await page.locator('#obNext').click();
  await page.waitForFunction(()=>document.querySelector('.onboardOverlay .onboardStepLabel')?.textContent?.includes('5 of 5'),null,{timeout:5000});
  await assertQuizFits('Community exposure step');
  await page.locator('.onboardChoice').first().click();
  await page.waitForFunction(()=>document.querySelector('.onboardOverlay .onboardStepLabel')?.textContent?.includes('6 of 6'),null,{timeout:5000});
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
  const horizontal=await page.evaluate(()=>{
    const vw=window.innerWidth;
    const offenders=[...document.body.querySelectorAll('*')].map(node=>{
      const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
      return {node,rect,style};
    }).filter(x=>x.style.display!=='none'&&x.style.visibility!=='hidden'&&x.rect.width>0&&x.rect.right>vw+2&&x.rect.left<vw+2)
      .sort((a,b)=>b.rect.right-a.rect.right).slice(0,18).map(x=>({
        tag:x.node.tagName,id:x.node.id,cls:String(x.node.className).slice(0,95),
        left:Math.round(x.rect.left),right:Math.round(x.rect.right),width:Math.round(x.rect.width),
        position:x.style.position,overflowX:x.style.overflowX,transform:x.style.transform.slice(0,50)
      }));
    return {innerWidth:vw,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,offenders};
  });
  console.log('Mobile horizontal layout diagnostics: '+JSON.stringify(horizontal));
  const layoutBoxes=await page.evaluate(()=>{
    const selectors=['html','body','.shell','.atlasStickyHeader','.atlasStickyHeader>nav.tabs','.atlasStickyHeader>.brand','.atlasStickyHeader>.atlasHeaderUtilities','#tinderMode','.tdBoard'];
    return selectors.map(sel=>{
      const node=document.querySelector(sel);if(!node)return {selector:sel,missing:true};
      const r=node.getBoundingClientRect(),cs=getComputedStyle(node);
      return {selector:sel,x:Math.round(r.x),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,overflowX:cs.overflowX,gridCols:cs.gridTemplateColumns,display:cs.display,maxWidth:cs.maxWidth};
    });
  });
  console.log('Mobile layout box sizes: '+JSON.stringify(layoutBoxes));
  assert(horizontal.scrollWidth<=horizontal.innerWidth+1,'Mobile layout has horizontal overflow');
  await page.evaluate(()=>window.openOrielPersonalisation?.());
  await page.waitForSelector('.onboardOverlay',{timeout:10000});
  await page.locator('#obStart').click();
  await assertQuizFits('Mobile region step');
  await page.screenshot({path:output+'/placement-atlas-mobile-quiz.png',fullPage:true});
  await page.locator('.onboardClose').click();
  await page.evaluate(()=>window.scrollTo(0,0));
  // Member onboarding: fake client tests form validation and the atomic save
  // without creating or editing any actual Supabase account.
  await page.evaluate(()=>{
    window.PlacementAtlasAccount={
      getUser:()=>({id:'ui-test-user',email:'test@example.invalid',user_metadata:{}}),
      getClient:()=>({
        from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),
        rpc:async()=>({data:null,error:null})
      }),
      openSignIn:()=>{}
    };
    window.PlacementAtlasMemberProfile.open();
  });
  assert(await page.locator('.atlasMemberDialog').isVisible(),'Member onboarding dialog did not open');
  await page.locator('.atlasMemberDialog input[name="first"]').fill('Φοίβος');
  await page.locator('.atlasMemberDialog input[name="last"]').fill('Michailides');
  assert.equal(await page.locator('.atlasMemberDialog input[name="username"]').getAttribute('maxlength'),'15','Username field must have a 15-character cap');
  await page.locator('.atlasMemberDialog input[name="username"]').fill('atlasstudent99');
  await page.locator('.atlasMemberDialog select[name="birth_year"]').selectOption('2004');
  await page.locator('.atlasMemberDialog select[name="birth_month"]').selectOption('04');
  await page.locator('.atlasMemberDialog select[name="birth_day"]').selectOption('29');
  await page.locator('#atlasUniversityInput').fill('ucl');
  assert(await page.locator('#atlasUniversityList').isVisible(),'University suggestions should open when typing an alias');
  await page.getByRole('option',{name:'University College London'}).click();
  assert.equal(await page.locator('#atlasUniversityInput').inputValue(),'University College London','University picker should resolve UCL alias to official name');
  assert.equal(await page.locator('.atlasMemberYears label').last().innerText(),'Foundation training year','Foundation training label should not say Pre-Reg!');
  await page.locator('.atlasMemberDialog input[name="study_year"][value="year4"]').check();
  await page.waitForFunction(()=>document.querySelector('#atlasHandleStatus')?.textContent?.includes('Available'),null,{timeout:6000});
  await page.locator('#atlasMemberSave').click();
  await page.waitForFunction(()=>!document.querySelector('.atlasMemberDialog'),null,{timeout:6000});
  assert.equal(await page.locator('.atlasStickyHeader .paHeaderLabel').innerText(),'Hi, Φοίβος','Header should greet the saved first name');
  assert.equal(await page.locator('.atlasStickyHeader .paHeaderSessionAction').innerText(),'Log out','Signed-in header needs Log out');
  await page.evaluate(()=>{window.__atlasTestLoggedOut=false;window.PlacementAtlasAccount.signOut=()=>{window.__atlasTestLoggedOut=true}});
  await page.locator('.atlasStickyHeader .paHeaderSessionAction').click();
  assert.equal(await page.evaluate(()=>window.__atlasTestLoggedOut),true,'Log out shortcut must invoke protected account sign-out');
  assert.equal(errors.length,0,'Browser runtime errors: '+errors.join(' | '));
  console.log(JSON.stringify({target:base,programmes:4064,pageSize:100,map:mapInfo.provider,tiles:mapInfo.tileCount,nav:'ok',learn:'ok',swipe:'ok',quiz:'ok',runtimeErrors:errors}));
 }finally{
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});
