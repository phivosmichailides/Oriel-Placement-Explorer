'use strict';
/* In-browser session restore, global zoom and non-jumping filters.
   Does not write to the existing Placement Desk shortlist storage. */
(()=>{
 const $=id=>document.getElementById(id);
 const SESSION='oriel-desk-last-view-v1',COLLAPSE='oriel-desk-sidebar-collapsed-v1',ZOOM='oriel-desk-page-zoom-v1';
 const root=document.documentElement,explorePanel=$('explore'),sidebar=$('uxFilterSidebar');
 const storage={get:(s,k)=>{try{return s.getItem(k)}catch{return null}},set:(s,k,v)=>{try{s.setItem(k,v)}catch{}}};
 const S=window.sessionStorage,L=window.localStorage;
 const ids=['search','sector','region','hours','salary','sort','decision','visa'];
 const getTab=()=>document.querySelector('.tab.active')?.dataset.tab||'explore';
 let lastTab=getTab(),restoreDone=false,restoreInProgress=false;
 let collapsed=storage.get(L,COLLAPSE)==='1';
 let zoom=Number(storage.get(L,ZOOM)||100);
 if(!Number.isFinite(zoom)||zoom<70||zoom>130)zoom=100;
 function currentFilters(){const fields={};ids.forEach(id=>fields[id]=$(id)?.value??'');return {fields,quick:typeof quick!=='undefined'?[...quick]:[],hideAvoid:!!$('hideAvoid')?.checked,hideShortlisted:!!$('hideShortlisted')?.checked}}
 const getSaved=()=>{try{const v=JSON.parse(storage.get(S,SESSION)||'null');return v&&v.version===1?v:null}catch{return null}};
 function snapshot(position=true){
   if(restoreInProgress)return;
   const current=getSaved()||{};
   const tab=getTab();
   const positions={...(current.positions||{})};
   if(position)positions[tab]=Math.max(0,Math.round(window.scrollY||0));
   storage.set(S,SESSION,JSON.stringify({version:1,tab,positions,filters:currentFilters(),explorePage:window.uxGetExplorePage?.()||1,savedAt:Date.now()}));
 }
 function applyZoom(next){
   zoom=Math.max(70,Math.min(130,Math.round(next/5)*5));
   root.style.setProperty('--ux-page-zoom',String(zoom/100));
   if($('uxPageZoomValue'))$('uxPageZoomValue').textContent=zoom+'%';
   if($('uxPageZoomIn'))$('uxPageZoomIn').disabled=zoom>=130;
   if($('uxPageZoomOut'))$('uxPageZoomOut').disabled=zoom<=70;
   storage.set(L,ZOOM,String(zoom));
   requestAnimationFrame(()=>{try{placementMap?.invalidateSize(false)}catch{}});
 }
 const adjustScroll=()=>{let y=window.scrollY;requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'})))};
 $('uxPageZoomIn')?.addEventListener('click',()=>{applyZoom(zoom+5);adjustScroll()});
 $('uxPageZoomOut')?.addEventListener('click',()=>{applyZoom(zoom-5);adjustScroll()});
 $('uxPageZoomReset')?.addEventListener('click',()=>applyZoom(100));
 applyZoom(zoom);
 const setCollapsed=(value,save=true)=>{
   collapsed=!!value;explorePanel?.classList.toggle('uxFiltersCollapsed',collapsed);
   const b=$('uxCollapseFilters');if(b){b.setAttribute('aria-expanded',String(!collapsed));b.setAttribute('aria-label',collapsed?'Show filter sidebar':'Collapse filter sidebar');b.title=collapsed?'Show filters':'Hide filters'}
   if(save)storage.set(L,COLLAPSE,collapsed?'1':'0');
   updateFloating();
   requestAnimationFrame(()=>{try{placementMap?.invalidateSize(false)}catch{}});
 };
 $('uxCollapseFilters')?.addEventListener('click',()=>setCollapsed(!collapsed));
 $('uxOpenFilters')?.addEventListener('click',()=>{
   setCollapsed(false);$('uxFloatInner').hidden=true;$('uxFloatToggle')?.setAttribute('aria-expanded','false');
   const target=$('uxFilterSidebar');target?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 const dock=$('uxFloatingTools'),dockToggle=$('uxFloatToggle'),dockInner=$('uxFloatInner'),topBtn=$('uxBackTop');
 setCollapsed(collapsed,false);
 const closeDock=()=>{if(dockInner)dockInner.hidden=true;dockToggle?.setAttribute('aria-expanded','false')};
 dockToggle?.addEventListener('click',()=>{
   if(!dockInner)return;
   dockInner.hidden=!dockInner.hidden;dockToggle.setAttribute('aria-expanded',String(!dockInner.hidden));
   if(!dockInner.hidden)syncFloating();
 });
 document.addEventListener('click',e=>{if(dock&&!dock.contains(e.target))closeDock()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDock()});
 function syncFloating(){
   const s=$('uxFloatSalary'),t=$('uxFloatSort'),v=$('uxFloatHideShortlisted');
   if(s&&$('salary'))s.value=$('salary').value||'';
   if(t&&$('sort'))t.value=$('sort').value||'fit';
   if(v&&$('hideShortlisted'))v.checked=$('hideShortlisted').checked;
 }
 const forward=(from,to)=>{
   const e=$(from),t=$(to);if(!e||!t)return;
   e.addEventListener('change',()=>{
     const oldY=window.scrollY;
     t[e.type==='checkbox'?'checked':'value']=e[e.type==='checkbox'?'checked':'value'];
     t.dispatchEvent(new Event('change',{bubbles:true}));
     requestAnimationFrame(()=>window.scrollTo({top:oldY,behavior:'instant'}));
     snapshot();
   });
 };
 forward('uxFloatSalary','salary');forward('uxFloatSort','sort');forward('uxFloatHideShortlisted','hideShortlisted');
 const isExplore=()=>getTab()==='explore';
 function updateFloating(){
   const y=window.scrollY||0;
   if(dock){
     const visible=isExplore()&&(collapsed||y>300);
     dock.classList.toggle('uxFloatVisible',visible);
     if(!visible)closeDock();
   }
   if(topBtn)topBtn.classList.toggle('uxTopVisible',y>420);
 }
 topBtn?.addEventListener('click',()=>{
   window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 let scrollTimer=0;
 window.addEventListener('scroll',()=>{
   updateFloating();
   if(scrollTimer)return;
   scrollTimer=setTimeout(()=>{scrollTimer=0;snapshot()},230);
 },{passive:true});
 document.addEventListener('desk:after-navigation',e=>{
   lastTab=e.detail?.to||getTab();updateFloating();
   setTimeout(()=>snapshot(),150);
 });
 document.addEventListener('desk:before-navigation',e=>{lastTab=e.detail?.from||getTab();snapshot()});
 // Capture the scroll position before a filter re-renders the results list.
 let pendingY=null;
 const isFilterTarget=e=>e.target.closest?.('#uxFilterSidebar')||e.target.closest?.('#uxExploreToolbar');
 document.addEventListener('input',e=>{if(isFilterTarget(e)&&e.target.id==='search'){pendingY=window.scrollY;requestAnimationFrame(()=>{if(pendingY!==null){window.scrollTo({top:pendingY,behavior:'instant'});pendingY=null}});snapshot()}},true);
 document.addEventListener('change',e=>{
   if(!isFilterTarget(e))return;
   const y=window.scrollY;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{window.scrollTo({top:y,behavior:'instant'});syncFloating();snapshot()}));
 },true);
 document.addEventListener('click',e=>{
   if(!e.target.closest?.('#quick, #resetBtn, #uxHideShortlistedBtn'))return;
   const y=window.scrollY;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{window.scrollTo({top:y,behavior:'instant'});syncFloating();snapshot()}));
 },true);
 window.addEventListener('pagehide',()=>snapshot());
 // Keep whole-interface colours and map-pin colours adjacent, but independent.
 const arrangePreferenceColours=()=>{
   const settings=document.querySelector('#prefs .settings'),appearance=settings?.querySelector('.uxAppearanceSettings');
   if(!settings||!appearance)return false;
   const mapCard=[...settings.querySelectorAll('.settingsCard')].find(c=>c.querySelector('h2')?.textContent.trim()==='Map colours');
   if(!mapCard)return false;
   mapCard.classList.add('uxMapColourSettings');
   if(mapCard.previousElementSibling!==appearance)appearance.after(mapCard);
   mapCard.querySelector('h2').textContent='🗺 Map pin colours';
   const description=mapCard.querySelector('p.muted');
   if(description)description.textContent='Customise the map markers separately from the interface theme. Try the circular swatches below; the desk palette is controlled by the box next to this one.';
   return true;
 };
 let colourTries=0;
 const colourTimer=setInterval(()=>{colourTries++;if(arrangePreferenceColours()||colourTries>150)clearInterval(colourTimer)},140);
 const saved=getSaved();
 function restore(){
   if(!saved||restoreDone)return;
   if(typeof switchTab!=='function'||!document.querySelector('.tab'))return;
   restoreDone=true;restoreInProgress=true;
   const f=saved.filters||{};
   for(const id of ids){
     const input=$(id);if(input&&f.fields&&typeof f.fields[id]==='string'){
       const option=[...input.options||[]].some(x=>x.value===f.fields[id]);
       if(input.tagName==='SELECT'&&!option)continue;
       input.value=f.fields[id];
     }
   }
   if($('hideAvoid'))$('hideAvoid').checked=!!f.hideAvoid;
   if($('hideShortlisted'))$('hideShortlisted').checked=!!f.hideShortlisted;
   if(Array.isArray(f.quick)&&typeof quick!=='undefined'){
     quick=new Set(f.quick);
     document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.toggle('on',quick.has(x.dataset.q)));
   }
   try{explore()}catch{}
   try{window.uxSetExplorePage?.(saved.explorePage||1)}catch{}
   try{if(typeof reco==='function')reco()}catch{}
   const available=new Set([...document.querySelectorAll('.panel')].map(x=>x.id));
   const tab=available.has(saved.tab)?saved.tab:'explore';
   try{switchTab(tab)}catch{}
   const y=Math.max(0,Math.min(Number(saved.positions?.[tab])||0,100000));
   setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
     window.scrollTo({top:y,behavior:'instant'});
     restoreInProgress=false;updateFloating();syncFloating();
   })),160);
 }
 let tries=0;
 const timer=setInterval(()=>{
   tries++;
   if((typeof placements!=='undefined'&&placements.length>0)&&typeof switchTab==='function'){clearInterval(timer);restore()}
   else if(tries>160){clearInterval(timer);restore()}
 },100);
 if(!saved){restoreDone=true;syncFloating();updateFloating()}
})();
