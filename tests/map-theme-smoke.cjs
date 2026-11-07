/* Browser regression for the placement maps, boxes, and responsive cards.
 * Run: npm i --no-save playwright && npx playwright install chromium
 *      node tests/map-theme-smoke.cjs
 * Uses a new unauthenticated context. Does not access actual applicant data.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TARGET || 'https://phivosmichailides.github.io/Oriel-Placement-Explorer/';
const output = '/tmp/oriel-map-theme-smoke';
fs.mkdirSync(output, {recursive:true});
const sleep = t=>new Promise(resolve=>setTimeout(resolve,t));
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('RUNTIME ERROR:',e.message)});
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('phivos-onboarding-v1','1');
      localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify({
        region:'London',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'
      }));
    });
    let fresh=false;
    for(let retry=0;retry<18;retry++){
      await page.goto(base+'?ui-smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:40000});
      if((await page.content()).includes('programme-preview.js?v=20261106fixed1')&&(await page.content()).includes('workspace-ux.js?v=20261106commute1')&&(await page.content()).includes('design-refresh.css?v=20261106commute1')&&(await page.content()).includes('app.js?v=20261107independent1')&&(await page.content()).includes('map-basemap.js?v=20261107editorial2')){fresh=true;break;}
      await sleep(5000);
    }
    assert(fresh,'Latest public build not served');
    await page.locator('#results .placement').first().waitFor({state:'attached',timeout:70000});
    // Verify both the actual runtime script and the final rendered footer.
    const productScript=await page.waitForFunction(()=>{
      const script=[...document.scripts].find(el=>el.src.includes('/app-product.js'));
      return script?.src||null;
    },null,{timeout:12000});
    const scriptSrc=await productScript.jsonValue();
    assert.match(scriptSrc,/app-product\.js\?v=20261107independent1$/,
      'Browser loaded an outdated product script');
    const footer=await page.locator('.app-footer').innerText();
    assert.match(footer,/^Oriel Placement Desk · Programme catalogue:/,
      'Expected independent product footer is not rendered');
    assert.doesNotMatch(footer,/based on|original explorer|forked from/i,
      'Obsolete footer attribution was injected at runtime');

    const catalogue=await page.evaluate(()=>{
      const all=typeof placements==='undefined'?[]:placements;
      return {
        origin:document.documentElement.dataset.catalogue,
        count:all.length,
        regions:[...new Set(all.map(p=>p.region))].length,
        sample:all.some(p=>p.id==='Chelsea&Westminster Hosp+South Southwark PCN (Elm Lodge Practice)/London/SW10 9NH+SE24 9HJ/1575')
      };
    });
    assert.equal(catalogue.origin,'oriel-owner-export-2026','The live site fell back to inherited legacy.html');
    assert.equal(catalogue.count,4064,'Programme count mismatched the uploaded Oriel export');
    assert.equal(catalogue.regions,12,'Expected the 12 Oriel England & Wales regions');
    assert(catalogue.sample,'A known programme ID changed and could detach saved applicant selections');

    await page.waitForFunction(
      ()=>document.querySelectorAll('#placementMap .leaflet-interactive').length>0,
      null,{timeout:70000}
    );
    await page.waitForFunction(()=>document.querySelectorAll('#placementMap .leaflet-tile-loaded').length>0,null,{timeout:25000});
    const mapTiles=await page.locator('#placementMap .leaflet-tile-loaded').count();
    const mainTileSources=await page.locator('#placementMap .leaflet-tile-loaded').evaluateAll(tiles=>tiles.map(img=>({
      url:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight,complete:img.complete
    })));
    assert(mainTileSources.every(x=>new URL(x.url).hostname==='tile.openstreetmap.org'&&x.complete&&x.width>100),
      'Main map is using unauthorized/keyed or failed tile imagery: '+JSON.stringify(mainTileSources.slice(0,3)));
    const vectorDiagnostic=await page.evaluate(()=>({
      adapterPresent:typeof window.L?.maplibreGL==='function',
      webglSupported:(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}})(),
      basemapStatus:document.getElementById('placementMap')?.dataset.basemap||'unset',
      canvasCount:document.querySelectorAll('#placementMap canvas.maplibregl-canvas').length,
      rasterTileCount:document.querySelectorAll('#placementMap img.leaflet-tile-loaded').length
    }));
    console.log('PLACEMENT MAP VECTOR DIAGNOSTIC:',JSON.stringify(vectorDiagnostic));
    if(vectorDiagnostic.adapterPresent&&vectorDiagnostic.webglSupported){
      await page.waitForFunction(()=>{
        const value=document.getElementById('placementMap')?.dataset.basemap||'';
        return value.startsWith('vector-')&&value!=='vector-loading';
      },null,{timeout:18000}).catch(()=>{
        throw Error('WebGL and MapLibre are available, but the vector map did not load: '+JSON.stringify(vectorDiagnostic));
      });
    }
    const mapPicker=page.locator('#mapStyle');
    assert(await mapPicker.isVisible(),'Map style picker is missing');
    assert.equal(await mapPicker.locator('option[value="auto"]').count(),1,'Automatic map option missing');
    assert.equal(await mapPicker.locator('option[value="editorial"]').count(),1,'Editorial Light map option missing');
    if(vectorDiagnostic.adapterPresent&&vectorDiagnostic.webglSupported){
      assert(await mapPicker.isEnabled(),'Vector styles should be selectable when WebGL is supported');
      await mapPicker.selectOption('liberty');
      const savedMapStyle=await page.evaluate(()=>({
        active:window.OrielBasemap?.preference,
        stored:localStorage.getItem('oriel-basemap-style-v1')
      }));
      assert.deepEqual(savedMapStyle,{active:'liberty',stored:'liberty'},'Map style was not saved');
      await mapPicker.selectOption('auto');
      await page.waitForFunction(()=>window.OrielBasemap?.preference==='auto');
    }else{
      assert(await mapPicker.isDisabled(),'Map style selector should explain unsupported WebGL');
      assert(await page.locator('#mapStyleStatus').isVisible(),'Fallback explanation is missing');
      assert.equal(await page.locator('#placementMap').getAttribute('data-basemap'),'raster-fallback');
    }

    const pins=await page.locator('#placementMap .leaflet-interactive').count();
    const cards=await page.locator('#results .placement').count();
    const panels=await page.locator('#results .placement .uxLocationPanel').count();
    assert(pins>0,'Large map missing interactive pins');
    assert(cards>=1,'Programme list empty');
    assert.equal(panels,cards,'Not every programme has a location panel');
    const card=page.locator('#results .placement').first();
    const location=card.locator('.uxLocationPanel');
    await page.waitForFunction(()=>{
      const first=document.querySelector('#results .placement');
      const caption=first?.querySelector('.uxLocationCaption')?.textContent||'';
      return caption.includes('Area connections')&&!!first?.querySelector('.uxCommutePersonalisation');
    },null,{timeout:15000});
    const generalCaption=await card.locator('.uxLocationCaption').innerText();
    const generalHint=await card.locator('.uxCommutePersonalisation').innerText();
    assert(generalCaption.includes('Area connections'),'No general connections caption');
    assert(!/Commute not verified/i.test(generalCaption),'Unverified status shown without home postcode');
    assert(/Add a home postcode/i.test(generalHint),'Missing guidance to add a postcode');

    assert(await location.locator('.uxMiniMap').count()>0,'Mini map not present');
    assert(await location.locator('a[href*="google.com/maps"]').count()>=1,'Maps link absent');
    assert(await location.locator('a').count()>=2,'Directions link absent');
    // Split posts have at least two sites with navigation.
    const split=page.locator('#results .placement').filter({has:page.locator('.uxSiteArrow')}).first();
    assert(await split.count()>0,'Split-site arrows missing');
    assert(await split.locator('.uxSiteArrow').count()>=2,'Two arrows not available');
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{
      const e=document.querySelector('#results .placement .uxMiniMap');
      return e && (e.classList.contains('leaflet-container')||e.textContent.includes('No mapped pin'));
    },null,{timeout:30000});
    await page.waitForFunction(()=>document.querySelectorAll('#results .placement .uxMiniMap .leaflet-interactive').length>0,null,{timeout:25000});
    await page.waitForFunction(()=>{
      const holder=document.querySelector('#results .placement .uxMiniMap');
      return holder&&(holder.dataset.basemap==='vector-editorial'||holder.dataset.basemap==='vector-dark'||holder.querySelector('.leaflet-tile-loaded'));
    },null,{timeout:30000});
    const miniBasemap=await card.locator('.uxMiniMap').evaluate(node=>node.dataset.basemap||'unknown');
    const miniTileSources=await card.locator('.uxMiniMap .leaflet-tile-loaded').evaluateAll(tiles=>tiles.map(img=>({
      url:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight,complete:img.complete
    })));
    assert(miniBasemap.startsWith('vector')||
      (miniTileSources.length>0&&miniTileSources.every(x=>new URL(x.url).hostname==='tile.openstreetmap.org'&&x.complete&&x.width>100)),
      'Mini map is blank or uses invalid imagery: '+miniBasemap);
    const miniPins=await card.locator('.uxMiniMap .leaflet-interactive').count();
    assert(miniPins>0,'Programme mini map has no interactive site marker');
    const bullets=await page.locator('#results .placement .fitColumn .fitPoint').count();
    const readable=await card.evaluate(el=>{
      const font=sel=>parseFloat(getComputedStyle(el.querySelector(sel)).fontSize);
      return {
        title:font('.placementTop h3'),
        bullet:font('.fitPoint'),
        caption:font('.uxLocationCaption'),
        captionLength:el.querySelector('.uxLocationCaption')?.textContent?.length||0,
        extraExpanded:el.querySelector('.uxLocationMore')?.open,
        middleHeight:el.querySelector('.fitColumn.positive').getBoundingClientRect().height
      };
    });
    assert(readable.title>=20,'Programme title font is too small');
    assert(readable.bullet>=16,'Fit bullets font is too small');
    assert(readable.caption>=15,'Map caption font is too small');
    assert(readable.captionLength<=115,'Map caption is too long');
    assert(!readable.extraExpanded,'Extra location details should start collapsed');
    assert(readable.middleHeight<250,'Fit boxes are still oversized');
    assert(bullets>0,'Bullets are missing');
    const overflow=await page.locator('#results .placement .fitColumn').evaluateAll(items=>
      items.some(e=>e.scrollWidth>e.clientWidth+4||e.scrollHeight>e.clientHeight+4)
    );
    assert(!overflow,'Explanation panel content overflows');

    const geometry=await card.evaluate(e=>{
      const r=x=>e.querySelector(x).getBoundingClientRect();
      const a=r('.score'),b=r('.fitBreakdown'),c=r('.uxLocationPanel');
      const f=r('.fit.fitExpanded.uxFitWithLocation');
      return {scoreWidth:a.width,scoreRight:a.right,whyLeft:b.left,whyRight:b.right,mapLeft:c.left,mapRight:c.right,fitRight:f.right};
    });
    assert(geometry.whyLeft-geometry.scoreRight<35,'Unwanted blank space after Personal Fit');
    assert(geometry.whyLeft>=geometry.scoreRight-3,'Reason panel overlaps Personal Fit');
    assert(geometry.mapLeft>=geometry.whyRight-3,'Map panel overlaps reasons');
    assert(geometry.scoreWidth>=140&&geometry.scoreWidth<=190,'Personal Fit not slightly wider than reference');
    assert(geometry.fitRight-geometry.mapRight<26,'Fit row leaves excessive blank right-hand space');
    await page.screenshot({path:output+'/desktop-list.png',fullPage:false});
    await page.evaluate(()=>{
      window.OrielCommute.getJourney=async()=>({
        duration:27,legs:['Walk to station','Train','Walk to site'],
        transfers:0,walkingMinutes:8,departure:'08:00',
        sampleDate:'Mon 9 Nov',disrupted:false
      });
      window.OrielCommuteProfile.save('E16 1RB',{silent:true});
    });
    await page.waitForFunction(()=>{
      const caption=document.querySelector('#results .placement .uxLocationCaption')?.textContent||'';
      return /^Convenient · 27 min/.test(caption);
    },null,{timeout:15000});
    assert(/Personalised to/.test(await card.locator('.uxCommutePersonalisation').innerText()),
      'Saving a home postcode did not personalise the selected site');

    const browserBasemaps=await page.evaluate(()=>({
      main:document.querySelector('#placementMap')?.dataset.basemap,
      mini:document.querySelector('#results .placement .uxMiniMap')?.dataset.basemap,
      maplibreLoaded:!!window.maplibregl,
      pluginLoaded:!!window.L?.maplibreGL,
      supported:(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}})(),
      cssFilter:getComputedStyle(document.querySelector('#placementMap .leaflet-tile-pane')).filter
    }));
    console.log('BASEMAP DIAGNOSTICS:',JSON.stringify(browserBasemaps));
    if(browserBasemaps.supported&&browserBasemaps.pluginLoaded){
      await page.waitForFunction(()=>{
        const state=document.querySelector('#placementMap')?.dataset.basemap;
        return state==='vector-editorial'||state==='raster-fallback';
      },null,{timeout:14000});
      const finalState=await page.locator('#placementMap').evaluate(el=>el.dataset.basemap);
      console.log('GPU BASEMAP:',finalState);
      assert(finalState==='vector-editorial'||finalState==='raster-fallback','WebGL map hung during initialisation');
    }
    assert(['vector-editorial','vector-loading','raster-fallback'].includes(browserBasemaps.main),
      'Unexpected basemap mode: '+browserBasemaps.main);
    await card.locator('.uxLocationMore summary').click();
    assert(await card.locator('.uxLocationMore').evaluate(el=>el.open),'Extra location details do not expand');
    await card.locator('.uxLocationMore summary').click();
    await card.locator('.uxSiteArrow[aria-label="Next training site"]').first().click();
    assert(/Site 2/.test(await card.locator('.uxSiteNumber').innerText()),
      'Split site arrows failed to update location');
    // The full England & Wales view must also retain bundled pins: do not
    // let a missing external postcode request create a 0/4012 empty map.
    await page.locator('#region').selectOption('');
    // Onboarding can already have turned off the London quick chip; do not toggle
    // it back ON when testing the all-regions state.
    if(await page.evaluate(()=>quick.has('london'))){
      await page.locator('[data-q="london"]').first().click();
    }
    await page.waitForFunction(()=>document.querySelectorAll('#placementMap .leaflet-interactive').length>0,null,{timeout:12000});
    const allRegionPins=await page.locator('#placementMap .leaflet-interactive').count();
    const allRegionStatus=await page.locator('#mapStatus').innerText();
    assert(allRegionPins>100,
      'England & Wales mode has too few map pins: '+allRegionPins+' ('+allRegionStatus+')');
    assert(!await page.evaluate(()=>quick.has('london')||document.getElementById('region').value==='London'),
      'The test did not actually enter England & Wales mode');
    assert(!/0 of \d+ matching programmes mapped/.test(await page.locator('#mapStatus').innerText()),
      'England & Wales unexpectedly maps zero programmes');
    await page.locator('[data-q="london"]').first().click();

    // Visibility rules inspect every training-site postcode, not merely
    // the first site name; these are synthetic fixtures, never user edits.
    const areas=await page.evaluate(()=>{
      const split={id:'test/0000',title:'Central London Hospital / Split GP',area:'London',
        region:'London',postcodes:['SW1A 1AA','CR0 1AA','SE13 6AA'],settings:[['Hospital',26],['GP',26]]};
      const orpington={...split,postcodes:['SW1A 1AA','BR5 3AA']};
      return {
        croydon:OrielAreaRules.isAvoided(split,'Croydon'),
        lewisham:OrielAreaRules.isAvoided(split,'Lewisham'),
        splitAvoid:OrielAreaRules.isAvoided(split,'Croydon, Lewisham'),
        orpington:OrielAreaRules.isOuterTown(orpington)
      };
    });
    assert(areas.croydon&&areas.lewisham&&areas.splitAvoid&&areas.orpington,
      'All-site avoid or inner-London filtering failed '+JSON.stringify(areas));
    // This toggle must always be available even when the sidebar is hidden.
    const sidebarButton=page.locator('#uxToolbarFilters');
    const sidebarFirst=await sidebarButton.getAttribute('aria-expanded');
    await sidebarButton.click();
    assert.notEqual(await sidebarButton.getAttribute('aria-expanded'),sidebarFirst,
      'Sidebar show/hide button did not change state');
    await sidebarButton.click();
    assert.equal(await sidebarButton.getAttribute('aria-expanded'),sidebarFirst,
      'Sidebar could not be reopened from the results toolbar');
    await page.locator('#uxHideExcludedBtn').click();
    assert(!(await page.locator('#hideExcluded').isChecked()),
      'Show excluded toolbar toggle did not update the canonical filter');
    await page.locator('#uxHideExcludedBtn').click();
    assert(await page.locator('#hideExcluded').isChecked(),'Hide excluded could not be reenabled');
    await page.locator('#uxResultsSort').selectOption('salary');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#sort').inputValue(),'salary',
      'Results toolbar sort did not update the canonical salary sort');
    const descending=await page.evaluate(()=>{
      const list=[...document.querySelectorAll('#results .placement')].map(el=>
        placements.find(p=>p.id===el.dataset.id)?.salary||0);
      return list.every((v,i)=>i===0||list[i-1]>=v);
    });
    assert(descending,'Salary ordering did not apply to filtered programme results');
    await page.locator('#uxResultsSort').selectOption('fit');
    const palettes=['forest','copper','mauve','amber','cocoa','mono'];
    const themeStyles=await page.evaluate(palettes=>{
      const root=document.documentElement,rows=[];
      for(const theme of ['light','dark']){
        root.dataset.theme=theme;
        for(const palette of palettes){
          root.dataset.palette=palette;
          const css=getComputedStyle(root);
          rows.push({theme,palette,bg:css.getPropertyValue('--bg').trim(),
            ink:css.getPropertyValue('--ink').trim(),accent:css.getPropertyValue('--ux-accent-ink').trim()});
        }
      }
      root.dataset.theme='light';root.dataset.palette='forest';
      return rows;
    },palettes);
    assert.equal(themeStyles.length,12);
    for(const entry of themeStyles){
      assert(entry.bg&&entry.ink&&entry.accent,'Missing design variables '+entry.theme+'/'+entry.palette);
      assert.notEqual(entry.bg,entry.ink,'Unreadable text colours '+entry.theme+'/'+entry.palette);
    }
    assert.notEqual(themeStyles.find(x=>x.theme==='dark'&&x.palette==='forest').accent,
      themeStyles.find(x=>x.theme==='dark'&&x.palette==='copper').accent,
      'Dark blue inherited forest-green accent');
    const greenFit=await card.locator('.score[data-fit-tone="excellent"]').count();
    assert(greenFit===1,'Expected first programme to show high-green score');

    await page.locator('#uxExploreToolbar [data-ux-layout="grid"]').click();
    await page.waitForFunction(()=>document.documentElement.dataset.layout==='grid',null,{timeout:8000});
    const title=page.locator('#results .placement .placementTop h3').first();
    await title.click();
    assert(await title.evaluate(e=>e.classList.contains('uxTitleExpanded')),'Grid titles cannot expand on touch');
    const gridDate=page.locator('#results .placement .programmeDates').first();
    if(await gridDate.count()){
      const bounds=await gridDate.evaluate(e=>{
        const start=e.querySelector('.dateStart')?.getBoundingClientRect();
        const end=e.querySelector('.dateEnd')?.getBoundingClientRect();
        return start&&end?{startRight:start.right,endLeft:end.left}:null;
      });
      if(bounds)assert(bounds.startRight<=bounds.endLeft+3,'Compact date columns overlap');
    }
    await page.screenshot({path:output+'/desktop-grid.png',fullPage:false});
    // Simulation title opens a modal in this same page, not a new tab.
    await page.locator('nav.tabs [data-tab="simulator"]').click();
    await page.locator('#simInput-preferred').fill('SW10');
    await page.locator('[data-sim-results="preferred"] .simResult').first().click();
    await page.locator('[data-sim-list="preferred"] .simItemNameButton').first().click();
    const preview=page.locator('.progPeekDialog');
    await preview.waitFor({state:'visible'});
    assert(await preview.getByText('Gross · yearly').count()===1,'Preview missing annual gross pay');
    assert(await preview.getByText('Estimated take-home · monthly').count()===1,'Preview missing monthly take-home');
    assert(await preview.getByText('Hours per week').count()===1,'Preview missing weekly hours');
    assert(await preview.getByText('Training setting and split').count()===1,'Preview missing sector split');
    assert(await preview.locator('a[href*="google.com/maps/search"]').count()>=1,'Preview missing training location');
    await page.keyboard.press('Escape');
    assert(await preview.count()===0,'Escape should close the same-page summary');

    assert(!errors.some(e=>/pc is not defined|ReferenceError/.test(e)),'Runtime ReferenceError: '+errors.join(';'));
    console.log(JSON.stringify({status:'PASS',catalogue,pins,mapTiles,miniPins,basemap:browserBasemaps,allRegionPins,cards,panels,bullets,readable,geometry,themeStyles:themeStyles.length}));
  }finally{await browser.close()}
})().catch(e=>{console.error('UI REGRESSION:',e.stack||e);process.exit(1)});
