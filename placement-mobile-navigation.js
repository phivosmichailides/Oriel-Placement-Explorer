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
 }
 // Keep the small account/theme controls between the brand and navigation.
 // Preferences remains the final item on the right-hand side of the banner.
 if(utility.parentNode!==header||utility.nextElementSibling!==nav)header.insertBefore(utility,nav);
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
   const member=window.PlacementAtlasMemberProfile?.current?.();
   let control=utility.querySelector('.paHeaderProfile');
   utility.classList.toggle('paSignedIn',Boolean(user));
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
   const memberName=member?[member.firstName,member.lastName].filter(Boolean).join(' '):'';
   const identity=String(user?(memberName||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Your profile'):'Profile');
   control.querySelector('.paHeaderLabel').textContent=identity.split(' ')[0]||'Profile';
   control.setAttribute('aria-label',user?'Open '+identity+' profile':'Open profile and sign in');
   const face=control.querySelector('.paHeaderPhoto');face.replaceChildren();
   if(avatar.url){const img=document.createElement('img');img.src=avatar.url;img.alt='';face.append(img);}
   else face.textContent=user?(memberName?memberName.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase():identity.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()):'PA';
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
   const names={explore:'Explore',shortlist:'Shortlist',outcome:'Profile',simulator:'Oriel Simulation',tinderMode:'Swipe Mode',learn:'Learning Hub',prefs:'Preferences'};
   const normalise=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
   const tabs=[...nav.querySelectorAll(':scope > .tab')];
   const keyed=new Set(tabs.map(tab=>tab.dataset.tab).filter(Boolean));
   const seenKeys=new Set(),seenLabels=new Set();
   tabs.forEach(tab=>{
     const key=tab.dataset.tab||'';
     const raw=normalise(tab.textContent);
     let label=names[key]||'';
     if(key==='simulator'||/oriel simulation/.test(raw))label='Oriel Simulation';
     if(key==='tinderMode'||/swipe mode|tinder mode/.test(raw))label='Swipe Mode';
     if(!label)return;
     const inferredKey=label==='Oriel Simulation'?'simulator':label==='Swipe Mode'?'tinderMode':key;
     // Only the canonical tab IDs may own these two labels.
     if((label==='Oriel Simulation'&&key&&key!=='simulator')||(label==='Swipe Mode'&&key&&key!=='tinderMode')){tab.remove();return;}
     // A legacy label-only button must never displace the working data-tab button.
     if(!key&&keyed.has(inferredKey)){tab.remove();return;}
     if((key&&seenKeys.has(key))||seenLabels.has(label.toLowerCase())){tab.remove();return;}
     if(key)seenKeys.add(key);
     seenLabels.add(label.toLowerCase());
     // Preserve only the icon. Rebuild the label so stale text nodes and
     // duplicate "Tinder Mode" / "Oriel Simulation" text cannot survive.
     const icons=[...tab.children].filter(child=>
       child.matches('svg.tab-icon,.simNavIcon,.tdNavFlame')
     );
     const text=document.createElement('span');
     text.className='atlasTabLabel';
     text.textContent=label;
     tab.replaceChildren(...icons,text);
     tab.setAttribute('aria-label',label);
   });
   const more=nav.querySelector(':scope > .atlasMoreNav');
   if(more){
     const menu=more.querySelector('.atlasMoreMenu');
     if(menu)[...menu.querySelectorAll(':scope > .tab')].forEach(tab=>nav.insertBefore(tab,more));
     more.remove();
   }
   nav.querySelectorAll('.atlasMoreMenu > .tab').forEach(tab=>nav.append(tab));
 };
 tidyTabs();
 placeUtilities();
 if(tools)new MutationObserver(()=>requestAnimationFrame(placeUtilities)).observe(tools,{childList:true,subtree:true});
 new MutationObserver(()=>requestAnimationFrame(tidyTabs)).observe(nav,{childList:true,subtree:false});
 window.addEventListener('placement:avatar',event=>{avatar=event.detail||{url:'',initials:'PA',name:''};headerAccount();});
 document.addEventListener('placement:auth-changed',headerAccount);
 document.addEventListener('placement:member-profile',headerAccount);
 document.addEventListener('desk:after-navigation',()=>{
   const current=document.querySelector('.panel.active')?.id||'explore';
   nav.querySelectorAll(':scope > .tab').forEach(tab=>tab.classList.toggle('atlasParentActive',tab.dataset.tab==='explore'&&(current==='foryou'||current==='compare')));
 });
})();
