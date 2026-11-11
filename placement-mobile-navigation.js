'use strict';
/* Mobile: two-line header with a swipeable, one-row destination strip.
   Reuses existing tab navigation; no duplicated view or saved state. */
(()=>{
 const header=document.querySelector('.shell > header.top');
 const nav=header?.querySelector('nav.tabs');
 if(!header||!nav)return;
 const utility=document.createElement('div');utility.className='atlasHeaderUtilities';
 header.append(utility);
 let avatar={url:'',initials:'PA',name:''};
 const headerAccount=()=>{
   const user=window.PlacementAtlasAccount?.getUser?.();
   let control=utility.querySelector('.paHeaderProfile');
   if(!user){utility.classList.remove('paSignedIn');control?.remove();return;}
   utility.classList.add('paSignedIn');
   if(!control){
     control=document.createElement('button');
     control.type='button';control.className='paHeaderProfile';
     control.setAttribute('aria-label','Open profile');
     control.innerHTML='<span class="paHeaderPhoto"><span>PA</span></span><span class="paHeaderLabel"></span>';
     control.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('outcome');else document.querySelector('[data-tab="outcome"]')?.click()});
     utility.prepend(control);
   }
   const identity=String(avatar.name||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Account');
   control.querySelector('.paHeaderLabel').textContent=identity;
   const face=control.querySelector('.paHeaderPhoto');
   face.replaceChildren();
   if(avatar.url){
     const img=document.createElement('img');img.src=avatar.url;img.alt='';face.append(img);
   }else{
     const initials=String(avatar.initials||identity.split(' ').map(x=>x[0]).slice(0,2).join('')).toUpperCase();
     face.textContent=initials||'PA';
   }
 };
 const placeUtilities=()=>{
   const theme=document.getElementById('themeToggle');
   const auth=document.getElementById('orielCloudAccount');
   if(auth&&auth.parentNode!==utility)utility.prepend(auth);
   if(theme&&theme.parentNode!==utility)utility.append(theme);
   if(auth&&auth.dataset.paHeaderObserved!=='1'){
     auth.dataset.paHeaderObserved='1';
     new MutationObserver(headerAccount).observe(auth,{childList:true,subtree:true});
   }
   headerAccount();
 };
 window.addEventListener('placement:avatar',e=>{avatar=e.detail||{url:'',initials:'PA',name:''};headerAccount()});
 placeUtilities();
 const tools=document.getElementById('atlasHeaderTools');
 if(tools)new MutationObserver(placeUtilities).observe(tools,{childList:true,subtree:true});
 const outcome=nav.querySelector('[data-tab="outcome"]');
 if(outcome){
   const text=outcome.querySelector('span');
   if(text)text.textContent='Profile';
   const svg=outcome.querySelector('svg');
   if(svg){svg.innerHTML='<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>';}
   outcome.setAttribute('title','Your account, preferences and Oriel outcome');
 }
 const dests=[['simulator','Oriel Simulation'],['tinderMode','Swipe Mode'],['prefs','Preferences']];
 for(const [target,title] of dests){
   if(nav.querySelector('[data-pa-mobile-target="'+target+'"]'))continue;
   const btn=document.createElement('button');
   btn.type='button';btn.className='tab paMobileNavTab';
   btn.dataset.paMobileTarget=target;btn.textContent=title;
   btn.addEventListener('click',()=>{
     if(typeof switchTab==='function')switchTab(target);
     else document.querySelector('.atlasMoreMenu [data-tab="'+target+'"]')?.click();
     sync();
   });
   nav.append(btn);
 }
 const sync=()=>{
   const view=document.querySelector('.panel.active')?.id||document.body.dataset.atlasView||'explore';
   for(const btn of nav.querySelectorAll('.paMobileNavTab')){
     const active=btn.dataset.paMobileTarget===view;
     btn.classList.toggle('active',active);
     if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
   }
   const selected=nav.querySelector('.paMobileNavTab.active')||
     nav.querySelector(':scope > .tab.active')||
     nav.querySelector('[data-tab="explore"]');
   if(window.matchMedia('(max-width:1120px)').matches&&selected){
     const centre=selected.offsetLeft+selected.offsetWidth/2;
     const currentLeft=nav.scrollLeft,currentRight=currentLeft+nav.clientWidth;
     if(centre<currentLeft+selected.offsetWidth/2||centre>currentRight-selected.offsetWidth/2){
       nav.scrollTo({left:Math.max(0,centre-nav.clientWidth/2),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
     }
   }
 };
 document.addEventListener('desk:after-navigation',sync);
 window.addEventListener('resize',sync,{passive:true});
 const footer=document.querySelector('.app-footer [data-atlas-footer-tab="outcome"]');
 if(footer)footer.textContent='Profile & My Outcome';
 const initial=()=>{placeUtilities();sync()};
 initial();setTimeout(initial,0);
})();
