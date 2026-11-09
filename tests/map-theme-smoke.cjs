/* Browser regression for the placement maps, boxes, and responsive cards.
 * Run: npm i --no-save playwright && npx playwright install chromium
 *      node tests/map-theme-smoke.cjs
 * Uses a new unauthenticated context. Does not access actual applicant data.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TARGET || 'https://phivosmichailides.github.io/Oriel-Placement-Explorer/';
const localPreview = ['localhost','127.0.0.1','::1'].includes(new URL(base).hostname);
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
        region:'',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'
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
    const requiredAssets=[
      'programme-preview.js?v=20261106fixed1','workspace-ux.js?v=20261109fix2',
      'tube-stations.js?v=20261108tfl2','rail-stations.js?v=20261109national1','location-guides.js?v=20261109national1','design-refresh.css?v=20261109national2',
      'app.js?v=20261109fix2','sector-map.js?v=20261109fix2',
      'map-basemap.js?v=20261109fix3','generic-public.js?v=20261108atlas3',
      'map-focus.css?v=20261109fix3','session-ui.js?v=20261108filters3',
      'pwa.js?v=20261109national2'
    ];
    await page.goto(base+'?ui-smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:40000});
    let fresh=false;
    try{
      // app.js loads product/public/map scripts asynchronously after cloud bootstrap.
      // Poll the same document until those scripts actually appear; do not reload
      // repeatedly before the dynamic boot sequence has a chance to finish.
      await page.waitForFunction(required=>{
        const html=document.documentElement.outerHTML;
        return required.every(asset=>html.includes(asset));
      },requiredAssets,{timeout:90000});
      fresh=true;
    }catch(error){
      const bootState=await page.evaluate(()=>({
        readyState:document.readyState,
        online:navigator.onLine,
        cloudBootstrapped:window.__orielCloudBootstrapped===true,
        scripts:[...document.scripts].map(script=>script.getAttribute('src')).filter(Boolean),
        pageErrors:window.__placementAtlasPageErrors||[]
      }));
      throw new Error('Placement Atlas dynamic boot did not finish at '+page.url()+': '+JSON.stringify(bootState)+'; '+error.message);
    }
    assert(fresh,'Latest Placement Atlas build did not finish loading');
    await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker?.getRegistration();return !!registration?.active&&registration.active.scriptURL.includes('sw.js?v=20261109national2');},null,{timeout:30000});
    await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker?.getRegistration();return registration?.active?.state==='activated';},null,{timeout:30000});
    await page.waitForFunction(()=>Array.isArray(window.ORIEL_RAIL_STATIONS)&&window.ORIEL_RAIL_STATIONS.length>=2000,null,{timeout:20000});
    const pwaAudit=await page.evaluate(async()=>{
      const manifestLink=document.querySelector('link[rel="manifest"]');
      const faviconLink=document.querySelector('link[rel="icon"][type="image/svg+xml"]');
      if(!manifestLink||!faviconLink)throw Error('Manifest or SVG favicon link is missing');
      const registration=await navigator.serviceWorker.ready;
      return {title:document.title,manifestHref:manifestLink.href,faviconHref:faviconLink.href,
        swScope:registration?.scope||null,swState:registration?.active?.state||null,
        swScriptURL:registration?.active?.scriptURL||null,
        installButtonVisible:!!document.getElementById('installAppBtn')&&!document.getElementById('installAppBtn').hidden,
        expectedScope:new URL('./',location.href).href};
    });
    const manifestResponse=await page.request.get(pwaAudit.manifestHref,{headers:{'cache-control':'no-cache'}});
    assert(manifestResponse.ok(),'Manifest returned HTTP '+manifestResponse.status());
    const manifest=await manifestResponse.json();
    const icons=await Promise.all(manifest.icons.map(async icon=>{
      const response=await page.request.get(new URL(icon.src,pwaAudit.manifestHref).toString(),{headers:{'cache-control':'no-cache'}});
      const body=await response.body();
      const contentType=response.headers()['content-type']||'';
      return {sizes:icon.sizes,ok:response.ok(),type:contentType.split(';')[0],bytes:body.length};
    }));
    const faviconResponse=await page.request.get(pwaAudit.faviconHref,{headers:{'cache-control':'no-cache'}});
    const favicon=await faviconResponse.text();
    Object.assign(pwaAudit,{manifestName:manifest.name,shortName:manifest.short_name,display:manifest.display,
      icons,faviconOk:faviconResponse.ok(),faviconCross:favicon.includes('M22.4 4.8')});
    assert.equal(pwaAudit.title,'Placement Atlas','Browser tab title is not branded Placement Atlas');
    assert.equal(pwaAudit.manifestName,'Placement Atlas','PWA app name is not Placement Atlas');
    assert.equal(pwaAudit.shortName,'Placement Atlas','PWA short name is not Placement Atlas');
    assert.equal(pwaAudit.display,'standalone','PWA is not configured for standalone app display');
    assert(pwaAudit.faviconOk&&pwaAudit.faviconCross,'Tab favicon is not the matching pharmacy cross');
    assert(pwaAudit.icons.length>=2&&pwaAudit.icons.every(icon=>icon.ok&&icon.type==='image/png'&&icon.bytes>500),
      'One or more PWA PNG icons are missing or invalid: '+JSON.stringify(pwaAudit.icons));
    assert.equal(pwaAudit.swScope,pwaAudit.expectedScope,'Service worker scope does not match the Placement Atlas app path');
    assert(pwaAudit.swState==='activated'||pwaAudit.swState==='activating','Placement Atlas service worker is not active: '+JSON.stringify(pwaAudit));
    assert.ok(pwaAudit.swScriptURL?.endsWith('/sw.js?v=20261109national2'),'Browser is still controlled by an outdated Placement Atlas service worker: '+pwaAudit.swScriptURL);
    const [pwaResponse,swResponse]=await Promise.all([
      page.request.get(new URL('pwa.js?v=20261109national2',page.url()).toString(),{headers:{'cache-control':'no-cache'}}),
      page.request.get(new URL('sw.js?v=20261109national2',page.url()).toString(),{headers:{'cache-control':'no-cache'}})
    ]);
    const [pwaSource,swSource]=await Promise.all([pwaResponse.text(),swResponse.text()]);
    const pwaUpdateAudit={
      pwaStatus:pwaResponse.status(),swStatus:swResponse.status(),
        controllerChange:pwaSource.includes('controllerchange'),
       reloadOnControllerChange:pwaSource.includes('window.location.reload()'),
        uncachedWorkerUpdate:pwaSource.includes("updateViaCache:'none'"),
        versionedCache:swSource.includes('placement-atlas-shell-2026-11-09-v25'),
        cachedPwaAsset:swSource.includes("pwa.js?v=20261109national2")};
    assert(pwaUpdateAudit.pwaStatus===200&&pwaUpdateAudit.swStatus===200&&pwaUpdateAudit.controllerChange&&pwaUpdateAudit.reloadOnControllerChange&&pwaUpdateAudit.uncachedWorkerUpdate&&pwaUpdateAudit.versionedCache&&pwaUpdateAudit.cachedPwaAsset,
      'Placement Atlas automatic update / cache invalidation checks failed: '+JSON.stringify(pwaUpdateAudit));
    console.log('PWA UPDATE AUDIT:',JSON.stringify(pwaUpdateAudit));
    const [lightStyleResponse,darkStyleResponse]=await Promise.all([
      page.request.get(new URL('map-styles/editorial-light.json?v=20261109roads3',page.url()).toString(),{headers:{'cache-control':'no-cache'}}),
      page.request.get(new URL('map-styles/editorial-dark.json?v=20261109roads3',page.url()).toString(),{headers:{'cache-control':'no-cache'}})
    ]);
    assert(lightStyleResponse.ok()&&darkStyleResponse.ok(),'One or both Placement Atlas map styles could not be loaded');
    const [lightStyle,darkStyle]=await Promise.all([lightStyleResponse.json(),darkStyleResponse.json()]);
    const styleAudit=[['light',lightStyle],['dark',darkStyle]].map(([name,style])=>({
      name,ferryLines:style.layers.filter(layer=>layer.id==='Ferry line'||(layer.type==='line'&&layer['source-layer']==='ferry')).length,
      waterFade:style.layers.find(layer=>layer.id==='Water')?.paint?.['fill-opacity'],
      nationalRoadWidth:style.layers.find(layer=>layer.id==='Oriel editorial road surface')?.paint?.['line-width'],
      roads:style.layers.some(layer=>layer.id==='Oriel editorial road surface'),
      rivers:style.layers.some(layer=>layer.id==='River')
    }));
    assert(styleAudit.every(style=>Array.isArray(style.waterFade)&&style.waterFade[3]===5.5&&style.waterFade[4]===0&&style.waterFade[5]===7&&style.waterFade[6]===1),
      'National-scale water fill should fade out cleanly before regional zoom: '+JSON.stringify(styleAudit));
    assert(styleAudit.every(style=>Array.isArray(style.nationalRoadWidth)&&style.nationalRoadWidth[0]==='interpolate'&&style.nationalRoadWidth.includes(4)&&style.nationalRoadWidth[style.nationalRoadWidth.indexOf(4)+1]>=1.9&&style.nationalRoadWidth.includes(5)&&style.nationalRoadWidth[style.nationalRoadWidth.indexOf(5)+1]>=2.3),
      'Road surfaces are still too thin at the effective national overview zoom: '+JSON.stringify(styleAudit));
    assert(styleAudit.every(style=>style.ferryLines===0&&style.roads&&style.rivers),
      'Map style should omit distracting ferry routes while preserving roads and rivers: '+JSON.stringify(styleAudit));
    console.log('MAP STYLE AUDIT:',JSON.stringify(styleAudit));
    assert(pwaAudit.installButtonVisible,'Placement Atlas install button should remain visible until the app is installed.');
    console.log('PWA/BRANDING AUDIT:',JSON.stringify(pwaAudit));
    await page.locator('#results .placement').first().waitFor({state:'attached',timeout:70000});
    await page.waitForFunction(()=>window.OrielMapStats?.programmes===placements.length&&placementMap?.getZoom()>=10,null,{timeout:30000});
    const initialMapView=await page.evaluate(()=>({center:placementMap.getCenter(),zoom:placementMap.getZoom()}));
    assert(initialMapView.zoom>=10&&initialMapView.zoom<=11.5&&Math.abs(initialMapView.center.lat-51.5074)<.15&&Math.abs(initialMapView.center.lng+.1278)<.2,
      'The map should open on a useful London-wide view instead of automatically fitting England & Wales: '+JSON.stringify(initialMapView));
    await page.locator('#placementMap').screenshot({path:output+'/map-initial-london.png'});
    // Verify both the actual runtime script and the final rendered footer.
    const productScript=await page.waitForFunction(()=>{
      const script=[...document.scripts].find(el=>el.src.includes('/app-product.js'));
      return script?.src||null;
    },null,{timeout:12000});
    const scriptSrc=await productScript.jsonValue();
    assert.match(scriptSrc,/app-product\.js\?v=20261109fix1$/,
      'Browser loaded an outdated product script');
    const footer=await page.locator('.app-footer').innerText();
    assert.match(footer,/^Placement Atlas · Pharmacy Foundation Programme catalogue:/,
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
    assert.equal(await page.locator('#decision').inputValue(),'all','Fresh Explore should start with all decision states included');
    assert.equal(await page.locator('#region').inputValue(),'','Fresh Explore should not apply a region filter by default');
    assert.equal(await page.evaluate(()=>quick.size),0,'Fresh Explore should not apply hidden quick filters by default');
    assert.equal(await page.locator('#mapScope').count(),0,'Map scope should no longer be independently selectable');
    assert.match(await page.locator('#count').innerText(),/4,064 total programmes · 4,064 shown/,'Results should show both the catalogue total and current matching count');
    assert.match(await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href'),/favicon\.svg/,'Placement Atlas favicon is missing');
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
      return (['localhost','127.0.0.1','::1'].includes(location.hostname)&&state==='osm-fallback'&&holder.querySelector('.leaflet-tile-loaded'))||
         (state==='vector-editorial-light'&&!holder.querySelector('.oriel-map-backup'));
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
    const allowsMissingBrunnel = layer => {
      const alternatives=layer.filter?.[2];
      return Array.isArray(alternatives)&&alternatives[0]==='any'&&
        alternatives.some(rule=>JSON.stringify(rule)==='["!",["has","brunnel"]]')&&
        alternatives.some(rule=>JSON.stringify(rule)==='["==",["get","brunnel"],null]')&&
        alternatives.some(rule=>JSON.stringify(rule)==='["!=",["get","brunnel"],"tunnel"]');
    };
    assert(editorialRoadLayers.every(allowsMissingBrunnel),
      'Editorial road layers must include ordinary roads with missing/null brunnel properties while excluding tunnels');
    assert(editorialStyleForDesign.layers.some(layer=>layer.id==='Road labels'&&layer.minzoom<=13),
      'Editorial road names are not enabled at neighbourhood zoom');
    assert.equal(editorialStyleForDesign.layers.filter(layer=>layer.type==='fill-extrusion').length,0,
      'Editorial Light should not render 3D building extrusions');
    const designCoverage=await page.evaluate(async editorialStyleForDesign=>{
      const darkResponse=await fetch(window.OrielBasemap.styles['editorial-dark']);
      const boroughResponse=await fetch(new URL('data/london-borough-labels.geojson',location.href));
      if(!darkResponse.ok||!boroughResponse.ok)throw Error('Could not load dark map style or London borough labels');
      const dark=await darkResponse.json(),boroughs=await boroughResponse.json();
      const airportSummary=style=>Object.fromEntries(['Airport zone','Aeroway','Airport labels'].map(id=>[id,style.layers.find(layer=>layer.id===id)?.minzoom??null]));
      return {darkAirportMinZoom:airportSummary(dark),lightAirportMinZoom:airportSummary(editorialStyleForDesign),
        boroughCount:boroughs.features?.length||0,
        boroughNames:(boroughs.features||[]).map(feature=>feature.properties?.name).sort(),
        boroughLayer:editorialStyleForDesign.layers.find(layer=>layer.id==='Oriel London borough labels'),
        darkRoadFilters:dark.layers.filter(layer=>layer.id.startsWith('Oriel editorial road')).map(layer=>({filter:layer.filter}))};
    },editorialStyleForDesign);
    assert(designCoverage.darkRoadFilters.length===2&&designCoverage.darkRoadFilters.every(allowsMissingBrunnel),
      'Editorial Dark road layers must include ordinary roads with missing/null brunnel properties while excluding tunnels');
    for(const [theme,levels] of Object.entries({light:designCoverage.lightAirportMinZoom,dark:designCoverage.darkAirportMinZoom})){
      assert(levels['Airport zone']>=11&&levels.Aeroway>=12&&levels['Airport labels']>=12,
        theme+' map shows distracting airport POIs too early: '+JSON.stringify(levels));
    }
    assert.equal(designCoverage.boroughCount,33,'London borough label data must include all 32 boroughs and the City of London');
    for(const borough of ['Barnet','Camden','Haringey','Hammersmith and Fulham','Islington','Kensington and Chelsea','Newham','Westminster','City of London']){
      assert(designCoverage.boroughNames.includes(borough),'Missing London borough label: '+borough);
    }
    assert.equal(designCoverage.boroughLayer?.source,'oriel_borough_labels','The full London borough label layer is not attached to the map style');
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
      },editorialStyleForDesign);
      console.log('CUSTOM MAP VISUAL DIAGNOSTIC:',JSON.stringify(vectorVisibility));
      assert(vectorVisibility.panePresent&&vectorVisibility.canvasPresent&&vectorVisibility.canvasWidth>50&&vectorVisibility.canvasHeight>50,
        'Vector map does not have a visible, sized canvas in the proper Leaflet pane');
      assert.equal(vectorVisibility.paneZIndex,'250','Vector basemap is not layered above fallback tiles');
      assert.equal(vectorVisibility.maptilerCredits,1,'MapTiler attribution is missing or duplicated');
      assert.equal(vectorVisibility.osmCredits,1,'OpenStreetMap attribution is missing or duplicated');
      assert.doesNotMatch(vectorVisibility.attribution,/\bLeaflet\b/,'Unnecessary Leaflet library prefix is still visible');
      await page.locator('#placementMap').screenshot({path:output+'/map-editorial.png'});
    }else if(localPreview&&shownState==='osm-fallback'){
      assert(mapTiles>0,'Local-preview fallback has no rendered base-map tiles');
      assert(mainTileSources.every(tile=>{try{return new URL(tile.url).hostname==='tile.openstreetmap.org'&&tile.width>100&&tile.height>100}catch{return false}}),
        'Local-preview OSM fallback tiles are missing or malformed: '+JSON.stringify(mainTileSources.slice(0,4)));
    }else{
      const fallbackAudit=mainTileSources.map(tile=>{
        let url;try{url=new URL(tile.url)}catch{}
        const path=url?.pathname||'';
        const validStyle=path.startsWith('/maps/streets-v4/256/')||path.startsWith('/maps/streets-v4-dark/256/');
        const numericTiles=path.split('/').slice(-3).every(part=>/^\d+(?:\.png)?$/.test(part));
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
      basemapReason:document.getElementById('placementMap')?.dataset.basemapReason||null,
      mapStyleStatus:document.getElementById('mapStyleStatus')?.textContent||null,
      canvasCount:document.querySelectorAll('#placementMap canvas.maplibregl-canvas').length,
      rasterTileCount:document.querySelectorAll('#placementMap img.leaflet-tile-loaded').length
    }));
    console.log('PLACEMENT MAP VECTOR DIAGNOSTIC:',JSON.stringify({...vectorDiagnostic,mapHttpErrors,consoleErrors:errors}));
    if(vectorDiagnostic.basemapStatus.startsWith('vector-')){
      await page.waitForFunction(()=>placementMap?._orielBasemapRecord?.map?.isStyleLoaded(),null,{timeout:20000});
      const nationalRoadDataAudit=await page.evaluate(()=>{
        const gl=placementMap?._orielBasemapRecord?.map;
        if(!gl)return {available:false};
        const style=gl.getStyle(),source='maptiler_planet_v4';
        const sourceLayers=['road','transportation','transportation_name'];
        const sourceFeatures=gl.querySourceFeatures(source,{sourceLayer:'road'});
        const sourceCounts=Object.fromEntries(sourceLayers.map(name=>[name,gl.querySourceFeatures(source,{sourceLayer:name}).length]));
        const classes=items=>items.reduce((counts,item)=>{const key=item.properties?.class||'none';counts[key]=(counts[key]||0)+1;return counts;},{});
        const roadLayers=style.layers.filter(layer=>layer.source===source&&layer.type==='line'&&/road/i.test(layer.id)&&layer.layout?.visibility!=='none');
        const visible=gl.queryRenderedFeatures(undefined,{layers:roadLayers.map(layer=>layer.id)});
        const custom=gl.queryRenderedFeatures(undefined,{layers:['Oriel editorial road surface']});
        const uniqueVisible=new Set(visible.map(feature=>feature.id!=null?String(feature.id):JSON.stringify([feature.sourceLayer,feature.properties?.class,feature.properties?.iso_a2,feature.properties?.layer]))).size;
        return {available:true,zoom:gl.getZoom(),sourceCounts,sourceRoadClasses:classes(sourceFeatures),roadLayerCount:roadLayers.length,
          renderedRoadLayerHits:visible.length,uniqueRenderedRoadFeatures:uniqueVisible,customRoadFeatures:custom.length,customRoadClasses:classes(custom),
          sample:visible.slice(0,3).map(feature=>({id:feature.id,layer:feature.layer.id,sourceLayer:feature.sourceLayer,geometry:feature.geometry?.type,properties:feature.properties}))};
      });
      console.log('NATIONAL ROAD SOURCE AUDIT:',JSON.stringify(nationalRoadDataAudit));
      console.log('NATIONAL ROAD FEATURE COUNTS:',JSON.stringify({unique:nationalRoadDataAudit.uniqueRenderedRoadFeatures,custom:nationalRoadDataAudit.customRoadFeatures,classes:nationalRoadDataAudit.customRoadClasses}));
    }
    if(vectorDiagnostic.adapterPresent&&vectorDiagnostic.webglSupported){
      await page.waitForFunction(()=>{
        const value=document.getElementById('placementMap')?.dataset.basemap||'';
        return value.startsWith('vector-')&&value!=='vector-loading';
      },null,{timeout:35000}).catch(()=>{
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
            roadLabelsMinZoom:style.layers.find(layer=>layer.id==='Road labels')?.minzoom,
             fillExtrusionLayers:style.layers.filter(layer=>layer.type==='fill-extrusion').map(layer=>layer.id)};
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
         assert.deepEqual(styleAudit.fillExtrusionLayers,[],'Editorial style still contains unnecessary 3D building layers');
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
      assert(await mapPicker.isDisabled(),'Map style selector should explain unavailable vector rendering');
      assert(await page.locator('#mapStyleStatus').isVisible(),'Fallback explanation is missing');
      const actualFallback=await page.locator('#placementMap').getAttribute('data-basemap');
      assert(localPreview?['osm-fallback','raster-fallback'].includes(actualFallback):actualFallback==='raster-fallback',
        'Unexpected basemap fallback state: '+actualFallback);
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
      const vector=holder?.dataset.basemap==='vector-editorial-light'&&holder.dataset.miniStyle==='editorial-light'&&holder.dataset.miniStatus==='rendered'&&holder.querySelector('.leaflet-image-layer');
      const fallback=holder?.dataset.basemap==='osm-fallback'||holder?.dataset.basemap==='raster-fallback';
      return vector||(fallback&&holder.querySelector('.leaflet-tile-loaded'));
    },null,{timeout:30000});
    const miniDiagnostic=await card.locator('.uxMiniMap').evaluate(node=>({basemap:node.dataset.basemap,status:node.dataset.miniStatus,miniStyle:node.dataset.miniStyle,width:node.clientWidth,height:node.clientHeight,leafletReady:!!node._leaflet_id,images:node.querySelectorAll('.leaflet-image-layer').length}));
    console.log('MINI MAP RENDER DIAGNOSTIC:',JSON.stringify(miniDiagnostic));
    const miniBasemap=await card.locator('.uxMiniMap').evaluate(node=>node.dataset.basemap||'unknown');
    const miniImage=await card.locator('.uxMiniMap').evaluate(holder=>{
      const node=holder.querySelector('.leaflet-image-layer')||holder.querySelector('.leaflet-tile-loaded');
      return {src:node?.currentSrc||node?.src||'',width:node?.naturalWidth||0,height:node?.naturalHeight||0,complete:!!node?.complete,
        filter:node?getComputedStyle(node).filter:null};
    });
    const miniUsesVector=miniBasemap.startsWith('vector-');
    if(miniUsesVector)assert(miniImage.src.startsWith('data:image/png;base64,')&&miniImage.complete&&miniImage.width>100&&miniImage.height>60,
      'Mini map does not contain a rendered custom-style snapshot: '+JSON.stringify(miniImage));
    else assert(miniImage.src.startsWith('https://')&&miniImage.complete&&miniImage.width>100&&miniImage.height>60,
      'Mini map has no visible fallback tile image: '+JSON.stringify(miniImage));
    const miniAttribution=await card.locator('.uxMiniMap .leaflet-control-attribution').innerText();
    if(miniUsesVector||miniBasemap==='raster-fallback')assert.match(miniAttribution,/MapTiler/,'Mini-map MapTiler attribution is missing');
    assert.match(miniAttribution,/OpenStreetMap contributors/,'Mini-map required OSM attribution is missing');
    assert.doesNotMatch(miniAttribution,/\bLeaflet\b/,'Unnecessary Leaflet prefix remains visible on the mini-map');
    if(miniUsesVector)assert.equal(miniImage.filter,'none','Mini-map snapshot is being tinted away from the custom map palette');
    if(miniUsesVector||miniBasemap==='raster-fallback')assert.equal(mapHttpErrors.filter(x=>x.status===403).length,0,
      'MapTiler returned a 403 Invalid key response: '+JSON.stringify(mapHttpErrors.filter(x=>x.status===403)));
    // Changing the main map style must re-render the existing mini-map too.
    // Local PR previews use OSM fallback because the production MapTiler key is
    // intentionally origin-restricted; style switching is verified on production.
    if(miniUsesVector&&String(await page.locator('#placementMap').getAttribute('data-basemap')).startsWith('vector-')){
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
    if(!localPreview)assert.equal(mapHttpErrors.filter(x=>x.status===403).length,0,
      'MapTiler returned a 403 response during mini-map style changes: '+JSON.stringify(mapHttpErrors.filter(x=>x.status===403)));
    }
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
    await page.evaluate(()=>{
      window.OrielCommute.getJourney=async()=>{throw Error('No exact planner route for this postcode pair');};
      window.OrielCommuteProfile.save('NG1 5FS',{silent:true});
    });
    await page.waitForFunction(()=>/^Area connections/.test(document.querySelector('#results .placement .uxLocationCaption')?.textContent||''),null,{timeout:15000});
    const fallbackPanel=card.locator('.uxLocationPanel');
    assert(await fallbackPanel.locator('a').filter({hasText:'Directions from my postcode'}).isVisible(),
      'A failed live journey lookup did not retain the home-to-site directions link');
    assert(/google\.com\/maps\/dir/.test(await fallbackPanel.locator('.uxMapLinks a').first().getAttribute('href')||''),
      'Local station directions link is missing');
    assert.doesNotMatch(await fallbackPanel.innerText(),/Journey time unavailable|Transport corridor not verified/i,
      'A dead-end transport warning is still shown after a live planner failure');

    const initialProgrammeId=await page.locator('#results .placement').first().getAttribute('data-id');
    const outsideProgramme=await page.evaluate(()=>{
      const p=placements.find(item=>item.region!=='London'&&(item.postcodes||[]).length>0);
      return p?{id:p.id,title:p.title,region:p.region,postcode:p.postcodes[0]}:null;
    });
    assert(outsideProgramme,'The catalogue has no regional programme fixture for transport guidance');
    console.log('REGIONAL TRANSPORT TEST FIXTURE:',JSON.stringify(outsideProgramme));
    await page.evaluate(id=>{
      $('search').value=id;$('region').value='';$('decision').value='all';
      quick.clear();document.querySelectorAll('.chip[data-q]').forEach(el=>el.classList.remove('on'));
      persistFilters();explore();
    },outsideProgramme.id);
    await page.waitForFunction(id=>document.querySelector('#results .placement')?.dataset.id===id,outsideProgramme.id,{timeout:15000});
    await page.waitForFunction(()=>!!document.querySelector('#results .placement .uxLocationPanel'),null,{timeout:15000});
    const outsidePanel=page.locator('#results .placement').first().locator('.uxLocationPanel');
    const outsideCopy=await outsidePanel.innerText();
    assert.match(outsideCopy,/Area connections/,'A regional programme should show local area guidance, not a London commute estimate');
    assert.doesNotMatch(outsideCopy,/Convenient|Not Convenient|Journey time unavailable/,'A regional programme is still being judged against the applicant’s London commute');
    const homeDirections=outsidePanel.locator('a').filter({hasText:'Directions from my postcode'});
    const homeDirectionCount=await homeDirections.count();
    assert(homeDirectionCount===0||!(await homeDirections.first().isVisible()),
      'A non-London programme should not display a directions link from the applicant’s London postcode');
    const localDirections=outsidePanel.locator('.uxMapLinks a').first();
    assert(await localDirections.isVisible(),'A regional programme has no local station/town-centre directions link');
    assert.match(await localDirections.getAttribute('href')||'',/google\.com\/maps\/dir/,'Regional local directions link is not a working Google Maps route');
    console.log('REGIONAL TRANSPORT GUIDANCE AUDIT:',JSON.stringify(outsideProgramme));
    await page.evaluate(()=>{
      $('search').value='';$('region').value='';$('decision').value='all';
      quick.clear();document.querySelectorAll('.chip[data-q]').forEach(el=>el.classList.remove('on'));
      persistFilters();explore();
    });
    await page.waitForFunction(id=>document.querySelector('#results .placement')?.dataset.id===id,initialProgrammeId,{timeout:15000});


    const browserBasemaps=await page.evaluate(()=>({
      main:document.querySelector('#placementMap')?.dataset.basemap,
      mini:document.querySelector('#results .placement .uxMiniMap')?.dataset.basemap,
      maplibreLoaded:!!window.maplibregl,
      pluginLoaded:!!window.L?.maplibreGL,
      supported:(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}})(),
      cssFilter:getComputedStyle(document.querySelector('#placementMap .leaflet-tile-pane')).filter
    }));
    console.log('BASEMAP DIAGNOSTICS:',JSON.stringify(browserBasemaps));
    const roadRenderAudit=await page.evaluate(()=>{
      const renderer=placementMap?._orielBasemapRecord?.map,layers=renderer?.getStyle?.()?.layers||[],features=renderer?.queryRenderedFeatures?.()||[];
      return {mode:document.getElementById('placementMap')?.dataset.basemap||'',zoom:renderer?.getZoom?.()??null,
        casing:layers.some(layer=>layer.id==='atlas-road-casing'),surface:layers.some(layer=>layer.id==='atlas-road-surface'),
        renderedRoads:features.filter(feature=>feature.source==='maptiler_planet_v4'&&feature.sourceLayer==='road').length};
    });
    console.log('VECTOR ROAD RENDER AUDIT:',JSON.stringify(roadRenderAudit));
    if(roadRenderAudit.mode.startsWith('vector-'))assert(roadRenderAudit.casing&&roadRenderAudit.surface&&roadRenderAudit.renderedRoads>0,
      'Vector map was declared ready without visibly rendered road geometry: '+JSON.stringify(roadRenderAudit));
    const mapCacheAudit=await page.evaluate(async()=>{
      const assets=await caches.open('placement-atlas-map-assets-v1');
      const urls=[
        'https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.js',
        'https://cdn.jsdelivr.net/npm/maplibre-gl@5.0.0/dist/maplibre-gl.css',
        'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'
      ];
      return {
        cachedAssets:await Promise.all(urls.map(async url=>!!await assets.match(url,{ignoreVary:true}))),
        tilePaneBackground:getComputedStyle(document.querySelector('#placementMap .leaflet-tile-pane')).backgroundColor,
        railStations:window.ORIEL_RAIL_STATIONS?.length||0
      };
    });
    console.log('OFFLINE MAP CACHE AUDIT:',JSON.stringify(mapCacheAudit));
    assert(mapCacheAudit.cachedAssets.every(Boolean),'MapLibre runtime assets are not all in the offline cache: '+JSON.stringify(mapCacheAudit));
    assert(mapCacheAudit.railStations>=2000,'National station dataset did not load');
    assert.notEqual(mapCacheAudit.tilePaneBackground,'rgb(180, 204, 226)','Old pale-blue tile-pane background is still active');
    if(browserBasemaps.supported&&browserBasemaps.pluginLoaded){
      await page.waitForFunction(()=>{
        const state=document.querySelector('#placementMap')?.dataset.basemap;
        return state==='vector-editorial-light'||state==='raster-fallback'||(['localhost','127.0.0.1','::1'].includes(location.hostname)&&state==='osm-fallback');
      },null,{timeout:14000});
      const finalState=await page.locator('#placementMap').evaluate(el=>el.dataset.basemap);
      console.log('GPU BASEMAP:',finalState);
      assert(finalState==='vector-editorial-light'||finalState==='vector-editorial-dark'||finalState==='raster-fallback'||(localPreview&&finalState==='osm-fallback'),'WebGL map hung during initialisation');
      if(!localPreview&&browserBasemaps.supported&&browserBasemaps.pluginLoaded){
        assert(finalState==='vector-editorial-light'||finalState==='vector-editorial-dark',
          'The deployed online map did not use the full vector renderer: '+finalState);
      }
    }
    assert(['vector-editorial-light','vector-editorial-dark','vector-loading','raster-fallback',...(localPreview?['osm-fallback']:[])].includes(browserBasemaps.main),
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
        stats?.scope==='matching'&&stats.programmes===4064&&
        stats.programmesRepresented===4064&&stats.programmesWithAllSites===4064&&
        full?.isValid?.();
    },null,{timeout:90000});
    await page.locator('#fitMap').click();
    await page.waitForFunction(()=>placementMap.getZoom()<=7.5&&window.OrielMapCurrentBounds?.isValid?.()&&placementMap.getBounds().contains(window.OrielMapCurrentBounds),null,{timeout:20000});
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
    const retryProbe=await page.evaluate(()=>{
      const p=placements.find(item=>(item.postcodes||[]).length>0);
      if(!p)return null;
      const pc=String(p.postcodes[0]).toUpperCase().replace(/\s+/g,'');
      const outward=(pc.match(/^[A-Z]{1,2}\d[A-Z\d]?/)||[])[0];
      delete geo[pc];
      if(outward)delete geo['@OUTCODE:'+outward];
      try{localStorage.setItem('phivo-geo-v1',JSON.stringify(geo))}catch{}
      return pc;
    });
    assert(retryProbe,'Could not choose a postcode for the automatic online-retry test');
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await page.waitForFunction(pc=>{
      const point=geo[pc];
      return Array.isArray(point)&&point.length>=2&&Number.isFinite(Number(point[0]))&&Number.isFinite(Number(point[1]));
    },retryProbe,{timeout:15000});
    console.log('ONLINE LOCATION RETRY AUDIT:',retryProbe);
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
    // Exercise shared-location grouping. The map now always uses the same
    // filtered dataset as Explore, including synthetic test fixtures.
    const groupPinCheck=await page.evaluate(()=>{
      const sample=placements.find(p=>(p.postcodes||[]).some(pc=>Array.isArray(geo[pcKey(pc)])));
      if(!sample)return null;
      const postcode=sample.postcodes.find(pc=>Array.isArray(geo[pcKey(pc)]));
      const synthetic=[0,1,2].map(i=>({...sample,id:'__group-pin-test-'+i,title:'Shared-site test '+(i+1),postcodes:[postcode],outcodes:[]}));
      drawMap(synthetic);
      const marker=document.querySelector('#placementMap .oriel-group-marker');
      const count=Number(marker?.dataset.programmeCount||marker?.querySelector('.oriel-group-count')?.dataset.programmeCount||0);
      marker?.click();
      const expanded=document.querySelectorAll('.atlasProgrammePopup .atlasPopupProgramme').length;
      const hasOpenAction=!!document.querySelector('.atlasProgrammePopup [data-open]');
      drawMap(placements.filter(matches));
      return {count,expanded,hasOpenAction};
    });
    assert.deepEqual(groupPinCheck,{count:3,expanded:3,hasOpenAction:true},'Shared-location pins do not open a programme preview for every programme');

    // Reproduce a persisted failed postcode lookup: null must be retried and
    // its outcode centroid must be used instead of silently marking it done.
    await page.evaluate(()=>{
      geo['TN250LZ']=null;
      delete geo['@OUTCODE:TN25'];
      try{localStorage.setItem('phivos-geo-v1',JSON.stringify(geo))}catch{}
    });
    await page.locator('#locateBtn').click();
    await page.waitForFunction(()=>{
      const status=document.getElementById('mapStatus')?.textContent||'';
      return window.OrielMapScope==='matching'&&status.includes('location codes resolved')&&!status.includes('codes still need locating')&&(Array.isArray(geo['TN250LZ'])||Array.isArray(geo['@OUTCODE:TN25']));
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
    assert.match(allCatalogueCoverage.title,/current filters.*full catalogue is shown/,'Map does not explain that the complete catalogue is shown when no filters are active');
    assert(Array.isArray(allCatalogueCoverage.fallback),'A persisted null postcode was not retried and resolved via its outcode');
    await page.waitForFunction(()=>window.OrielMapScope==='matching'&&document.getElementById('mapStatus')?.title.includes('current filters'));

    // The custom controls must zoom the existing map and move that same map
    // instance into a spacious, reversible focus window.
    const zoomAudit=await page.evaluate(()=>{
      const map=document.getElementById('placementMap'),control=document.getElementById('atlasMapZoom');
      const m=map.getBoundingClientRect(),c=control.getBoundingClientRect(),e=document.getElementById('atlasMapExpand').getBoundingClientRect();
      const style=getComputedStyle(control);
      return {defaultControls:map.querySelectorAll('.leaflet-control-zoom').length,customVisible:!!control&&c.width>=38&&c.height>=70,
        flexDirection:style.flexDirection,rightOffset:Math.abs(c.right-e.right),expandGap:e.top-c.bottom,width:c.width,height:c.height,
        order:[...control.querySelectorAll('button')].map(button=>button.dataset.atlasZoom).join(',')};
    });
    assert.equal(zoomAudit.defaultControls,0,'The ugly default Leaflet zoom buttons are still visible');
    assert(zoomAudit.customVisible&&zoomAudit.flexDirection==='column'&&zoomAudit.rightOffset<=4&&zoomAudit.expandGap>=6&&zoomAudit.expandGap<=18&&zoomAudit.order==='in,out',
      'Rounded Placement Atlas zoom control should put + above − and sit vertically above fullscreen at the lower-right edge: '+JSON.stringify(zoomAudit));

    const zoomStart=await page.evaluate(()=>({zoom:placementMap.getZoom(),min:placementMap.getMinZoom(),max:placementMap.getMaxZoom()}));
    console.log('MAP ZOOM CONTROL BEFORE:',JSON.stringify(zoomStart));
    await page.locator('#atlasMapZoom [data-atlas-zoom="in"]').click();
    await page.waitForFunction(z=>placementMap.getZoom()>z,zoomStart.zoom,{timeout:8000});
    const zoomAfterIn=await page.evaluate(()=>placementMap.getZoom());
    await page.locator('#atlasMapZoom [data-atlas-zoom="out"]').click();
    await page.waitForFunction(z=>Math.abs(placementMap.getZoom()-z)<0.01,zoomStart.zoom,{timeout:8000});
    console.log('MAP ZOOM CONTROL AUDIT:',JSON.stringify({before:zoomStart.zoom,afterIn:zoomAfterIn,afterOut:await page.evaluate(()=>placementMap.getZoom())}));
    await page.evaluate(()=>placementMap.setView([0,0],15,{animate:false}));
    await page.waitForFunction(()=>{const hint=document.getElementById('atlasMapEmptyHint');return !!hint&&!hint.hidden;},null,{timeout:12000});
    assert.match(await page.locator('#atlasMapEmptyHint').innerText(),/No programme sites in this view/,
      'An empty close-up map should explain that there are no programme sites in the current viewport');
    await page.locator('#atlasMapEmptyHint [data-atlas-fit-view]').click();
    await page.waitForFunction(()=>document.getElementById('atlasMapEmptyHint')?.hidden===true,null,{timeout:12000});
    await page.locator('#atlasMapExpand').click();
    await page.waitForFunction(()=>!document.getElementById('atlasMapFocus')?.hidden);
    assert.equal(await page.locator('#atlasMapFocus .atlasMapFocusStage #placementMap').count(),1,'Expanded map should move the existing map rather than create a duplicate');
    await page.locator('#atlasMapFocusClose').click();
    await page.waitForFunction(()=>!!document.querySelector('.map-card #placementMap'));
    assert.equal(await page.locator('#atlasMapFocus .atlasMapFocusStage #placementMap').count(),0,'Closing the focus map should restore the original map position');

    // Underground roundels are a distinct layer, revealed at neighbourhood zoom.
    await page.waitForFunction(()=>Array.isArray(window.ORIEL_TUBE_STATIONS)&&window.ORIEL_TUBE_STATIONS.length>=250,null,{timeout:20000});
    const tubeDataCount=await page.evaluate(()=>window.ORIEL_TUBE_STATIONS.length);
    assert(tubeDataCount>=250,'TfL Underground station data did not load');
    await page.evaluate(()=>placementMap.setView([51.5074,-0.1278],12,{animate:false}));
    await page.waitForFunction(()=>document.querySelectorAll('#placementMap .oriel-tube-roundel').length>=1,null,{timeout:20000});
    const mainTubeCount=await page.locator('#placementMap .oriel-tube-roundel').count();
    assert(mainTubeCount>=1,'The London neighbourhood map did not render a visible Underground station roundel');

    await page.locator('[data-q="london"]').first().click();
    await page.waitForFunction(()=>{
      const expected=placements.filter(matches).length;
      const status=document.getElementById('count')?.textContent||'';
      return window.OrielMapStats?.programmes===expected&&status.includes(expected.toLocaleString('en-GB')+' shown');
    });
    const filteredView=await page.evaluate(()=>({matching:placements.filter(matches).length,map:window.OrielMapStats?.programmes,count:document.getElementById('count')?.textContent||'',quick:[...quick]}));
    assert(filteredView.matching<4064,'The London quick filter did not narrow the catalogue');
    assert.equal(filteredView.map,filteredView.matching,'Map markers are not using the same filtered programme set as the results list');
    assert.match(filteredView.count,/4,064 total programmes · \d+ shown/,'Filtered result count should retain the original catalogue total');
    assert(filteredView.quick.includes('london'),'The London quick filter did not remain active');
    const savedFilter=await page.evaluate(()=>JSON.parse(localStorage.getItem('phivos-desk-v2')||'{}').filters);
    assert(savedFilter?.quick?.includes('london'),'Temporary filters were not saved to the local workspace cache');
    await page.reload();
    try{
      await page.waitForFunction(()=>quick.has('london'),null,{timeout:30000});
    }catch(error){
      const restoreDebug=await page.evaluate(()=>({
        quick:[...quick],
        saved:JSON.parse(localStorage.getItem('phivos-desk-v2')||'{}').filters?.quick||null,
        sessionSaved:JSON.parse(sessionStorage.getItem('oriel-desk-last-view-v1')||'{}').filters?.quick||null,
        stateQuick:typeof state!=='undefined'?state.filters?.quick||null:null,
        resultCount:document.getElementById('count')?.textContent||'',
        mapProgrammes:window.OrielMapStats?.programmes??null,
        matching:placements.filter(matches).length
      }));
      throw Error('Saved quick filters were not restored after refresh: '+JSON.stringify(restoreDebug));
    }
    await page.waitForFunction(()=>window.OrielMapStats&&window.OrielMapStats.programmes===placements.filter(matches).length,null,{timeout:30000});
    assert.equal(await page.evaluate(()=>window.OrielMapStats.programmes),filteredView.matching,'The filtered map changed after refreshing the page');
    await page.locator('[data-q="london"]').first().click();
    await page.waitForFunction(()=>window.OrielMapStats?.programmes===4064,null,{timeout:30000});

    // Unknown site data and approximate matches must stay visible for review;
    // only exact verified postcode or borough matches may be excluded.
    const reviewRule=await page.evaluate(()=>{
      const previous=state.prefs.locationBlacklist;
      state.prefs.locationBlacklist=[{id:'test-review-area',kind:'district',district:'Imaginary Borough',label:'Imaginary Borough'}];
      const testProgramme={id:'__unverified-location-test',title:'Unknown training site',postcodes:['ZZ99 9ZZ'],outcodes:[]};
      const assessment=OrielGeoBlacklist.assess(testProgramme);
      const hidden=OrielGeoBlacklist.shouldHide(testProgramme);
      state.prefs.locationBlacklist=previous;save();
      const likes=document.querySelector('.geoLikesPane'),exclusions=document.querySelector('.geoBlacklistPane');
      return {kind:assessment.kind,hidden,likesBeforeExclusions:!!likes&&!!exclusions&&!!(likes.compareDocumentPosition(exclusions)&Node.DOCUMENT_POSITION_FOLLOWING),likeSearch:!!document.getElementById('geoLikeSearch'),preferredToggle:!!document.getElementById('geoPreferredOnly'),preferredToggleDisabled:!!document.getElementById('geoPreferredOnly')?.disabled};
    });
    assert.equal(reviewRule.kind,'unverified','A missing postcode should be classified as needing review');
    assert.equal(reviewRule.hidden,false,'A programme needing review must remain visible in Explore and on the map');
    assert(reviewRule.likesBeforeExclusions&&reviewRule.likeSearch&&reviewRule.preferredToggle&&reviewRule.preferredToggleDisabled,'Preferred areas should appear above exclusions with a focus filter that activates after an area is selected');

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
    assert(await page.locator('#hideExcluded').isChecked(),'Hide excluded could not be enabled');
    await page.locator('#uxHideExcludedBtn').click();
    assert(!(await page.locator('#hideExcluded').isChecked()),'Hide excluded could not be disabled');
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
