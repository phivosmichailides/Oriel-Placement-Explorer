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
   const account=window.PlacementAtlasAccount||{};
   const user=account.getUser?.();
   const member=window.PlacementAtlasMemberProfile?.current?.();
   utility.classList.toggle('paSignedIn',Boolean(user));
   let group=utility.querySelector('.paHeaderIdentity');
   if(!group){
     group=document.createElement('div');
     group.className='paHeaderIdentity';
     const profile=document.createElement('button');
     profile.type='button';
     profile.className='paHeaderProfile';
     profile.innerHTML='<span class="paHeaderPhoto" aria-hidden="true"></span><span class="paHeaderLabel"></span>';
     profile.addEventListener('click',()=>{
       if(typeof switchTab==='function')switchTab('outcome');
       else nav.querySelector('[data-tab="outcome"]')?.click();
     });
     const session=document.createElement('button');
     session.type='button';
     session.className='paHeaderSessionAction';
     session.addEventListener('click',()=>{
       const api=window.PlacementAtlasAccount||{};
       if(api.getUser?.())api.signOut?.();
       else api.openSignIn?.();
     });
     group.append(profile,session);
     utility.prepend(group);
   }
   const profile=group.querySelector('.paHeaderProfile');
   const session=group.querySelector('.paHeaderSessionAction');
   const metadata=user?.user_metadata||{};
   const full=String(metadata.full_name||metadata.name||'').trim();
   const firstName=String(member?.firstName||metadata.given_name||full.split(/\s+/)[0]||user?.email?.split('@')[0]||'there').trim();
   const greeting=user?'Hi, '+firstName:'Profile';
   profile.querySelector('.paHeaderLabel').textContent=greeting;
   profile.title=user?'Open profile · '+firstName:'Open profile';
   profile.setAttribute('aria-label',user?'Open '+firstName+' profile':'Open profile');
   session.textContent=user?'Log out':'Sign in';
   session.setAttribute('aria-label',user?'Log out of Placement Atlas':'Sign in to Placement Atlas');
   const face=profile.querySelector('.paHeaderPhoto');
   face.replaceChildren();
   if(user&&avatar.url){
     const img=document.createElement('img');img.src=avatar.url;img.alt='';face.append(img);
   }else if(user){
     const initials=String(member?[member.firstName,member.lastName].filter(Boolean).join(' '):full||firstName)
       .split(/\s+/).filter(Boolean).slice(0,2).map(s=>Array.from(s)[0]||'').join('').toUpperCase();
     face.textContent=initials||'PA';
   }else{
     face.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.4-4 3-6.1 7.2-6.1s6.8 2.1 7.2 6.1"/></svg>';
   }
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
