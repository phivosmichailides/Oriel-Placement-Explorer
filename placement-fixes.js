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
})();
