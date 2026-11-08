'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';
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
  assert.equal(await first.locator('[data-action=status]').inputValue(),'yes',
    'Adding a programme did not update its decision status');
  await page.locator('#undoDesk').click();
  await waitForCount(page,'(0)');
  assert.equal(await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').innerText(),'(0)',
    'Bottom-right shortlist count did not update after undo');
  assert.equal(await first.locator('[data-action=status]').inputValue(),'',
    'Undo did not restore the original decision status');
  await page.locator('#redoDesk').click();
  await waitForCount(page,'(1)');
  assert.equal(await first.locator('[data-action=status]').inputValue(),'yes',
    'Redo did not restore the shortlist decision');
  await first.locator('[data-action=prefer]').click();
  await waitForCount(page,'(0)');
  assert.equal(await page.locator('#uxDrawerLauncher [data-ux-shortlist-count]').innerText(),'(0)',
    'Bottom-right shortlist count did not update after removing a programme');
  assert(!errors.some(error=>/shortlist|updateCounts|mark is not defined/i.test(error)),
    'Shortlist logic raised a browser runtime error: '+errors.join('; '));
  console.log('PASS: bottom-right shortlist count updates on add, undo, redo and removal');
  await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
