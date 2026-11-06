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
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
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
      if((await page.content()).includes('commute-profile.js?v=20261106pcfix')&&(await page.content()).includes('workspace-ux.js?v=20261106tile1')&&(await page.content()).includes('locations-bundled.js?v=20261106a')){fresh=true;break;}
      await sleep(5000);
    }
    assert(fresh,'Latest public build not served');
    await page.locator('#results .placement').first().waitFor({state:'attached',timeout:70000});
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
    const pins=await page.locator('#placementMap .leaflet-interactive').count();
    const cards=await page.locator('#results .placement').count();
    const panels=await page.locator('#results .placement .uxLocationPanel').count();
    assert(pins>0,'Large map missing interactive pins');
    assert(cards>=1,'Programme list empty');
    assert.equal(panels,cards,'Not every programme has a location panel');
    const card=page.locator('#results .placement').first();
    const location=card.locator('.uxLocationPanel');
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
    await page.waitForFunction(()=>document.querySelectorAll('#results .placement .uxMiniMap .leaflet-tile-loaded').length>0,null,{timeout:30000});
    const miniTileSources=await card.locator('.uxMiniMap .leaflet-tile-loaded').evaluateAll(tiles=>tiles.map(img=>({
      url:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight,complete:img.complete
    })));
    assert(miniTileSources.length>0&&miniTileSources.every(x=>new URL(x.url).hostname==='tile.openstreetmap.org'&&x.complete&&x.width>100),
      'Programme mini map still uses an invalid provider or has no readable imagery: '+JSON.stringify(miniTileSources.slice(0,3)));
    const miniPins=await card.locator('.uxMiniMap .leaflet-interactive').count();
    assert(miniPins>0,'Programme mini map has no interactive site marker');
    const bullets=await page.locator('#results .placement .fitColumn .fitPoint').count();
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
    // The full England & Wales view must also retain bundled pins: do not
    // let a missing external postcode request create a 0/4012 empty map.
    await page.locator('[data-q="london"]').first().click();
    await page.waitForFunction(()=>document.querySelectorAll('#placementMap .leaflet-interactive').length>0,null,{timeout:12000});
    assert(await page.locator('#placementMap .leaflet-interactive').count()>40,
      'England & Wales mode has too few map pins');
    assert(!/0 of \d+ matching programmes mapped/.test(await page.locator('#mapStatus').innerText()),
      'England & Wales unexpectedly maps zero programmes');
    await page.locator('[data-q="london"]').first().click();

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
    assert(!errors.some(e=>/pc is not defined|ReferenceError/.test(e)),'Runtime ReferenceError: '+errors.join(';'));
    console.log(JSON.stringify({status:'PASS',pins,mapTiles,miniPins,mainProvider:'tile.openstreetmap.org',miniProvider:'tile.openstreetmap.org',cards,panels,bullets,geometry,themeStyles:themeStyles.length}));
  }finally{await browser.close()}
})().catch(e=>{console.error('UI REGRESSION:',e.stack||e);process.exit(1)});
