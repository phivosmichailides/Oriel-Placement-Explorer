'use strict';
/* Browsing and layout enhancements. Saved rankings/decisions remain in the existing app state.
   Appearance, pagination and salary assumptions live in separate local-only keys. */
(()=>{
 const $=id=>document.getElementById(id);
 const root=document.documentElement;
 const KEYS={palette:'oriel-desk-palette-v1',layout:'oriel-desk-layout-v1'};
 const palettes=new Set(['forest','copper','mauve','amber','cocoa','mono']);
 const read=(k,fallback)=>{try{return localStorage.getItem(k)||fallback}catch{return fallback}};
 const write=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 const getData=()=>{try{return typeof placements!=='undefined'&&Array.isArray(placements)?placements:[]}catch{return []}};
 const getRanks=()=>{try{return typeof ranked==='function'?ranked():[]}catch{return []}};
 const isShortlisted=p=>{try{return SHORT.has(mark(p).status)}catch{return false}};
 let selectedProgrammeId=null;
 const byId=()=>{
   const list=getData();
   if(byId.previous!==list){byId.previous=list;byId.map=new Map(list.map(p=>[String(p.id),p]))}
   return byId.map||new Map();
 };
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>window.OrielPay?.money(n)||'£'+Math.round(Number(n)||0).toLocaleString('en-GB');
 let layout=read(KEYS.layout,'list')==='grid'?'grid':'list';
 let palette=palettes.has(read(KEYS.palette,'forest'))?read(KEYS.palette,'forest'):'forest';
 const setLayout=(next,rerender=true)=>{
   layout=next==='grid'?'grid':'list';root.setAttribute('data-layout',layout);write(KEYS.layout,layout);
   document.querySelectorAll('[data-ux-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.uxLayout===layout)));
   if(rerender&&typeof explore==='function')explore();
 };
 const setPalette=next=>{
   if(!palettes.has(next))return;
   palette=next;root.setAttribute('data-palette',next);write(KEYS.palette,next);
   document.querySelectorAll('[data-ux-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.uxPalette===next)));
 };
 const updateBrightness=()=>{
   const theme=root.getAttribute('data-theme')||'light';
   document.querySelectorAll('[data-ux-brightness]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.uxBrightness===theme)));
 };
 setPalette(palette);setLayout(layout,false);updateBrightness();
 document.addEventListener('click',e=>{
   const layoutBtn=e.target.closest('[data-ux-layout]');
   if(layoutBtn){setLayout(layoutBtn.dataset.uxLayout);return}
   const paletteBtn=e.target.closest('[data-ux-palette]');
   if(paletteBtn){setPalette(paletteBtn.dataset.uxPalette);return}
   const brightnessBtn=e.target.closest('[data-ux-brightness]');
   if(brightnessBtn){
      if(root.getAttribute('data-theme')!==brightnessBtn.dataset.uxBrightness)$('themeToggle')?.click();
      updateBrightness();return;
   }
 });
 $('themeToggle')?.addEventListener('click',()=>requestAnimationFrame(updateBrightness));

 const filter=$('hideShortlisted'),hideBtn=$('uxHideShortlistedBtn');
 const syncHide=()=>{
   if(!filter)return;
   if(hideBtn){hideBtn.setAttribute('aria-pressed',String(filter.checked));hideBtn.textContent=filter.checked?'✓ Showing unshortlisted only':'○ Hide shortlisted'}
 };
 hideBtn?.addEventListener('click',()=>{
   if(!filter)return;
   filter.checked=!filter.checked;
   filter.dispatchEvent(new Event('change',{bubbles:true}));
   if(typeof reco==='function')reco();
   syncHide();
 });
 filter?.addEventListener('change',()=>{page=1;syncHide();if(typeof reco==='function')reco()});
 syncHide();

 // Optional PAYE/pension preferences are deliberately separate from ranked decisions.
 const payCard=document.createElement('div');
 payCard.className='settingsCard card uxPaySettings';
 payCard.innerHTML='<div class="eyebrow">PAY &amp; PENSIONS</div><h2>💷 Estimated take-home</h2><p class="muted">Shown beneath advertised annual salaries. Illustrative UK PAYE for tax year 2027/28 (England/Wales), 2027/28 National Insurance assumptions, one job and standard tax code. Actual payroll depends on pension scheme, tax code, benefits and loan repayments.</p>'+
 '<div class="grid2"><label class="field"><span>Employee pension assumption</span><select id="uxPayPension"><option value="standard">Workplace minimum: 5% of qualifying earnings</option><option value="nhs">NHS scheme: current published tiers</option><option value="none">No pension deduction</option></select></label><label class="field"><span>Student loan</span><select id="uxPayLoan"><option value="none">No repayment</option><option value="plan5">Plan 5 (illustrative threshold)</option></select></label></div>'+
 '<p class="smallnote" id="uxPayAssumption"></p>'+
 '<p class="smallnote">NHS pension tiers use the published <b>2026/27</b> rates as an estimate; 2027/28 deductions may differ. Student-loan Plan 5 uses the £25,000 2026/27 reference threshold pending the applicable later figure. Pension relief model assumes the net-pay method, not salary sacrifice. A 52-week annual salary is used, even for placements beginning July/August.</p>'+
 '<p class="smallnote"><a target="_blank" rel="noopener" href="https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances">Income Tax rates</a> · <a target="_blank" rel="noopener" href="https://www.gov.uk/national-insurance/how-much-you-pay">National Insurance</a> · <a target="_blank" rel="noopener" href="https://www.nhsbsa.nhs.uk/cy/node/1275">NHS pension tiers</a></p>';
 document.querySelector('#prefs .settings')?.append(payCard);
 const payPension=$('uxPayPension'),payLoan=$('uxPayLoan'),payAssumption=$('uxPayAssumption');
 const fillPay=()=>{
   if(!window.OrielPay)return;
   const s=window.OrielPay.read();payPension.value=s.pension;payLoan.value=s.studentLoan;
   if(payAssumption)payAssumption.textContent=window.OrielPay.descriptor();
 };
 fillPay();
 const onPay=()=>{window.OrielPay?.save({pension:payPension.value,studentLoan:payLoan.value});fillPay()};
 payPension?.addEventListener('change',onPay);
 payLoan?.addEventListener('change',onPay);

 // Preserve where users were in Explore even after visiting Shortlist/For You.
 const scrollByTab=new Map(),filterSnapshots=[];
 let currentTab='explore',pendingNavigation=null;
 document.addEventListener('desk:before-navigation',e=>{
   const from=e.detail?.from||currentTab;
   if(from)scrollByTab.set(from,window.scrollY||0);
   pendingNavigation=e.detail?.to;
 });
 document.addEventListener('desk:after-navigation',e=>{
   currentTab=e.detail?.to||'explore';
   const restore=scrollByTab.get(currentTab)||0;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(pendingNavigation!==currentTab)return;
     window.scrollTo({top:restore,behavior:'instant'});
   }));
 });
 const snapshotFilters=()=>{
   let quickValues=[];
   try{quickValues=[...quick]}catch{}
   return {fields:['search','sector','region','hours','salary','sort','decision','visa'].map(id=>[id,$(id)?.value]),quick:quickValues,hideAvoid:$('hideAvoid')?.checked,hideShortlisted:filter?.checked,hideJustice:$('hideJustice')?.checked,hideMental:$('hideMental')?.checked,hideOtherSpecialist:$('hideOtherSpecialist')?.checked,specialistView:$('specialistView')?.value,page};
 };
 const restoreFilters=snapshot=>{
   if(!snapshot)return;
   for(const [id,value] of snapshot.fields){if($(id))$(id).value=value}
   if($('hideAvoid'))$('hideAvoid').checked=!!snapshot.hideAvoid;
   if(filter)filter.checked=!!snapshot.hideShortlisted;
   for(const id of ['hideJustice','hideMental','hideOtherSpecialist'])if($(id))$(id).checked=!!snapshot[id];
   if($('specialistView'))$('specialistView').value=snapshot.specialistView||'all';
   if(typeof quick!=='undefined')quick=new Set(snapshot.quick);
   document.querySelectorAll('.chip[data-q]').forEach(b=>b.classList.toggle('on',snapshot.quick.includes(b.dataset.q)));
   page=snapshot.page||1;skipResetOnce=true;syncHide();explore();if(typeof reco==='function')reco();
 };
 const backBtn=document.createElement('button');
 backBtn.type='button';backBtn.className='btn uxBackToResults';
 backBtn.textContent='↩ Back to my previous results';backBtn.hidden=true;
 $('uxExploreToolbar')?.append(backBtn);
 backBtn.addEventListener('click',()=>{
   const old=filterSnapshots.pop();restoreFilters(old);
   backBtn.hidden=filterSnapshots.length===0;
 });
 document.addEventListener('click',e=>{
   // Capture happens before the base app changes query and quick filters.
   const open=e.target.closest('[data-open]');
   if(open){filterSnapshots.push(snapshotFilters());if(filterSnapshots.length>3)filterSnapshots.shift();backBtn.hidden=false}
 },true);

 let page=1,lastFilterKey='',skipResetOnce=false;
 window.uxGetExplorePage=()=>page;
 window.uxSetExplorePage=value=>{const n=Number(value);if(!Number.isInteger(n)||n<1)return;page=n;skipResetOnce=true;if(typeof explore==='function')explore()};
 const pagination=$('uxExplorePager');
 const pager=(count,total)=>{
   if(!pagination)return;
   pagination.replaceChildren();
   const pages=Math.max(1,Math.ceil(total/20));
   if(!total){pagination.textContent='No matching results.';return}
   const info=document.createElement('span');
   info.textContent='Showing '+(count?((page-1)*20+1):0)+'–'+(Math.min(page*20,total))+' of '+total.toLocaleString('en-GB')+' · Page '+page+'/'+pages;
   pagination.append(info);
   if(pages===1)return;
   const controls=document.createElement('div');controls.className='uxPagerButtons';
   const make=(label,target,disabled=false,active=false)=>{
     const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent=label;btn.disabled=disabled;
     if(active)btn.setAttribute('aria-current','page');
     btn.addEventListener('click',()=>{page=target;if(typeof explore==='function')explore();$('uxExploreToolbar')?.scrollIntoView({behavior:'smooth',block:'start'})});
     controls.append(btn);
   };
   make('‹',Math.max(1,page-1),page===1);
   const pageNumbers=new Set([1,pages,page-2,page-1,page,page+1,page+2].filter(n=>n>=1&&n<=pages));
   let prev=0;[...pageNumbers].sort((a,b)=>a-b).forEach(n=>{if(prev&&n-prev>1){const dots=document.createElement('span');dots.textContent='…';dots.className='uxPagerEllipsis';controls.append(dots)}make(String(n),n,false,n===page);prev=n});
   make('›',Math.min(pages,page+1),page===pages);
   pagination.append(controls);
 };
 const results=$('results');
 let mapPending=0;
 function renderExplore(){
   if(!results||typeof sorted!=='function'||typeof matches!=='function')return;
   let options=[];
   try{options=sorted(getData().filter(matches))}catch{return}
   const newKey=JSON.stringify({s:$('search')?.value,sect:$('sector')?.value,reg:$('region')?.value,hrs:$('hours')?.value,sal:$('salary')?.value,sort:$('sort')?.value,dec:$('decision')?.value,visa:$('visa')?.value,hideAvoid:$('hideAvoid')?.checked,hideShortlisted:filter?.checked,hideJustice:$('hideJustice')?.checked,hideMental:$('hideMental')?.checked,hideOtherSpecialist:$('hideOtherSpecialist')?.checked,specialistView:$('specialistView')?.value,
    qs:typeof quick!=='undefined'?[...quick]:[]});
   if(newKey!==lastFilterKey){if(!skipResetOnce)page=1;lastFilterKey=newKey}skipResetOnce=false;
   const total=options.length,pages=Math.max(1,Math.ceil(total/20));
   page=Math.min(Math.max(1,page),pages);
   const shown=options.slice((page-1)*20,page*20);
   $('count').textContent=total.toLocaleString('en-GB')+' matching programmes';
   cleanupMiniMaps();
   results.innerHTML=shown.length?shown.map(p=>card(p)).join(''):'<div class="card empty uxEmptyState">No placements match those filters. Try broadening your criteria.</div>';
   pager(shown.length,total);
   enhanceCards(results);
   clearTimeout(mapPending);
   mapPending=setTimeout(()=>{try{drawMap(options)}catch(e){console.warn('Map could not refresh:',e)}},160);
 }
 // The core app sees this hook before any future Explore rerender; it cannot change saved decisions.
 window.uxWorkspaceRenderExplore=renderExplore;

 // Shortlist drawer is an overlay rather than another page; it preserves filters and scroll.
 const drawer=$('uxDrawer'),backdrop=$('uxDrawerBackdrop'),drawerItems=$('uxDrawerItems'),drawerSearch=$('uxDrawerSearch');
 let drawerOpener=null;
 const updateCounts=()=>{
   const count=getRanks().length;
   document.querySelectorAll('[data-ux-shortlist-count]').forEach(n=>n.textContent=count?'('+count+')':'(0)');
 };
 const renderDrawer=()=>{
   if(!drawerItems)return;
   const query=(drawerSearch?.value||'').toLowerCase().trim();
   const all=getRanks();const indexes=new Map(all.map((p,i)=>[p.id,i+1]));
   const list=all.filter(p=>(p.title+' '+p.employer+' '+p.id).toLowerCase().includes(query));
   drawerItems.replaceChildren();
   if(!list.length){const emp=document.createElement('div');emp.className='uxDrawerEmpty';emp.textContent='No shortlisted programmes match.';drawerItems.append(emp);return}
   const frag=document.createDocumentFragment();
   list.forEach(p=>{
     const box=document.createElement('div');box.className='uxDrawerItem';
     const idx=indexes.get(p.id)||'?';
     box.innerHTML='<small>#'+idx+' · '+escape(p.region||'')+'</small><b>'+escape(p.title||p.employer)+'</b><p>'+escape(p.employer||'')+' · '+escape(money(p.salary))+'</p>';
     const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent='View programme';
     btn.addEventListener('click',()=>{
       closeDrawer();
       if(typeof switchTab==='function')switchTab('explore');
       filterSnapshots.push(snapshotFilters());backBtn.hidden=false;
       $('search').value=p.id;
       $('decision').value='all';
       filter.checked=false;syncHide();
       $('sector').value='';$('region').value='';$('hours').value='';$('salary').value='';
       quick=new Set();document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.remove('on'));
       page=1;explore();
       $('uxExploreToolbar')?.scrollIntoView({behavior:'smooth'});
     });
     box.append(btn);frag.append(box);
   });
   drawerItems.append(frag);
 };
 const openDrawer=e=>{
   if(!drawer||!backdrop)return;
   drawerOpener=e?.currentTarget||document.activeElement;
   drawer.classList.add('uxOpen');drawer.setAttribute('aria-hidden','false');drawer.inert=false;
   backdrop.hidden=false;root.classList.add('uxDrawerOpen');
   renderDrawer();$('uxDrawerClose')?.focus();
 };
 const closeDrawer=()=>{
   if(!drawer||!backdrop)return;
   drawer.classList.remove('uxOpen');drawer.setAttribute('aria-hidden','true');drawer.inert=true;
   backdrop.hidden=true;root.classList.remove('uxDrawerOpen');
   drawerOpener?.focus?.();
 };
 document.addEventListener('click',e=>{
   const opener=e.target.closest('[data-ux-open-drawer]');if(opener){openDrawer({currentTarget:opener});return}
   const nav=e.target.closest('[data-ux-navigate]');if(nav){closeDrawer();if(typeof switchTab==='function')switchTab(nav.dataset.uxNavigate)}
 });
 $('uxDrawerClose')?.addEventListener('click',closeDrawer);
 backdrop?.addEventListener('click',closeDrawer);
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&drawer?.classList.contains('uxOpen')){e.preventDefault();closeDrawer()}
   if(e.key==='Tab'&&drawer?.classList.contains('uxOpen')){
     const focusable=[...drawer.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')];
     if(focusable.length){const i=focusable.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();focusable[focusable.length-1].focus()}else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus()}}
   }
 });
 drawerSearch?.addEventListener('input',renderDrawer);

 // Salary under every advertised gross salary (list, shortlist, map selections, recommendations).
 const currentPayElement=document.createElement('div');
 function addTakeHome(cardEl,p){
   if(!p?.salary||!window.OrielPay)return;
   const parent=cardEl.querySelector('.salary')?.parentElement;
   if(!parent)return;
   let line=parent.querySelector('.uxTakeHome');
   if(!line){line=document.createElement('div');line.className='uxTakeHome';parent.append(line)}
   const estimate=window.OrielPay.estimate(p.salary);
   line.textContent='Est. take-home '+money(estimate.monthly)+'/mo · '+money(estimate.annual)+'/yr';
   line.title=window.OrielPay.descriptor()+'. Illustrative PAYE, not guaranteed payslip income.';
 }
 const endDate=p=>{
   const raw=String(p?.start||'').trim();
   if(!raw)return 'Start date not stated';
   let start=null,m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
   if(m)start=new Date(Date.UTC(+m[3],+m[2]-1,+m[1],12));
   else if((m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))start=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));
   else {const parsed=new Date(raw);if(!Number.isNaN(parsed.getTime()))start=parsed}
   if(!start||Number.isNaN(start.getTime()))return 'Start date not stated';
   const settings=Array.isArray(p.settings)?p.settings:[];
   const weeks=settings.reduce((sum,x)=>sum+(Number(x?.[1])||0),0);
   const fmt=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d);
   if(!(weeks>0&&weeks<=80))return 'Starts '+fmt(start)+' · Finish date not stated (training duration unavailable)';
   const end=new Date(start.getTime()+weeks*7*86400000);
   return 'Starts '+fmt(start)+' · Est. finish ~'+fmt(end)+' ('+weeks+' weeks)';
 };
 function enhanceRecommendations(){
   document.querySelectorAll('#reco .reco').forEach(item=>{
     const code=item.querySelector('[data-open]')?.getAttribute('data-open');
     const p=byId().get(code);
     if(!p)return;
     let section=item.querySelector('.uxRecoMeta');
     if(!section){section=document.createElement('div');section.className='uxRecoMeta';item.append(section)}
     const estimate=window.OrielPay?.estimate(p.salary);
     section.textContent=(estimate?'Est. take-home '+money(estimate.monthly)+'/mo · '+money(estimate.annual)+'/yr · ':'')+(endDate(p)||'Start date not stated');
     section.title=window.OrielPay?.descriptor()||'';
     let loc=item.querySelector('.uxRecoLocationToggle');
     if(!loc){loc=document.createElement('button');loc.type='button';loc.className='btn uxRecoLocationToggle';loc.setAttribute('data-ux-reco-location','');loc.setAttribute('aria-expanded','false');loc.textContent='⌖ Show location & connections';item.append(loc)}
   });
 }
 // Geocoded locations come from the same postcode dataset used by the principal map.
 let postcodeLocations=window.ORIEL_BUNDLED_LOCATIONS||{};
 const geoFor=()=>{
   try{if(typeof geo!=='undefined'&&geo&&Object.keys(geo).length>100)return geo}catch{}
   return postcodeLocations||{};
 };
 const normPC=postcode=>{
   try{if(typeof pcKey==='function')return pcKey(postcode)}catch{}
   return String(postcode||'').replace(/\s/g,'').toUpperCase();
 };
 const getSites=p=>{
   const g=geoFor(),seen=new Set(),sites=[];
   (p.postcodes||[]).filter(Boolean).forEach((pc,i)=>{
     const key=normPC(pc);
     if(seen.has(key))return;seen.add(key);
     const coord=g[key],valid=Array.isArray(coord)&&coord.length>=2&&Number.isFinite(+coord[0])&&Number.isFinite(+coord[1]);
     sites.push({pc,lat:valid?+coord[0]:null,lng:valid?+coord[1]:null,index:i});
   });
   return sites;
 };
 const siteName=(p,site,index,count)=>{
   const title=String(p.title||''),p0=title.search(/\b[A-Z]{1,2}\s*\d[A-Z\d]?\s*\d[A-Z]{2}\b/i);
   const prefix=(p0>=0?title.slice(0,p0):title).replace(/[\/+\s]+$/,'');
   const byPlus=prefix.split('+').map(x=>x.split('/')[0].trim()).filter(Boolean);
   if(byPlus.length>=count&&byPlus[index])return byPlus[index].slice(0,85);
   const generic=new Set(['london','dartford','slough','kingston','surrey','england']);
   const bySlash=prefix.split('/').map(x=>x.trim()).filter(x=>x.length>6&&!generic.has(x.toLowerCase()));
   if(bySlash.length>=count&&bySlash[index])return bySlash[index].slice(0,85);
   return 'Training location '+(index+1)+' · '+site.pc;
 };
 const miniMaps=new Map();
 let miniObserver=null,cardObserver=null,commuteObserver=null;
 function cleanupMiniMaps(){
   for(const [holder,map] of miniMaps){if(!holder.closest('#results'))continue;try{map.remove()}catch{}miniMaps.delete(holder);miniObserver?.unobserve(holder)}
 }
 function mapVisible(holder){
   if(!holder?.isConnected||miniMaps.has(holder))return;
   if(layout==='grid'&&holder.closest('.placement')&&!holder.closest('.uxExpanded'))return;
   const id=holder.closest('.placement')?.dataset.id||holder.closest('.reco')?.querySelector('[data-open]')?.getAttribute('data-open');
   const p=byId().get(id);if(!p)return;
   const sites=getSites(p),index=Number(holder.closest('.uxLocationPanel')?.dataset.uxSiteIndex||0);
   const selected=sites[index]||sites[0];
   if(!selected||selected.lat===null){
     holder.innerHTML='<div class="uxMiniMapSkeleton">No mapped pin for this site · use the location link below</div>';
     return;
   }
   if(!window.L)return;
   try{
     holder.replaceChildren();
     const map=L.map(holder,{zoomControl:false,attributionControl:true,scrollWheelZoom:false,dragging:false,keyboard:false,boxZoom:false,touchZoom:false,doubleClickZoom:false,preferCanvas:false});
     // The standard OSM raster endpoint is key-free. CARTO's unkeyed URL
     // may return an HTTP-200 "API KEY REQUIRED" image, not a tile error.
     if(window.OrielBasemap?.addTo)window.OrielBasemap.addTo(map,{mini:true});
     else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
       maxZoom:19,attribution:'© OpenStreetMap contributors'
     }).addTo(map);
     const sitePoint=[selected.lat,selected.lng];
     const central=p.region==='London'?[51.5074,-.1278]:null;
     if(central)L.circleMarker(central,{radius:3.4,color:'#697f77',weight:1.4,fillColor:'#f8f2e7',fillOpacity:1}).addTo(map).bindTooltip('Central London');
     L.circleMarker(sitePoint,{radius:6.2,weight:2,color:'#ffffff',fillColor:'#995c68',fillOpacity:1}).addTo(map).bindTooltip(selected.pc);
     if(central)map.fitBounds(L.latLngBounds([central,sitePoint]),{padding:[20,20],maxZoom:12,animate:false});
     else map.setView(sitePoint,12,{animate:false});
     const openSelected=()=>{
       const label=siteName(p,selected,index,sites.length);
       const lookup=/^Training location/.test(label)?selected.pc:label+' '+selected.pc;
       const url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lookup+', UK');
       window.open(url,'_blank','noopener,noreferrer');
     };
     holder.setAttribute('role','link');holder.setAttribute('tabindex','0');
     holder.setAttribute('aria-label','Open map for '+selected.pc+' in a new tab');
     holder.title='Click to open the selected training site in Maps';
     holder.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSelected()}};
     map.on('click',e=>{
       if(e.originalEvent?.target?.closest?.('.leaflet-control-attribution'))return;
       openSelected();
     });
     miniMaps.set(holder,map);
     requestAnimationFrame(()=>{if(holder.isConnected)map.invalidateSize(false)});
   }catch(e){holder.textContent='Map unavailable — use the route link'}
 }
 function enableMini(holder){
   if(!holder)return;
   if(!miniObserver&&'IntersectionObserver'in window){
     miniObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)mapVisible(e.target)}),{rootMargin:'120px',threshold:.01});
   }
   if(miniObserver)miniObserver.observe(holder);
   else if(holder.getBoundingClientRect().top<window.innerHeight+200)mapVisible(holder);
 }
 function scheduleCommute(panel){
   if(!panel?.isConnected||typeof panel._uxRunCommute!=='function')return;
   const rect=panel.getBoundingClientRect();
   if(rect.width>0&&rect.height>0&&rect.top<window.innerHeight+180&&rect.bottom>-180){panel._uxRunCommute();return;}
   if(!('IntersectionObserver'in window)){return;}
   if(!commuteObserver)commuteObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target._uxRunCommute?.()}),{rootMargin:'180px',threshold:.01});
   commuteObserver.observe(panel);
 }
 function enableCommute(panel){scheduleCommute(panel)}
 function locationPanel(p){
   const guides=window.OrielLocationGuide;
   let sites=getSites(p);
   const panel=document.createElement('div');panel.className='uxLocationPanel';panel.dataset.uxSiteIndex='0';
   const title=document.createElement('div');title.className='uxLocationTitle';title.textContent='Location & connections';panel.append(title);
   const bar=document.createElement('div');bar.className='uxSiteBar';panel.append(bar);
   const labels=document.createElement('div');labels.className='uxSiteHeading';bar.append(labels);
   const siteTitle=document.createElement('strong');siteTitle.className='uxSiteName';labels.append(siteTitle);
   const count=document.createElement('small');count.className='uxSiteNumber';labels.append(count);
   const headline=document.createElement('div');headline.className='uxLocationSummary';panel.append(headline);
   const commuteAdvice=document.createElement('div');commuteAdvice.className='uxCommuteAdvice';commuteAdvice.hidden=true;
   const commuteLabel=document.createElement('strong');commuteAdvice.append(commuteLabel);
   const commuteSummary=document.createElement('div');commuteSummary.className='uxCommuteSummary';commuteAdvice.append(commuteSummary);
   const commuteDetails=document.createElement('div');commuteDetails.className='uxCommuteDetails';commuteAdvice.append(commuteDetails);
   const commuteMeta=document.createElement('small');commuteMeta.className='uxCommuteMeta';commuteAdvice.append(commuteMeta);
   panel.append(commuteAdvice);
   const map=document.createElement('div');map.className='uxMiniMap';map.innerHTML='<div class="uxMiniMapSkeleton">Map loading…</div>';panel.append(map);
   const info=document.createElement('div');info.className='uxLocationInfo';panel.append(info);
   const foot=document.createElement('div');foot.className='uxMapFootnote';panel.append(foot);
   const links=document.createElement('div');links.className='uxMapLinks';
   const route=document.createElement('a');route.target='_blank';route.rel='noopener noreferrer';route.textContent='Check rail/Tube route ↗';links.append(route);
   const maps=document.createElement('a');maps.target='_blank';maps.rel='noopener noreferrer';maps.textContent='Open selected site ↗';links.append(maps);panel.append(links);
   let activeSite=null,activeLocation=null,activeLookup='';
   const refreshCommute=()=>{
     const site=activeSite,loc=activeLocation,siteLookup=activeLookup;
     const origin=window.OrielCommuteProfile?.read?.()||'';
     if(!origin){
       commuteAdvice.hidden=true;commuteAdvice.className='uxCommuteAdvice';
       commuteLabel.textContent='';commuteSummary.textContent='';commuteDetails.textContent='';commuteMeta.textContent='';
       panel.dataset.uxCommuteKey='';panel.dataset.uxCommuteLoadedKey='';panel._uxRunCommute=null;
       if(loc?.hub&&site?.pc){
         route.textContent='Transit to '+loc.hub.replace(/^London /,'')+' ↗';
         route.href='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(siteLookup+', UK')+'&destination='+encodeURIComponent(loc.hub+', UK')+'&travelmode=transit';
         route.title='Open a Google Maps public-transport route from this programme postcode to '+loc.hub;
       }else{
         route.textContent='Check rail/Tube route ↗';
         route.href=guides?.sourceUrls?.[loc?.source]||'https://tfl.gov.uk/plan-a-journey/';
         route.title='Open the relevant public transport journey planner';
       }
       return;
     }
     if(!site?.pc){
       commuteAdvice.hidden=false;commuteAdvice.className='uxCommuteAdvice is-unverified';
       commuteLabel.textContent='Journey not assessed';
       commuteSummary.textContent='Oriel does not provide a training-site postcode for this location, so a reliable journey time cannot be calculated.';
       commuteDetails.textContent='No travel time has been guessed.';
       commuteMeta.textContent='Add or verify the site address with the employer.';
       route.textContent='Open journey planner ↗';route.href='https://tfl.gov.uk/plan-a-journey/';route.title='Open a public-transport journey planner';
       panel.dataset.uxCommuteKey='';panel.dataset.uxCommuteLoadedKey='';panel._uxRunCommute=null;
       return;
     }
     const area=window.OrielCommuteProfile?.areaLabel?.(origin)||guides?.describePostcode?.(origin)?.headline||origin;
     const originLabel=area===origin?origin:area+' ('+origin+')';
     const key=origin+'|'+site.pc;
     if(panel.dataset.uxCommuteKey===key&&panel.dataset.uxCommuteLoadedKey===key)return;
     commuteAdvice.hidden=false;commuteAdvice.className='uxCommuteAdvice is-loading';
     commuteLabel.textContent='Checking your commute…';
     commuteSummary.textContent='From '+originLabel+' to '+(siteTitle.textContent||site.pc);
     commuteDetails.textContent='Checking a typical weekday morning public-transport journey.';
     commuteMeta.textContent='Your map pin remains the training site; only this travel advice uses your starting postcode.';
     route.textContent='Open home-to-site route ↗';
     route.href=window.OrielCommute?.mapsUrl?.(origin,site.pc)||'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin+', UK')+'&destination='+encodeURIComponent(site.pc+', UK')+'&travelmode=transit';
     route.title='Open a public-transport route from '+origin+' to training site '+site.pc;
     panel.dataset.uxCommuteKey=key;
     panel._uxRunCommute=async()=>{
       if(!panel.isConnected||panel.dataset.uxCommuteLoadedKey===key)return;
       panel.dataset.uxCommuteLoadedKey=key;
       try{
         const journey=await window.OrielCommute.getJourney(origin,site.pc);
         if(panel.dataset.uxCommuteKey!==key)return;
         const convenient=Number(journey.duration)<=40;
         commuteAdvice.className='uxCommuteAdvice '+(convenient?'is-convenient':'is-not-convenient');
         commuteLabel.textContent=convenient?'Convenient':'Not Convenient';
         commuteSummary.textContent=journey.duration+' min from '+originLabel+' to '+(siteTitle.textContent||site.pc)+(convenient?' · within your 40-minute target.':' · '+(journey.duration-40)+' min beyond your 40-minute target.');
         commuteDetails.textContent=(journey.legs||[]).join(' → ')||'The planner returned a journey time but no leg-by-leg description.';
         const notes=[];
         notes.push(journey.transfers===0?'No changes':journey.transfers+' '+(journey.transfers===1?'change':'changes'));
         if(journey.walkingMinutes>0)notes.push(journey.walkingMinutes+' min walking');
         if(journey.disrupted)notes.push('Disruption flagged in this sample');
         commuteMeta.textContent=[journey.sampleDate,(journey.departure||'08:00')+' weekday sample',notes.join(' · '),'TfL Journey Planner'].filter(Boolean).join(' · ');
       }catch{
         if(panel.dataset.uxCommuteKey!==key)return;
         commuteAdvice.className='uxCommuteAdvice is-unverified';
         commuteLabel.textContent='Journey not verified';
         commuteSummary.textContent='The transport planner did not return a reliable journey time from '+origin+' to '+site.pc+'.';
         commuteDetails.textContent='No time or convenience rating has been guessed. Use the route link to check the exact journey.';
         commuteMeta.textContent='Route data unavailable for this postcode pair.';
       }
     };
     scheduleCommute(panel);
   };
   const refreshSite=()=>{
     // Location lookups may finish after the card is created. Always read fresh pins.
     sites=getSites(p);
     const i=Number(panel.dataset.uxSiteIndex)||0;
     const site=sites[i]||{pc:(p.postcodes||[])[i]||'',lat:null,lng:null};
     const scoped={...p,postcodes:[site.pc]};
     const loc=guides?.lookup(scoped,site.lat===null?[]:[site])||{headline:p.region||'Location',relative:'',connections:'Check precise location.',detail:'',source:'tfl'};
     activeSite=site;activeLocation=loc;
     siteTitle.textContent=siteName(p,site,i,sites.length);
     count.textContent=sites.length>1?'Site '+(i+1)+' of '+sites.length+' · '+site.pc:site.pc;
     headline.textContent=loc.headline+(loc.relative?' · '+loc.relative:'');
     const hubNote=loc.hub?'A transit link below checks a route to '+loc.hub+'. This is a useful London connection, not a guarantee that it is the nearest or fastest option.':'';
     info.textContent=[loc.connections,hubNote,sites.length>1?'Each training site may need a different commute.':loc.detail||''].filter(Boolean).join(' ');
     foot.textContent=sites.length>1?'Showing postcode '+site.pc+' only. Use the arrows for the other site.':'Programme postcode: '+(site.pc||'Not supplied');
     activeLookup=/^Training location/.test(siteTitle.textContent)?site.pc:(siteTitle.textContent+' '+site.pc);
     maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(activeLookup+', UK');
     refreshCommute();
     if(miniMaps.has(map)){try{miniMaps.get(map).remove()}catch{}miniMaps.delete(map)}
     map.innerHTML='<div class="uxMiniMapSkeleton">Map loading…</div>';
     if(panel.isConnected&&panel.getBoundingClientRect().width>0)requestAnimationFrame(()=>mapVisible(map));
   };
   panel._uxRefreshCommute=refreshCommute;
   panel._uxRefreshSite=refreshSite;
   if(sites.length>1){
     const controls=document.createElement('div');controls.className='uxSiteControls';bar.append(controls);
     const addArrow=(text,delta,label)=>{
       const b=document.createElement('button');b.className='btn uxSiteArrow';b.type='button';b.textContent=text;b.setAttribute('aria-label',label);
       b.addEventListener('click',()=>{
         panel.dataset.uxSiteIndex=String((Number(panel.dataset.uxSiteIndex)+delta+sites.length)%sites.length);
         refreshSite();
       });controls.append(b);
     };
     addArrow('‹',-1,'Previous training site');addArrow('›',1,'Next training site');
   }
   refreshSite();
   return panel;
 }
  function enhanceCard(article){
   if(!article||!article.matches('.placement')||article.dataset.uxEnhanced==='1')return;
   const p=byId().get(article.dataset.id);if(!p)return;
   article.dataset.uxEnhanced='1';
   article.tabIndex=0;
   article.setAttribute('aria-label','Select programme '+(p.title||p.employer||p.id));
   article.classList.toggle('uxProgramSelected',article.dataset.id===selectedProgrammeId);
   const title=article.querySelector('.placementTop h3');
   if(title){
     const fullTitle=p.title||p.employer||'Programme';
     title.title=fullTitle+' — click or tap to expand the full title';
     title.tabIndex=0;
     title.setAttribute('role','button');
     title.setAttribute('aria-label','Expand full title: '+fullTitle);
     title.setAttribute('aria-expanded','false');
     const toggleTitle=()=>{
       const isExpanded=title.classList.toggle('uxTitleExpanded');
       title.setAttribute('aria-expanded',String(isExpanded));
       title.setAttribute('aria-label',(isExpanded?'Collapse':'Expand')+' full title: '+fullTitle);
     };
     title.addEventListener('click',event=>{event.stopPropagation();toggleTitle()});
     title.addEventListener('keydown',event=>{
       if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();toggleTitle();}
     });
   }
   try{addTakeHome(article,p)}catch(error){console.warn('Pay display unavailable',error)}
   const fit=article.querySelector('.fit.fitExpanded');
   if(fit){
     fit.classList.add('uxFitWithLocation');
     try{
       const location=locationPanel(p);
       fit.append(location);
       enableMini(location.querySelector('.uxMiniMap'));
       enableCommute(location);
     }catch(error){
       console.error('Could not initialise location for programme '+p.id,error);
       // A missing commute source should never remove the map and directions
       // for an otherwise valid programme, or stop the rest of the cards.
       const panel=document.createElement('section');
       panel.className='uxLocationPanel uxLocationFallback';
       const label=document.createElement('strong');
       label.className='uxLocationTitle';label.textContent='Location & connections';
       panel.append(label);
       const pcs=[...new Set((p.postcodes||[]).filter(Boolean))];
       const detail=document.createElement('p');detail.className='uxLocationInfo';
       detail.textContent=pcs.length?'Training postcode'+(pcs.length>1?'s':'')+': '+pcs.join(' · '):'Training site postcode not provided.';
       panel.append(detail);
       if(pcs.length){
         const links=document.createElement('div');links.className='uxMapLinks';
         for(const pc of pcs){
           const mapLink=document.createElement('a');
           mapLink.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(pc+', UK');
           mapLink.target='_blank';mapLink.rel='noopener noreferrer';mapLink.textContent='View '+pc+' in Google Maps ↗';
           links.append(mapLink);
         }
         panel.append(links);
       }
       fit.append(panel);
     }
   }
   const more=document.createElement('button');more.type='button';more.className='btn uxDetailButton';more.setAttribute('data-ux-expand','');
   more.setAttribute('aria-expanded','false');more.textContent='See full details, location & pay';
   article.append(more);
 }
 const selectProgramme=(id,pan=false)=>{
   if(!id)return;
   selectedProgrammeId=String(id);
   document.querySelectorAll('.placement[data-id]').forEach(card=>{
     card.classList.toggle('uxProgramSelected',card.dataset.id===selectedProgrammeId);
   });
   window.OrielMapInteractive?.select(selectedProgrammeId,pan);
 };
 const cardForEvent=e=>{
   const card=e.target?.closest?.('.placement[data-id]');
   return card&&card.closest('#results,#shortlistList,#mapSelection')?card:null;
 };
 document.addEventListener('mouseover',e=>{
   const card=cardForEvent(e);
   if(card&&!(e.relatedTarget&&card.contains(e.relatedTarget))){
     card.classList.add('uxProgramHover');
     window.OrielMapInteractive?.hover(card.dataset.id,true);
   }
 });
 document.addEventListener('mouseout',e=>{
   const card=cardForEvent(e);
   if(card&&!(e.relatedTarget&&card.contains(e.relatedTarget))){
     card.classList.remove('uxProgramHover');
     window.OrielMapInteractive?.hover(card.dataset.id,false);
   }
 });
 document.addEventListener('click',e=>{
   const card=cardForEvent(e);if(!card)return;
   // Buttons and maps continue to perform their own explicit actions.
   if(e.target.closest('button,a,input,select,textarea,summary,.uxLocationPanel'))return;
   selectProgramme(card.dataset.id,true);
 });
 document.addEventListener('keydown',e=>{
   if(e.key!=='Enter'&&e.key!==' ')return;
   const card=cardForEvent(e);
   if(card&&e.target===card){e.preventDefault();selectProgramme(card.dataset.id,true)}
 });
 const enhancedContainers=['results','shortlistList','mapSelection'];
 function enhanceCards(scope){
   scope?.querySelectorAll('.placement').forEach(article=>{try{enhanceCard(article)}catch(error){console.error('Programme card enhancement failed',article.dataset.id,error)}});
   enhanceRecommendations();
   updateCounts();
   if(drawer?.classList.contains('uxOpen'))renderDrawer();
 }
 function refreshAllPay(){
   document.querySelectorAll('.placement').forEach(article=>{const p=byId().get(article.dataset.id);if(p)addTakeHome(article,p)});
   enhanceRecommendations();
   fillPay();
 }
 document.addEventListener('desk:pay-settings',refreshAllPay);
 document.addEventListener('desk:dataset',()=>{
   byId.previous=null;lastFilterKey='';
   page=1;explore();enhanceCards($('shortlistList'));updateCounts();
 });
 document.addEventListener('click',e=>{
   const toggler=e.target.closest('[data-ux-reco-location]');
   if(toggler){const card=toggler.closest('.reco');const code=card?.querySelector('[data-open]')?.getAttribute('data-open');const p=byId().get(code);if(!card||!p)return;
     let panel=card.querySelector('.uxLocationPanel');if(!panel){panel=locationPanel(p);card.append(panel);enableCommute(panel)}
     const active=card.classList.toggle('uxRecoOpen');
     toggler.textContent=active?'⌃ Hide location':'⌖ Show location & connections';
     toggler.setAttribute('aria-expanded',String(active));
     if(active)requestAnimationFrame(()=>mapVisible(panel.querySelector('.uxMiniMap')));
   }
 });
 document.addEventListener('click',e=>{
   const expand=e.target.closest('[data-ux-expand]');
   if(!expand)return;
   const card=expand.closest('.placement');
   if(!card)return;
   const expanded=card.classList.toggle('uxExpanded');
   card.closest('#shortlistList .rank-row')?.classList.toggle('uxExpanded',expanded);
   expand.textContent=expanded?'Collapse details':'See full details, location & pay';
   expand.setAttribute('aria-expanded',String(expanded));
   const holder=card.querySelector('.uxMiniMap');
   if(expanded&&holder)requestAnimationFrame(()=>{if(miniMaps.has(holder))miniMaps.get(holder).invalidateSize(false);else mapVisible(holder)});
   if(expanded&&!card.querySelector('.desc')){const p=byId().get(card.dataset.id);if(p?.desc){const d=document.createElement('p');d.className='desc';d.textContent=p.desc;card.querySelector('.decision-quick')?.before(d)}}
   if(!expanded&&holder&&miniMaps.has(holder)){try{miniMaps.get(holder).invalidateSize(false)}catch{}}
 });
 document.addEventListener('desk:locations-updated',()=>{
   document.querySelectorAll('.uxLocationPanel').forEach(panel=>panel._uxRefreshSite?.());
 });
 document.addEventListener('desk:commute-origin-changed',()=>{
   document.querySelectorAll('.uxLocationPanel').forEach(panel=>{
     panel._uxRefreshCommute?.();
     enableCommute(panel);
   });
 });
 // Observe the three containers since the original app re-renders them after every decision.
 const pruneDetachedMiniMaps=()=>{for(const [holder,map] of miniMaps){if(holder.isConnected)continue;try{map.remove()}catch{}miniMaps.delete(holder);miniObserver?.unobserve(holder)}};
 const refreshObserved=container=>{
   if(!container)return;
   const observer=new MutationObserver(entries=>{
     if(!entries.some(e=>e.type==='childList'))return;
     pruneDetachedMiniMaps();enhanceCards(container);
   });
   observer.observe(container,{childList:true,subtree:false});
 };
 let uxInitialised=false;
 const init=()=>{
   if(uxInitialised)return true;
   if(!getData().length||typeof explore!=='function'||typeof card!=='function')return false;
   uxInitialised=true;
   refreshObserved($('results'));refreshObserved($('shortlistList'));refreshObserved($('mapSelection'));
   // Updating For You also refreshes net income and start date metadata.
   new MutationObserver(()=>enhanceRecommendations()).observe($('reco'),{childList:true});
   syncHide();updateCounts();fillPay();
   // Preserve location details and date row wrapper, which is loaded by app.js after init.
   explore();
   enhanceCards($('shortlistList'));
   enhanceCards($('mapSelection'));
   enhanceRecommendations();
   return true;
 };
 let attempts=0;
 const timer=setInterval(()=>{
   attempts++;
   if(init()||attempts>160)clearInterval(timer);
 },125);
 document.addEventListener('desk:ready',()=>{if(init())clearInterval(timer)});
 // Public postcode locations are now bundled at page load, so card directions
 // and map pins work immediately without a second network request.
 if(postcodeLocations&&Object.keys(postcodeLocations).length){
   document.addEventListener('desk:cards-ready',()=>{
     enhancedContainers.forEach(id=>enhanceCards($(id)));
   },{once:true});
 }
})();
