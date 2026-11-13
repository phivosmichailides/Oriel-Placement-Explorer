'use strict';
/* Context-aware floating controls.
   They should never obscure the site footer, regardless of viewport size,
   browser zoom, page zoom, or the currently selected application tab. */
(()=>{
 const footer=document.querySelector('footer.app-footer.atlasFooter');
 if(!footer)return;
 let pending=0;
 const sync=()=>{
   pending=0;
   const rect=footer.getBoundingClientRect();
   // The footer may be taller than a small phone viewport: hide as soon as
   // any part of it is visible; restore the controls above it.
   const touchesFooter=rect.top<window.innerHeight-12&&rect.bottom>12;
   document.body.classList.toggle('atlasFooterInView',touchesFooter);
   // Close the quick-filter popover if its launcher just became obscured.
   if(touchesFooter){
     const panel=document.getElementById('uxFloatInner');
     const handle=document.getElementById('uxFloatToggle');
     if(panel&&!panel.hidden)panel.hidden=true;
     handle?.setAttribute('aria-expanded','false');
   }
 };
 const schedule=()=>{
   if(pending)return;
   pending=requestAnimationFrame(sync);
 };
 if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(schedule,{threshold:[0,0.01,0.25,1]});
   observer.observe(footer);
 }
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('desk:after-navigation',schedule);
 document.addEventListener('desk:zoom-change',schedule);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 sync();
})();
