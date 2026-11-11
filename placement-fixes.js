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
     '#results .placement,'+
     '#mapSelection .placement .uxLocationPanel,#mapSelection .placement .uxMiniMap,#mapSelection .placement .leaflet-container,'+
     '#shortlistList .placement .uxLocationPanel,#shortlistList .placement .uxMiniMap,#shortlistList .placement .leaflet-container,'+
     '.uxDrawerItems .placement .uxLocationPanel,.uxDrawerItems .placement .uxMiniMap,'+
     '#results .placement .uxLocationPanel,#results .placement .uxMiniMap,'+
     '#results .placement .miniMap,#results .placement .mini-map,'+
     '#results .placement .leaflet-container'
   );
   roots.forEach(root=>{
     root.querySelectorAll('button,a,[role="button"]').forEach(control=>{
       const label=(control.getAttribute('aria-label')||'')+' '+(control.getAttribute('title')||'');
       const classes=String(control.className||'');
       const text=String(control.textContent||'').trim();
       if(/close/i.test(label)||/popup-close-button|map-close|close-map/i.test(classes)||
          ['×','x','✕','✖'].includes(text.toLowerCase()))control.remove();
     });
   });
 };
 const results=document.getElementById('results');
 if(results){
   removeMiniMapClose();
   new MutationObserver(()=>requestAnimationFrame(removeMiniMapClose))
     .observe(results,{childList:true,subtree:true});
 }
})();
