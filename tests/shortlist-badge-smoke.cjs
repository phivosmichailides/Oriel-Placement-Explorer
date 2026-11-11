'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const relative=(pathname.startsWith('/')?pathname.slice(1):pathname)||'index.html';
  const filename=path.join(root,relative);
  try{
    const ext=path.extname(filename).toLowerCase();
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
    res.setHeader('Content-Type',types[ext]||'application/octet-stream');
    res.end(fs.readFileSync(filename));
  }catch{res.statusCode=404;res.end();}
});
const waitForCount=(page,count)=>page.waitForFunction(value=>{
  return document.querySelector('#uxDrawerLauncher [data-ux-shortlist-count]')?.textContent===value;
},count,{timeout:15000});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']});
  const page=await browser.newPage({viewport:{width:1365,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    localStorage.setItem('phivos-onboarding-v1','1');
    localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify({
      region:'',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'
    }));
  });
  await page.route('https://**/*',route=>{
    const url=route.request().url();
    if(url.includes('api.postcodes.io/postcodes/'))return route.fulfill({json:{result:{latitude:51.501,longitude:-0.142}}});
    if(url.includes('api.postcodes.io'))return route.fulfill({json:{result:[]}});
    return route.abort();
  });
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url+'/?qa=shortlist',{waitUntil:'domcontentloaded'});
  await page.locator('#results .placement').first().waitFor({state:'visible',timeout:60000});
  await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').waitFor({state:'attached',timeout:20000});
  await waitForCount(page,'(0)');
  const first=page.locator('#results .placement').first();
  await first.locator('[data-action=prefer]').click();
  await waitForCount(page,'(1)');
  assert.equal(await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').innerText(),'(1)',
    'Bottom-right shortlist count did not update after adding a programme');
  await page.locator('.atlasHistoryDisclosure > summary').click();
  await page.locator('#undoDesk').click();
  await waitForCount(page,'(0)');
  assert.equal(await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').innerText(),'(0)',
    'Bottom-right shortlist count did not update after undo');
  await page.locator('#redoDesk').click();
  await waitForCount(page,'(1)');
  await first.locator('[data-action=prefer]').click();
  await waitForCount(page,'(0)');
  assert.equal(await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').innerText(),'(0)',
    'Bottom-right shortlist count did not update after removing a programme');
  await first.locator('[data-action=prefer]').click();
  await waitForCount(page,'(1)');
  await page.locator('nav.tabs [data-tab="shortlist"]').click();
  const desktopRemove=page.locator('#shortlistList .rank-row [data-atlas-remove-shortlist]').first();
  await page.locator('#shortlistList .rank-row').first().hover();
  await desktopRemove.waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#shortlistList .rank-row [data-atlas-remove-shortlist]')).opacity)>0.99,null,{timeout:3000});
  assert(Number(await desktopRemove.evaluate(el=>getComputedStyle(el).opacity))>0.99,'Desktop shortlist X should be revealed on hover or focus');
  await desktopRemove.click();
  await waitForCount(page,'(0)');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.addInitScript(()=>{localStorage.setItem('phivos-onboarding-v1','1');localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify({region:'',environment:'mixed',priorities:[],salary:'',hours:'',community:'some'}));});
  await mobile.route('https://**/*',route=>{const u=route.request().url();if(u.includes('api.postcodes.io/postcodes/'))return route.fulfill({json:{result:{latitude:51.501,longitude:-0.142}}});if(u.includes('api.postcodes.io'))return route.fulfill({json:{result:[]}});return route.abort();});
  await mobile.goto(url+'/?qa=shortlist-mobile',{waitUntil:'domcontentloaded'});
  await mobile.locator('#results .placement').first().waitFor({state:'visible',timeout:60000});
  await mobile.locator('#results .placement').first().locator('[data-action=prefer]').click();
  await mobile.waitForFunction(()=>document.querySelector('#uxDrawerLauncher [data-ux-shortlist-count]')?.textContent==='(1)',null,{timeout:15000});
  await mobile.locator('#uxDrawerLauncher').click();
  const mobileItem=mobile.locator('#uxDrawerItems .uxDrawerItem').first();
  await mobileItem.waitFor({state:'visible',timeout:15000});
  const mobileRemove=mobileItem.locator('[data-atlas-remove-shortlist]');
  assert.equal(await mobileRemove.evaluate(el=>getComputedStyle(el).opacity),'0','Phone drawer X should stay hidden before a swipe');
  await mobile.evaluate(()=>{const item=document.querySelector('#uxDrawerItems .uxDrawerItem');const start=new Event('touchstart',{bubbles:true});Object.defineProperty(start,'touches',{value:[{clientX:320,clientY:240}]});item.dispatchEvent(start);const end=new Event('touchend',{bubbles:true});Object.defineProperty(end,'changedTouches',{value:[{clientX:205,clientY:243}]});item.dispatchEvent(end);});
  assert(await mobileItem.evaluate(el=>el.classList.contains('atlasSwipeOpen')),'Swiping left did not reveal the shortlist X');
  await mobile.waitForFunction(()=>getComputedStyle(document.querySelector('#uxDrawerItems .uxDrawerItem [data-atlas-remove-shortlist]')).opacity==='1',null,{timeout:2500});
  assert.equal(await mobileRemove.evaluate(el=>getComputedStyle(el).opacity),'1','Phone drawer X did not appear after swiping left');
  await mobileRemove.click();
  await mobile.waitForFunction(()=>document.querySelector('#uxDrawerLauncher [data-ux-shortlist-count]')?.textContent==='(0)',null,{timeout:15000});
  assert(!errors.some(error=>/shortlist|updateCounts|mark is not defined/i.test(error)),
    'Shortlist logic raised a browser runtime error: '+errors.join('; '));
  console.log('PASS: shortlist count, desktop X removal, and mobile swipe-to-reveal removal');
  await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
