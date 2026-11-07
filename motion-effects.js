'use strict';
/* Sliding tab-selection pill for every page (including runtime-added tabs).
   No polling; recalculates only after navigation, resize, or tab changes. */
(()=>{
 const nav=document.querySelector('nav.tabs');if(!nav)return;
 const marker=document.createElement('span');marker.className='atlasTabIndicator';marker.setAttribute('aria-hidden','true');
 nav.append(marker);nav.classList.add('tabMotionReady');
 let raf=0,ready=false;
 const sync=(animate=true)=>{
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
   const active=nav.querySelector('.tab.active');
   if(!active)return;
   if(!animate||!ready)marker.style.transition='none';
   marker.style.width=active.offsetWidth+'px';
   marker.style.transform='translate3d('+active.offsetLeft+'px,0,0)';
   if(!ready)ready=true;
   if(!animate)requestAnimationFrame(()=>marker.style.removeProperty('transition'));
   else if(marker.style.transition==='none')requestAnimationFrame(()=>marker.style.removeProperty('transition'));
  });
 };
 document.addEventListener('desk:after-navigation',()=>sync(true));
 const observer=new MutationObserver(()=>sync(false));
 observer.observe(nav,{childList:true});
 window.addEventListener('resize',()=>sync(false),{passive:true});
 nav.addEventListener('scroll',()=>sync(false),{passive:true});
 sync(false);
})();
