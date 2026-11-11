'use strict';
(()=>{
 const header=document.querySelector('.shell > header.top.atlasStickyHeader')||document.querySelector('.shell > header.top');
 const nav=header?.querySelector('nav.tabs')||document.querySelector('nav.tabs');
 if(!header||!nav)return;
 header.classList.add('atlasStickyHeader');
 nav.setAttribute('aria-label','Main navigation');
 let utility=header.querySelector('.atlasHeaderUtilities');
 if(!utility){
   utility=document.createElement('div');
   utility.className='atlasHeaderUtilities';
   header.append(utility);
 }
 const tools=document.getElementById('atlasHeaderTools');
 let avatar={url:'',initials:'PA',name:''};
 const ensureThemeIcon=button=>{
   if(!button)return;
   let glyph=button.querySelector('.themeGlyph');
   if(!glyph){glyph=document.createElement('span');glyph.className='themeGlyph';glyph.setAttribute('aria-hidden','true');button.replaceChildren(glyph);}
   if(!glyph.querySelector('svg')){
     glyph.innerHTML='<svg class="themeIcon themeIconMoon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.802a6 6 0 0 0 8.27 8.27c.342-.215.824-.004.801.4Z"/></svg>';
   }
   button.setAttribute('aria-label','Change colour theme');
 };
 const headerAccount=()=>{
   const user=window.PlacementAtlasAccount?.getUser?.();
   let control=utility.querySelector('.paHeaderProfile');
   if(!user){control?.remove();utility.classList.remove('paSignedIn');return;}
   utility.classList.add('paSignedIn');
   if(!control){
     control=document.createElement('button');
     control.type='button';control.className='paHeaderProfile';
     control.setAttribute('aria-label','Open profile');
     control.innerHTML='<span class="paHeaderPhoto"><span>PA</span></span><span class="paHeaderLabel"></span>';
     control.addEventListener('click',()=>{
       if(typeof switchTab==='function')switchTab('outcome');
       else nav.querySelector('[data-tab="outcome"]')?.click();
     });
     utility.prepend(control);
   }
   const identity=String(avatar.name||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Pharmacist');
   control.querySelector('.paHeaderLabel').textContent=identity;
   const face=control.querySelector('.paHeaderPhoto');face.replaceChildren();
   if(avatar.url){const img=document.createElement('img');img.src=avatar.url;img.alt='';face.append(img);}
   else face.textContent=String(avatar.initials||identity.split(' ').map(x=>x[0]).slice(0,2).join('')).toUpperCase()||'PA';
 };
 const placeUtilities=()=>{
   const account=tools?.querySelector('.cloudAccount')||document.querySelector('.cloudAccount');
   const theme=document.getElementById('themeToggle');
   if(account&&account.parentNode!==utility)utility.prepend(account);
   if(theme&&theme.parentNode!==utility)utility.append(theme);
   ensureThemeIcon(theme);
   const actions=tools?.querySelector('.actions');
   if(actions&&!actions.children.length)actions.remove();
   headerAccount();
 };
 const tidyTabs=()=>{
   const names={explore:'Explore',shortlist:'Shortlist',outcome:'Profile',simulator:'Oriel Simulation',tinderMode:'Swipe Mode',prefs:'Preferences'};
   nav.querySelectorAll(':scope > .tab').forEach(tab=>{
     const key=tab.dataset.tab;
     if(!names[key])return;
     const span=tab.querySelector('span');
     if(span)span.textContent=names[key];
     else{
       const icon=tab.querySelector('svg');
       if(icon){const label=document.createElement('span');label.textContent=names[key];tab.append(label);}
       else tab.textContent=names[key];
     }
     tab.setAttribute('aria-label',names[key]);
   });
   nav.querySelector(':scope > .atlasMoreNav')?.remove();
 };
 tidyTabs();
 placeUtilities();
 if(tools)new MutationObserver(()=>requestAnimationFrame(placeUtilities)).observe(tools,{childList:true,subtree:true});
 new MutationObserver(()=>requestAnimationFrame(tidyTabs)).observe(nav,{childList:true,subtree:false});
 window.addEventListener('placement:avatar',event=>{avatar=event.detail||{url:'',initials:'PA',name:''};headerAccount();});
 document.addEventListener('placement:auth-changed',headerAccount);
 document.addEventListener('desk:after-navigation',()=>{
   const current=document.querySelector('.panel.active')?.id||'explore';
   nav.querySelectorAll(':scope > .tab').forEach(tab=>tab.classList.toggle('atlasParentActive',tab.dataset.tab==='explore'&&(current==='foryou'||current==='compare')));
 });
})();
