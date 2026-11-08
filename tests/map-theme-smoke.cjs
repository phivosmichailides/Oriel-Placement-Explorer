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
  const mapHttpErrors=[];
  let geocodeRequests=0;
  page.on('pageerror',e=>{errors.push(e.message);console.log('RUNTIME ERROR:',e.message)});
  page.on('requestfailed',r=>{if(/openfreemap|maptiler/i.test(r.url()))console.log('MAP REQUEST FAILED:',r.url(),r.failure()?.errorText)});
  page.on('response',r=>{if(!r.ok()&&/openfreemap|maptiler/i.test(r.url())){mapHttpErrors.push({status:r.status(),url:r.url()});console.log('MAP HTTP ERROR:',r.status(),r.url())}});
  page.on('console',m=>{if(m.type()==='error'&&/style|map|tile|gl|fetch|network/i.test(m.text()))console.log('MAP BROWSER ERROR:',m.text().slice(0,450))});
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('phivos-onboarding-v1','1');
      // A previous OpenFreeMap selection must not survive the provider migration.
      localStorage.setItem('oriel-basemap-style-v1','bright');
      localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify({
        region:'London',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'
      }));
    });
    // Mock the postcode service so the regression verifies all batches without
    // relying on external geocoder availability or consuming a provider quota.
    await page.route('https://api.postcodes.io/**',async route=>{
      geocodeRequests++;
      const url=new URL(route.request().url());
      const point=code=>{
        let hash=7;
        for(const ch of String(code))hash=(hash*31+ch.charCodeAt(0))>>>0;
        return {latitude:50+(hash%6500)/1000,longitude:-5.8+((hash*17)%8000)/1000};
      };
      if(url.pathname==='/postcodes'&&route.request().method()==='POST'){
        const body=JSON.parse(route.request().postData()||'{}');
        const result=(body.postcodes||[]).map(code=>({query:code,result:String(code).replace(/\s/g,'').toUpperCase()==='TN250LZ'?null:point(code)}));
        if((body.postcodes||[]).some(code=>String(code).replace(/\s/g,'').toUpperCase()==='TN250LZ'))console.log('MOCK TN25 EXACT POSTCODE REQUESTED');
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:200,result})});
      }else if(url.pathname.startsWith('/outcodes/')){
        const code=decodeURIComponent(url.pathname.split('/').pop());
        if(code==='TN25')console.log('MOCK TN25 OUTCODE REQUESTED');
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:200,result:point(code)})});
      }else await route.continue();
    });
    let fresh=false;
    for(let retry=0;retry<18;retry++){
      await page.goto(base+'?ui-smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:40000});
      if((await page.content()).includes('programme-preview.js?v=20261106fixed1')&&(await page.content()).includes('workspace-ux.js?v=20261108tube3')&&(await page.content()).includes('tube-stations.js?v=20261108tfl2')&&(await page.content()).includes('design-refresh.css?v=20261108editorial2')&&(await page.content()).includes('app.js?v=20261108editorial9')&&(await page.content()).includes('sector-map.js?v=20261108mapcoverage7')&&(await page.content()).includes('map-basemap.js?v=20261108editorial11')){fresh=true;break;}
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
    assert.match(scriptSrc,/app-product\.js\?v=20261108mapcoverage10$/,
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
    // A vector map must actually replace the OSM underlay. The old test
    // only checked the data-basemap label, allowing an invisible vector canvas
    // to pass while users still saw OpenStreetMap raster tiles.
    await page.waitForFunction(()=>{
      const holder=document.getElementById('placementMap');
      const state=holder?.dataset.basemap||'';
      if(state==='raster-fallback')return holder.querySelector('.leaflet-tile-loaded');
      return state==='vector-editorial-light'&&!holder.querySelector('.oriel-map-backup');
    },null,{timeout:30000});
    const editorialStyleForDesign=await page.evaluate(async()=>{
      const url=window.OrielBasemap?.styles?.['editorial-light'];
      const response=await fetch(url);
      if(!response.ok)throw Error('Could not inspect local Editorial Light style: HTTP '+response.status);
      return response.json();
    });
    const editorialRoadLayers=editorialStyleForDesign.layers.filter(layer=>layer.id.startsWith('Oriel editorial road'));
    assert.deepEqual(editorialRoadLayers.map(layer=>layer.id).sort(),['Oriel editorial road casing','Oriel editorial road surface'],
      'Editorial style is missing the designed road network');
    assert(editorialStyleForDesign.layers.some(layer=>layer.id==='Road labels'&&layer.minzoom<=13),
      'Editorial road names are not enabled at neighbourhood zoom');
    const mapTiles=await page.locator('#placementMap .leaflet-tile-loaded').count();
    const mainTileSources=await page.locator('#placementMap .leaflet-tile-loaded').evaluateAll(tiles=>tiles.map(img=>({
      url:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight,complete:img.complete
    })));
    const shownState=await page.locator('#placementMap').getAttribute('data-basemap');
    if(shownState==='vector-editorial-light'){
      assert.equal(mapTiles,0,'Old OSM raster tiles are still visible above Editorial Light');
      const vectorVisibility=await page.evaluate(()=>{
        const holder=document.getElementById('placementMap');
        const pane=holder.querySelector('.leaflet-orielVectorBasemap-pane');
        const canvas=pane?.querySelector('canvas.maplibregl-canvas');
        const attrib=holder.querySelector('.leaflet-control-attribution')?.innerText||'';
        return {
          panePresent:!!pane,canvasPresent:!!canvas,
          paneZIndex:pane?getComputedStyle(pane).zIndex:null,
          canvasWidth:canvas?.width||0,canvasHeight:canvas?.height||0,
          maptilerCredits:(attrib.match(/MapTiler/g)||[]).length,
          osmCredits:(attrib.match(/OpenStreetMap contributors/g)||[]).length,
          attribution:attrib
        };
      });
      console.log('CUSTOM MAP VISUAL DIAGNOSTIC:',JSON.stringify(vectorVisibility));
      assert(vectorVisibility.panePresent&&vectorVisibility.canvasPresent&&vectorVisibility.canvasWidth>50&&vectorVisibility.canvasHeight>50,
        'Vector map does not have a visible, sized canvas in the proper Leaflet pane');
      assert.equal(vectorVisibility.paneZIndex,'250','Vector basemap is not layered above fallback tiles');
      assert.equal(vectorVisibility.maptilerCredits,1,'MapTiler attribution is missing or duplicated');
      assert.equal(vectorVisibility.osmCredits,1,'OpenStreetMap attribution is missing or duplicated');
      assert.doesNotMatch(vectorVisibility.attribution,/\bLeaflet\b/,'Unnecessary Leaflet library prefix is still visible');
      await page.locator('#placementMap').screenshot({path:output+'/map-editorial.png'});
    }else{
      const fallbackAudit=mainTileSources.map(tile=>{
        let url;try{url=new URL(tile.url)}catch{}
        const path=url?.pathname||'';
        const validStyle=path.startsWith('/maps/streets-v4/256/')||path.startsWith('/maps/streets-v4-dark/256/');
        const numericTiles=path.split('/').slice(-3).every(part=>/^\\d+(?:\\.png)?$/.test(part));
        return {...tile,hostOK:url?.hostname==='api.maptiler.com',pathOK:validStyle&&numericTiles&&path.endsWith('.png'),
          imageOK:tile.complete&&tile.width>100&&tile.height>100};
      });
      const badFallbackTiles=fallbackAudit.filter(tile=>!tile.hostOK||!tile.pathOK||!tile.imageOK);
      assert(fallbackAudit.length>0&&badFallbackTiles.length===0,
        'MapTiler raster fallback tiles failed validation: '+JSON.stringify({count:fallbackAudit.length,bad:badFallbackTiles,all:fallbackAudit}));
    }
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
    assert.equal(await mapPicker.locator('option[value="editorial-light"]').count(),1,'Editorial Light map option missing');
    assert.equal(await mapPicker.locator('option[value="editorial-dark"]').count(),1,'Editorial Dark map option missing');
    if(vectorDiagnostic.adapterPresent&&vectorDiagnostic.webglSupported){
      assert(await mapPicker.isEnabled(),'Vector styles should be selectable when WebGL is supported');
      assert.equal(await page.evaluate(()=>window.OrielBasemap?.preference),'auto','A legacy basemap preference should migrate to the custom default');
      const styleOriginAudit=await page.evaluate(()=>({origin:window.location.origin,styles:Object.fromEntries(Object.entries(window.OrielBasemap.styles).map(([name,url])=>[name,new URL(url).origin]))}));
      assert(Object.values(styleOriginAudit.styles).every(origin=>origin===styleOriginAudit.origin),'Editorial styles should be hosted with the app: '+JSON.stringify(styleOriginAudit));
      for(const styleName of ['editorial-light','editorial-dark']){
        await mapPicker.selectOption(styleName);
        await page.waitForFunction(name=>document.getElementById('placementMap')?.dataset.basemap==='vector-'+name,styleName,{timeout:30000});
        const attribution=await page.locator('#placementMap .leaflet-control-attribution').innerText();
        assert.match(attribution,/MapTiler/,'MapTiler attribution missing for '+styleName);
        assert.match(attribution,/OpenStreetMap contributors/,'Required OSM attribution missing for '+styleName);
        assert.doesNotMatch(attribution,/\bLeaflet\b/,'Unnecessary Leaflet prefix returned for '+styleName);
        const styleAudit=await page.evaluate(async name=>{
          const response=await fetch(window.OrielBasemap.styles[name]);
          const style=await response.json();
          const source=style.sources?.maptiler_planet_v4;
          const casing=style.layers.find(layer=>layer.id==='Oriel editorial road casing');
          const surface=style.layers.find(layer=>layer.id==='Oriel editorial road surface');
          return {sourceHost:new URL(source?.url||'https://invalid').hostname,
            roads:style.layers.filter(layer=>layer.id.startsWith('Oriel editorial road')).length,
            casingZoomIsTopLevel:Array.isArray(casing?.paint?.['line-width'])&&casing.paint['line-width'][0]==='interpolate'&&casing.paint['line-width'][2]?.[0]==='zoom',
            surfaceZoomIsTopLevel:Array.isArray(surface?.paint?.['line-width'])&&surface.paint['line-width'][0]==='interpolate'&&surface.paint['line-width'][2]?.[0]==='zoom',
            roadMinZoom:Math.max(casing?.minzoom??0,surface?.minzoom??0),
            sprites:(style.sprite||[]).map(sprite=>sprite.id),
            backgroundColor:style.layers.find(layer=>layer.id==='Background')?.paint?.['background-color'],
            bridgeRoadsIncluded:JSON.stringify(casing?.filter||[]).includes('"tunnel"')&&!JSON.stringify(casing?.filter||[]).includes('"bridge"'),
            boroughSource:style.sources?.oriel_borough_labels?.type,
            boroughData:style.sources?.oriel_borough_labels?.data,
            boroughLayer:style.layers.find(layer=>layer.id==='Oriel London borough labels')?.minzoom,
            boroughCityFilter:style.layers.find(layer=>layer.id==='City labels')?.filter,
            boroughCityDuplicatesRemoved:['London','Westminster','City of London'].every(name=>JSON.stringify(style.layers.find(layer=>layer.id==='City labels')?.filter||[]).includes(name)),
            subwayLayerVisible:style.layers.find(layer=>layer.id==='Subway station')?.layout?.visibility!=='none',
            roadLabelsMinZoom:style.layers.find(layer=>layer.id==='Road labels')?.minzoom};
        },styleName);
        assert.equal(styleAudit.sourceHost,'api.maptiler.com','The Editorial map is not using MapTiler vector data: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.roads,2,'The Editorial road casing/surface pair is incomplete: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.casingZoomIsTopLevel,true,'Road casing uses an invalid nested zoom expression: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.surfaceZoomIsTopLevel,true,'Road surface uses an invalid nested zoom expression: '+JSON.stringify(styleAudit));
        assert(styleAudit.roadMinZoom<=3,'Main roads are hidden at the national overview zoom: '+JSON.stringify(styleAudit));
        assert(!styleAudit.sprites.includes('subway'),'Unused MapTiler subway sprite is still requested despite the custom TfL roundels');
        assert.equal(styleAudit.backgroundColor,styleName==='editorial-light'?'#f7f3e9':'#1b2520','Light/dark map backgrounds do not match their intended palettes');
        assert.equal(styleAudit.bridgeRoadsIncluded,true,'Road bridges should remain visible above rivers: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.boroughSource,'geojson','Official London borough label source is missing: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.boroughLayer,8.5,'London borough names should appear from London-wide zoom: '+JSON.stringify(styleAudit));
        assert.equal(styleAudit.boroughCityDuplicatesRemoved,true,'Inner London city labels would duplicate the borough names: '+JSON.stringify(styleAudit));
        const boroughsResponse=await page.evaluate(async name=>{
          const style=await (await fetch(window.OrielBasemap.styles[name])).json();
          const source=style.sources.oriel_borough_labels;
          const url=new URL(source.data,window.OrielBasemap.styles[name]);
          const data=await (await fetch(url)).json();
          return {count:data.features?.length||0,names:(data.features||[]).map(f=>f.properties?.name)};
        },styleName);
        assert.equal(boroughsResponse.count,33,'All 32 boroughs and the City of London must have label anchors: '+JSON.stringify(boroughsResponse));
        for(const required of ['Camden','Islington','Kensington and Chelsea','Hammersmith and Fulham','Newham','Barnet','Haringey','Westminster','City of London']){
          assert(boroughsResponse.names.includes(required),'Missing London borough label: '+required);
        }
        assert.equal(styleAudit.subwayLayerVisible,false,'Generic subway markers would duplicate the TfL Underground roundels');
        assert(styleAudit.roadLabelsMinZoom<=11.5,'Road names are not visible at neighbourhood zoom');
      }
      await mapPicker.selectOption('auto');
      await page.waitForFunction(()=>window.OrielBasemap?.preference==='auto');
      assert.equal(await page.evaluate(()=>localStorage.getItem('oriel-basemap-style-v3')),'auto','Theme-aware style preference was not saved under v3');
      await page.waitForFunction(()=>document.getElementById('placementMap')?.dataset.basemap==='vector-editorial-light',null,{timeout:30000});
      await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
      await page.waitForFunction(()=>document.getElementById('placementMap')?.dataset.basemap==='vector-editorial-dark',null,{timeout:30000});
      await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
      await page.waitForFunction(()=>document.getElementById('placementMap')?.dataset.basemap==='vector-editorial-light',null,{timeout:30000});
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
      return holder&&holder.dataset.basemap==='vector-editorial-light'&&holder.dataset.miniStyle==='editorial-light'&&holder.dataset.miniStatus==='rendered'&&holder.querySelector('.leaflet-image-layer');
    },null,{timeout:30000});
    const miniDiagnostic=await card.locator('.uxMiniMap').evaluate(node=>({basemap:node.dataset.basemap,status:node.dataset.miniStatus,miniStyle:node.dataset.miniStyle,width:node.clientWidth,height:node.clientHeight,leafletReady:!!node._leaflet_id,images:node.querySelectorAll('.leaflet-image-layer').length}));
    console.log('MINI MAP RENDER DIAGNOSTIC:',JSON.stringify(miniDiagnostic));
    const miniBasemap=await card.locator('.uxMiniMap').evaluate(node=>node.dataset.basemap||'unknown');
    const miniImage=await card.locator('.uxMiniMap .leaflet-image-layer').evaluate(node=>({
      src:node.currentSrc||node.src,width:node.naturalWidth,height:node.naturalHeight,complete:node.complete,
      filter:getComputedStyle(node).filter
    }));
    assert.equal(miniBasemap,'vector-editorial-light','Programme mini-map is not using the custom Editorial vector style: '+miniBasemap);
    assert(miniImage.src.startsWith('data:image/png;base64,')&&miniImage.complete&&miniImage.width>100&&miniImage.height>60,
      'Mini map does not contain a rendered custom-style snapshot: '+JSON.stringify(miniImage));
    const miniAttribution=await card.locator('.uxMiniMap .leaflet-control-attribution').innerText();
    assert.match(miniAttribution,/MapTiler/,'Mini-map MapTiler attribution is missing');
    assert.match(miniAttribution,/OpenStreetMap contributors/,'Mini-map required OSM attribution is missing');
    assert.doesNotMatch(miniAttribution,/\bLeaflet\b/,'Unnecessary Leaflet prefix remains visible on the mini-map');
    assert.equal(miniImage.filter,'none','Mini-map snapshot is being tinted away from the custom map palette');
    assert.equal(mapHttpErrors.filter(x=>x.status===403).length,0,
      'MapTiler returned a 403 Invalid key response: '+JSON.stringify(mapHttpErrors.filter(x=>x.status===403)));
    // Changing the main map style must re-render the existing mini-map too.
    await mapPicker.selectOption('editorial-dark');
    await page.waitForFunction(()=>{
      const holder=document.querySelector('#results .placement .uxMiniMap');
      const image=holder?.querySelector('.leaflet-image-layer');
      return holder?.dataset.basemap==='vector-editorial-dark'&&holder?.dataset.miniStyle==='editorial-dark'&&image?.src.startsWith('data:image/png;base64,');
    },null,{timeout:30000});
    const darkChoiceMiniImage=await card.locator('.uxMiniMap .leaflet-image-layer').getAttribute('src');
    assert.notEqual(darkChoiceMiniImage,miniImage.src,'Mini-map image did not change with the selected Editorial Dark style');
    await mapPicker.selectOption('auto');
    await page.waitForFunction(()=>{
      const holder=document.querySelector('#results .placement .uxMiniMap');
      const image=holder?.querySelector('.leaflet-image-layer');
      return holder?.dataset.basemap==='vector-editorial-light'&&holder?.dataset.miniStyle==='editorial-light'&&image?.src.startsWith('data:image/png;base64,');
    },null,{timeout:30000});
    // The same custom-style image must remain untinted in the dark interface.
    await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
    await page.waitForFunction(()=>{
      const main=document.getElementById('placementMap');
      const holder=document.querySelector('#results .placement .uxMiniMap');
      return main?.dataset.basemap==='vector-editorial-dark'&&
        holder?.dataset.basemap==='vector-editorial-dark'&&
        holder?.dataset.miniStyle==='editorial-dark'&&
        !!holder?.querySelector('.leaflet-image-layer');
    },null,{timeout:30000});
    const darkMini=await card.locator('.uxMiniMap').evaluate(node=>({
      basemap:node.dataset.basemap,
      miniStyle:node.dataset.miniStyle,
      filter:getComputedStyle(node.querySelector('.leaflet-image-layer')).filter
    }));
    assert.deepEqual(darkMini,{basemap:'vector-editorial-dark',miniStyle:'editorial-dark',filter:'none'},
      'Dark mode changed or tinted the custom MapTiler mini-map');
    await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
    await page.waitForFunction(()=>{
      const main=document.getElementById('placementMap');
      const holder=document.querySelector('#results .placement .uxMiniMap');
      return main?.dataset.basemap==='vector-editorial-light'&&
        holder?.dataset.basemap==='vector-editorial-light'&&
        holder?.dataset.miniStyle==='editorial-light'&&
        !!holder?.querySelector('.leaflet-image-layer');
    },null,{timeout:30000});
    assert.equal(mapHttpErrors.filter(x=>x.status===403).length,0,
      'MapTiler returned a 403 response during mini-map style changes: '+JSON.stringify(mapHttpErrors.filter(x=>x.status===403)));
    // The image overlay must not intercept the original mini-map click action.
    await page.evaluate(()=>{
      window.__openedMiniMapUrl=null;
      window.open=(url)=>{window.__openedMiniMapUrl=url;return null;};
    });
    await card.locator('.uxMiniMap').click({position:{x:20,y:20}});
    const openedMiniMapUrl=await page.evaluate(()=>window.__openedMiniMapUrl);
    assert(openedMiniMapUrl&&openedMiniMapUrl.includes('google.com/maps/search'),
      'Clicking the mini-map no longer opens the selected training site in Google Maps');
    const miniPins=await card.locator('.uxMiniMap .leaflet-interactive').count();
    assert(miniPins>0,'Programme mini map has no interactive site marker');
    const miniTubeMarkers=await card.locator('.uxMiniMap .oriel-tube-mini-marker').count();
    assert(miniTubeMarkers>=1,'London programme mini-map does not show nearby Underground stations');
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
        return state==='vector-editorial-light'||state==='raster-fallback';
      },null,{timeout:14000});
      const finalState=await page.locator('#placementMap').evaluate(el=>el.dataset.basemap);
      console.log('GPU BASEMAP:',finalState);
      assert(finalState==='vector-editorial-light'||finalState==='vector-editorial-dark'||finalState==='raster-fallback','WebGL map hung during initialisation');
    }
    assert(['vector-editorial-light','vector-editorial-dark','vector-loading','raster-fallback'].includes(browserBasemaps.main),
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
    // One All-regions action must finish the entire postcode/outcode backlog.
    await page.waitForFunction(()=>{
      const status=document.getElementById('mapStatus')?.textContent||'';
      const stats=window.OrielMapStats;
      const full=window.OrielMapCurrentBounds;
      return status.includes('location codes resolved')&&
        !status.includes('codes still need locating')&&
        !status.includes('no postcode/outcode in the source')&&
        stats?.scope==='all'&&stats.programmes===4064&&
        stats.programmesRepresented===4064&&stats.programmesWithAllSites===4064&&
        placementMap.getZoom()<=7.5&&full?.isValid?.()&&placementMap.getBounds().contains(full);
    },null,{timeout:90000});
    await sleep(450);
    const allRegionPins=await page.locator('#placementMap .leaflet-interactive').count();
    const allRegionStatus=await page.locator('#mapStatus').innerText();
    const locationCoverage=await page.evaluate(()=>{
      const list=placements.filter(matches);
      const codes=p=>{
        const exact=(p.postcodes||[]).map(pcKey);
        const preferred=exact.map(code=>{
          if(Array.isArray(geo[code]))return code;
          const outward=(code.match(/^[A-Z]{1,2}\d[A-Z\d]?/)||[])[0];
          const fallback=outward?'@OUTCODE:'+outward:null;
          return fallback&&Array.isArray(geo[fallback])?fallback:code;
        });
        return [...new Set([...preferred,...(p.outcodes||[]).map(oc=>'@OUTCODE:'+String(oc).toUpperCase())])];
      };
      const unique=[...new Set(list.flatMap(codes))];
      const missing=list.filter(p=>!codes(p).length||codes(p).some(code=>!Array.isArray(geo[code])));
      return {
        matching:list.length,
        programmesWithAllSitesMapped:list.length-missing.length,
        missingProgrammes:missing.length,
        uniqueLocationCodes:unique.length,
        unresolvedLocationCodes:unique.filter(code=>!Array.isArray(geo[code])).length,
        unresolvedCodes:unique.filter(code=>!Array.isArray(geo[code])),
        tn25Debug:(()=>{const p=list.find(p=>String(p.title).includes('TN25OLZ'));return {programme:p&&{id:p.id,title:p.title,postcodes:p.postcodes,outcodes:p.outcodes},exact:geo['TN250LZ'],outcode:geo['@OUTCODE:TN25'],keys:Object.keys(geo).filter(k=>k.includes('TN25'))};})(),
        missingDetails:missing.map(p=>({id:p.id,title:p.title,employer:p.employer,region:p.region,postcodes:p.postcodes,outcodes:p.outcodes,codes:codes(p)})),
        programmesWithoutLocationCodes:list.filter(p=>!codes(p).length).map(p=>({id:p.id,title:p.title,employer:p.employer,region:p.region,area:p.area})),
        partiallyMappedProgrammes:list.filter(p=>codes(p).some(code=>Array.isArray(geo[code]))&&codes(p).some(code=>!Array.isArray(geo[code]))).length
      };
    });
    const allMapView=await page.evaluate(()=>({
      zoom:placementMap.getZoom(),
      bounds:placementMap.getBounds().toBBoxString(),
      dataBounds:window.OrielMapCurrentBounds?.toBBoxString?.()||null,
      boundsContainAll:!!window.OrielMapCurrentBounds&&placementMap.getBounds().contains(window.OrielMapCurrentBounds),
      pins:mapLayer.getLayers().length,
      stats:window.OrielMapStats
    }));
    console.log('ALL-REGIONS LOCATION COVERAGE:',JSON.stringify(locationCoverage));
    console.log('ALL-REGIONS MAP VIEW:',JSON.stringify(allMapView));
    console.log('POSTCODE SERVICE MOCK REQUESTS:',geocodeRequests);
    assert(allRegionPins>=15,
      'England & Wales overview is too aggressively clustered or not fitted: '+allRegionPins+' ('+allRegionStatus+')');
    assert(allMapView.pins>=15,'The country map has too few visible cluster/location markers: '+JSON.stringify(allMapView));
    assert.equal(allMapView.stats.programmesRepresented,4064,'Not every programme is represented by a map marker or cluster');
    assert.equal(allMapView.stats.programmesWithAllSites,4064,'Not every programme has all of its training sites represented');
    assert(allMapView.stats.uniqueSites>=3000,'The map has lost distinct training locations: '+JSON.stringify(allMapView));
    assert.equal(allMapView.stats.unresolvedLocationCodes,0,'The map stats still report unresolved location codes');
    assert(allMapView.boundsContainAll,'The country map viewport does not contain the complete catalogue bounds: '+JSON.stringify(allMapView));
    assert(!await page.evaluate(()=>quick.has('london')||document.getElementById('region').value==='London'),
      'The test did not actually enter England & Wales mode');
    assert.equal(locationCoverage.missingProgrammes,0,'Some matching programmes still have an unmapped site: '+JSON.stringify(locationCoverage));
    assert.equal(locationCoverage.unresolvedLocationCodes,0,'Some postcode/outcode codes remain unresolved: '+JSON.stringify(locationCoverage));
    assert.equal(locationCoverage.programmesWithoutLocationCodes.length,0,'Some programmes have no usable location code: '+JSON.stringify(locationCoverage.programmesWithoutLocationCodes));
    assert(await page.evaluate(()=>Array.isArray(geo['@OUTCODE:TN25'])),'A postcode with no exact match did not fall back to its postcode-district centre');
    assert(geocodeRequests>0,'The all-regions action did not call the location resolver');

    await page.locator('#placementMap').screenshot({path:output+'/map-all-programmes.png'});
    await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],9.5,{animate:false}));
    await sleep(900);
    await page.locator('#placementMap').screenshot({path:output+'/map-london-boroughs.png'});
    await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],12.5,{animate:false}));
    await sleep(1100);
    await page.locator('#placementMap').screenshot({path:output+'/map-london-neighbourhood.png'});
    await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],9.5,{animate:false}));
    await sleep(700);
    // Exercise shared-location grouping in Matching results mode so the
    // synthetic fixtures are not intentionally overridden by the All programmes scope.
    await page.locator('#mapScope').selectOption('matching');
    await page.waitForFunction(()=>window.OrielMapScope==='matching');
    const groupPinCheck=await page.evaluate(()=>{
      const sample=placements.find(p=>(p.postcodes||[]).some(pc=>Array.isArray(geo[pcKey(pc)])));
      if(!sample)return null;
      const postcode=sample.postcodes.find(pc=>Array.isArray(geo[pcKey(pc)]));
      const synthetic=[0,1,2].map(i=>({...sample,id:'__group-pin-test-'+i,title:'Shared-site test '+(i+1),postcodes:[postcode],outcodes:[]}));
      drawMap(synthetic);
      const marker=document.querySelector('#placementMap .oriel-group-marker');
      const count=Number(marker?.dataset.programmeCount||marker?.querySelector('.oriel-group-count')?.dataset.programmeCount||0);
      marker?.click();
      const expanded=document.querySelectorAll('#mapSelection .placement').length;
      drawMap(placements.filter(matches));
      return {count,expanded};
    });
    assert.deepEqual(groupPinCheck,{count:3,expanded:3},'Shared-location pins do not expand to every programme');
    await page.locator('#mapScope').selectOption('all');
    await page.waitForFunction(()=>window.OrielMapScope==='all');

    // Reproduce a persisted failed postcode lookup: null must be retried and
    // its outcode centroid must be used instead of silently marking it done.
    await page.evaluate(()=>{
      geo['TN250LZ']=null;
      delete geo['@OUTCODE:TN25'];
      try{localStorage.setItem('phivos-geo-v1',JSON.stringify(geo))}catch{}
    });
    const mapScope=page.locator('#mapScope');
    assert.equal(await mapScope.inputValue(),'all','The map should show the complete catalogue by default');
    await mapScope.selectOption('matching');
    await page.locator('#locateBtn').click();
    assert.equal(await mapScope.inputValue(),'all','Locate all sites should switch the map to the complete catalogue');
    await page.waitForFunction(()=>{
      const status=document.getElementById('mapStatus')?.textContent||'';
      return window.OrielMapScope==='all'&&status.includes('location codes resolved')&&!status.includes('codes still need locating');
    },null,{timeout:90000});
    const allCatalogueCoverage=await page.evaluate(()=>{
      const codes=p=>{
        const exact=(p.postcodes||[]).map(pcKey);
        const preferred=exact.map(code=>{
          if(Array.isArray(geo[code]))return code;
          const outward=(code.match(/^[A-Z]{1,2}\d[A-Z\d]?/)||[])[0];
          const fallback=outward?'@OUTCODE:'+outward:null;
          return fallback&&Array.isArray(geo[fallback])?fallback:code;
        });
        return [...new Set([...preferred,...(p.outcodes||[]).map(oc=>'@OUTCODE:'+String(oc).toUpperCase())])];
      };
      const missing=placements.filter(p=>!codes(p).length||codes(p).some(code=>!Array.isArray(geo[code])));
      return {count:placements.length,missing:missing.length,missingDetails:missing.map(p=>({id:p.id,title:p.title,postcodes:p.postcodes,outcodes:p.outcodes})),
        status:document.getElementById('mapStatus')?.textContent||'',title:document.getElementById('mapStatus')?.title||'',
        fallback:geo['@OUTCODE:TN25']};
    });
    assert.equal(allCatalogueCoverage.count,4064,'All-programmes map scope must use the complete catalogue');
    assert.equal(allCatalogueCoverage.missing,0,'All-programmes map scope still has unmapped sites: '+JSON.stringify(allCatalogueCoverage));
    assert.match(allCatalogueCoverage.status,/4,064 of 4,064 programmes have all listed sites mapped/,'All-catalogue map status does not report complete coverage');
    assert.match(allCatalogueCoverage.title,/entire programme catalogue/,'All-catalogue map does not explain that filters are bypassed');
    assert(Array.isArray(allCatalogueCoverage.fallback),'A persisted null postcode was not retried and resolved via its outcode');
    await mapScope.selectOption('matching');
    await page.waitForFunction(()=>window.OrielMapScope==='matching'&&document.getElementById('mapStatus')?.title.includes('current filters'));

    // Underground roundels are a distinct layer, revealed at neighbourhood zoom.
    await page.waitForFunction(()=>Array.isArray(window.ORIEL_TUBE_STATIONS)&&window.ORIEL_TUBE_STATIONS.length>=250,null,{timeout:20000});
    const tubeDataCount=await page.evaluate(()=>window.ORIEL_TUBE_STATIONS.length);
    assert(tubeDataCount>=250,'TfL Underground station data did not load');
    await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],12,{animate:false}));
    await page.waitForFunction(()=>document.querySelectorAll('#placementMap .oriel-tube-marker').length>=250,null,{timeout:20000});
    const mainTubeCount=await page.locator('#placementMap .oriel-tube-marker').count();
    assert(mainTubeCount>=250,'The main map did not render the Underground station roundels');

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
