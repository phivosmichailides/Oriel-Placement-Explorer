'use strict';
/* Small presentation-only repairs. Saved programme decisions and priority
   numbers remain in the original app state. */
(()=>{
 const select=document.getElementById('shortlistViewOrder');
 const list=document.getElementById('shortlistList');
 if(select&&list){
   const key='placement-atlas-shortlist-display-order-v1';
   let order='asc';
   try{order=localStorage.getItem(key)==='desc'?'desc':'asc'}catch{}
   select.value=order;
   let scheduled=false;
   const rank=row=>{
     const value=row.querySelector('.rank-controls strong')?.textContent||'';
     const n=Number(String(value).replace(/[^\d]/g,''));
     return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER;
   };
   const apply=()=>{
     const rows=[...list.children].filter(row=>row.classList.contains('rank-row'));
     if(rows.length<2)return;
     const sorted=[...rows].sort((a,b)=>(order==='desc'?-1:1)*(rank(a)-rank(b)));
     if(sorted.some((row,index)=>row!==rows[index]))sorted.forEach(row=>list.append(row));
   };
   const schedule=()=>{
     if(scheduled)return;scheduled=true;
     requestAnimationFrame(()=>{scheduled=false;apply()});
   };
   select.addEventListener('change',()=>{
     order=select.value==='desc'?'desc':'asc';
     try{localStorage.setItem(key,order)}catch{}
     apply();
   });
   new MutationObserver(schedule).observe(list,{childList:true});
   document.addEventListener('desk:after-navigation',event=>{if(event.detail?.to==='shortlist')schedule()});
   schedule();
 }

 const removeMiniMapClose=()=>{
   const roots=document.querySelectorAll(
     '#results .placement .uxLocationPanel,#results .placement .uxMiniMap,'+
     '#results .placement .miniMap,#results .placement .mini-map,'+
     '#results .placement .leaflet-container,'+
     '#shortlistList .placement .uxLocationPanel,#shortlistList .placement .uxMiniMap,'+
     '#mapSelection .placement .uxLocationPanel,#mapSelection .placement .uxMiniMap,'+
     '#reco .reco .uxLocationPanel,#reco .reco .uxMiniMap'
   );
   const isClose=control=>{
     const label=(control.getAttribute('aria-label')||'')+' '+(control.getAttribute('title')||'');
     const classes=String(control.className||'');
     const text=String(control.textContent||'').trim();
     return /close/i.test(label)||/popup-close-button|map-close|close-map/i.test(classes)||
       ['×','x','✕','✖'].includes(text.toLowerCase());
   };
   roots.forEach(root=>{
     root.querySelectorAll('button,a,[role="button"],.leaflet-popup-close-button,.maplibregl-popup-close-button,.mapboxgl-popup-close-button')
       .forEach(control=>{if(isClose(control))control.remove()});
   });
   // Some map libraries portal popup controls outside the mini-map element.
   // Remove only a close control whose visible bounds overlap a programme mini-map.
   const maps=document.querySelectorAll('#results .placement .uxMiniMap,#shortlistList .placement .uxMiniMap,#mapSelection .placement .uxMiniMap,#reco .reco .uxMiniMap');
   if(!maps.length)return;
   const controls=document.querySelectorAll('button,a,[role="button"],.leaflet-popup-close-button,.maplibregl-popup-close-button,.mapboxgl-popup-close-button');
   controls.forEach(control=>{
     if(!isClose(control))return;
     const r=control.getBoundingClientRect();
     if(!r.width&&!r.height)return;
     for(const map of maps){
       const m=map.getBoundingClientRect();
       if(r.right>=m.left-12&&r.left<=m.right+12&&r.bottom>=m.top-12&&r.top<=m.bottom+12){
         control.remove();break;
       }
     }
   });
 };
 let closeCleanupScheduled=false;
 const scheduleMiniMapCloseCleanup=()=>{
   if(closeCleanupScheduled)return;closeCleanupScheduled=true;
   requestAnimationFrame(()=>{closeCleanupScheduled=false;removeMiniMapClose()});
 };
 removeMiniMapClose();
 if(document.body)new MutationObserver(scheduleMiniMapCloseCleanup)
   .observe(document.body,{childList:true,subtree:true});
})();
