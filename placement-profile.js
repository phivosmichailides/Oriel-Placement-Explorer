'use strict';
/* Placement Atlas — profile-first account area. Existing outcome IDs, saved
   decisions, sign-out protection, and cloud workspace are not replaced. */
(()=>{
 const $=id=>document.getElementById(id);
 const outcome=$('outcome');if(!outcome)return;
 const bridge=()=>window.PlacementAtlasAccount||{};
 const cameraSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.5"/></svg>';
 const old=[...outcome.children];
 const wrap=document.createElement('div');wrap.className='paProfileHero';
 wrap.innerHTML='<div class="paProfileHeading"><div class="eyebrow">YOUR ACCOUNT & WORKSPACE</div><h2>Profile</h2><p>Your personal space for Placement Atlas.</p></div>'+
 '<section class="paProfileCard" aria-label="Account information">'+
 '<div class="paAvatarArea"><button class="paAvatarButton" id="paAvatarButton" type="button" aria-label="Upload profile picture"><span id="paAvatarLetters">PA</span><span class="paCamera">'+cameraSvg+'</span></button><span class="paAvatarCaption" id="paAvatarCaption">Not signed in</span></div>'+
 '<div class="paProfileIdentity"><div class="paDisplayName" id="paProfileName">Guest</div><div class="paEmail" id="paProfileEmail">Sign in to save your workspace across devices.</div>'+
 '<div class="paProfileActions"><button class="btn primary" type="button" id="paProfileAuth">Sign in</button><button class="btn" type="button" id="paNameEdit" hidden>Edit name</button><button class="btn" type="button" id="paAvatarRemove" hidden>Remove photo</button></div>'+
 '<div class="paEditName" id="paEditName"><input id="paNameInput" maxlength="80" autocomplete="name" aria-label="Display name"><button class="btn primary" type="button" id="paNameSave">Save name</button><button class="btn" type="button" id="paNameCancel">Cancel</button></div>'+
 '<div role="status" aria-live="polite" class="paProfileMessage" id="paProfileMessage"></div></div></section>'+
 '<section class="paProfileSettings"><div><strong>Appearance</strong><p>Follow your device automatically, or choose your own light or dark mode.</p></div><div class="paThemeModes" role="group" aria-label="Appearance preference"><button type="button" data-pa-theme="auto">Follow device</button><button type="button" data-pa-theme="light">Light</button><button type="button" data-pa-theme="dark">Dark</button></div></section>';
 const oldContent=document.createElement('div');oldContent.className='paOutcomeBody';
 old.forEach(el=>oldContent.append(el));
 const details=document.createElement('details');details.className='paOutcomeDetails';details.id='paOutcomeDetails';
 const summary=document.createElement('summary');summary.textContent='My Outcome';
 details.append(summary,oldContent);
 outcome.append(wrap,details);
 // Open existing outcome data automatically, but keep a clean Profile first visit.
 try{
   const data=JSON.parse(localStorage.getItem('oriel-desk-outcome-v1')||'null');
   if(data?.programmeId||data?.notes||data?.receivedDate)details.open=true;
 }catch{}
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;file.id='paAvatarFile';
 outcome.append(file);
 const photo=$('paAvatarButton'),letters=$('paAvatarLetters'),caption=$('paAvatarCaption');
 const name=$('paProfileName'),email=$('paProfileEmail'),message=$('paProfileMessage');
 const authBtn=$('paProfileAuth'),editBtn=$('paNameEdit'),removeBtn=$('paAvatarRemove');
 let activeId='',avatarObjectUrl='',busy=false,photoLoadedFor='';
 const say=(msg,tone='neutral')=>{message.textContent=msg;message.dataset.tone=tone};
 const setAvatar=url=>{
   photo.querySelector('img')?.remove();
   letters.hidden=Boolean(url);
   if(url){const img=document.createElement('img');img.src=url;img.alt='';photo.prepend(img);}
   window.dispatchEvent(new CustomEvent('placement:avatar',{detail:{url:url||'',initials:letters.textContent,name:caption.textContent}}));
 };
 const initials=text=>String(text||'PA').split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'PA';
 const releaseAvatar=()=>{if(avatarObjectUrl){URL.revokeObjectURL(avatarObjectUrl);avatarObjectUrl='';}setAvatar('')};
 const loadAvatar=async user=>{
   const client=bridge().getClient?.();if(!client||!user||photoLoadedFor===user.id)return;
   photoLoadedFor=user.id;
   try{
     const res=await client.storage.from('placement-profile-photos').download(user.id+'/avatar.webp');
     if(bridge().getUser?.()?.id!==user.id)return;
     if(res.error){if(/not found|404|does not exist/i.test(res.error.message||''))return;throw res.error;}
     if(res.data){releaseAvatar();avatarObjectUrl=URL.createObjectURL(res.data);setAvatar(avatarObjectUrl)}
   }catch(e){if(bridge().getUser?.()?.id===user.id)say('Your profile photo could not be loaded.','error')}
 };
 const refresh=()=>{
   const user=bridge().getUser?.()||null;
   const label=String(user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'Your account');
   const newId=user?.id||'';
   if(activeId!==newId){releaseAvatar();photoLoadedFor='';activeId=newId;say('');}
   name.textContent=user?label:'Guest';
   caption.textContent=user?label:'Not signed in';
   email.textContent=user?.email||'Sign in to save your workspace across devices.';
   letters.textContent=initials(label);
   photo.disabled=!user;photo.setAttribute('aria-label',user?'Change profile photo':'Sign in before uploading a photo');
   authBtn.textContent=user?'Sign out':'Sign in';
   editBtn.hidden=!user;removeBtn.hidden=!user;
   if(user)loadAvatar(user);
   syncMode();
 };
 const currentMode=()=>{try{const mode=localStorage.getItem('oriel-desk-theme-v1');return mode==='light'||mode==='dark'?mode:'auto'}catch{return 'auto'}};
 const effectiveTheme=mode=>mode==='auto'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
 const syncMode=()=>{
   const mode=currentMode();
   wrap.querySelectorAll('[data-pa-theme]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.paTheme===mode)));
 };
 const applyMode=mode=>{
   try{if(mode==='auto')localStorage.removeItem('oriel-desk-theme-v1');else localStorage.setItem('oriel-desk-theme-v1',mode)}catch{}
   const theme=effectiveTheme(mode);
   document.documentElement.setAttribute('data-theme',theme);
   const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#141719':'#f5f5f2';
   const button=$('themeToggle');
   if(button){button.setAttribute('aria-label','Switch to '+(theme==='dark'?'light':'dark')+' mode');button.setAttribute('aria-pressed',String(theme==='dark'))}
   syncMode();
   document.dispatchEvent(new CustomEvent('desk:palette'));
 };
 wrap.querySelectorAll('[data-pa-theme]').forEach(btn=>btn.addEventListener('click',()=>applyMode(btn.dataset.paTheme)));
 document.addEventListener('click',e=>{if(e.target?.id==='themeToggle'||e.target?.closest?.('#themeToggle'))queueMicrotask(syncMode)});
 const system=window.matchMedia?.('(prefers-color-scheme: dark)');
 system?.addEventListener?.('change',()=>{if(currentMode()==='auto')applyMode('auto')});
 authBtn.addEventListener('click',()=>{const api=bridge();if(api.getUser?.())api.signOut?.();else api.openSignIn?.()});
 photo.addEventListener('click',()=>{if(bridge().getUser?.()&&!busy)file.click()});
 const edit=$('paEditName'),input=$('paNameInput');
 editBtn.addEventListener('click',()=>{edit.classList.add('is-open');input.value=name.textContent;input.focus()});
 $('paNameCancel').addEventListener('click',()=>edit.classList.remove('is-open'));
 $('paNameSave').addEventListener('click',async()=>{
   const client=bridge().getClient?.(),user=bridge().getUser?.();
   if(!user||!client)return;
   const value=input.value.trim();
   if(!value||value.length>80){say('Enter a name up to 80 characters.','error');return;}
   say('Saving name…');try{
     const res=await client.auth.updateUser({data:{full_name:value}});
     if(res.error)throw res.error;
     name.textContent=value;caption.textContent=value;letters.textContent=initials(value);
     edit.classList.remove('is-open');say('Name updated.','success');
     window.dispatchEvent(new CustomEvent('placement:avatar',{detail:{url:avatarObjectUrl,initials:letters.textContent,name:value}}));
   }catch(err){say('Could not update name: '+(err.message||'Try again.'),'error')}
 });
 const squareWebp=async raw=>{
   if(raw.size>6*1024*1024)throw new Error('Please choose an image under 6 MB.');
   const url=URL.createObjectURL(raw);
   try{
     const image=await new Promise((resolve,reject)=>{
       const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cannot read this photo.'));img.src=url;
     });
     const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo processing unavailable.');
     const side=Math.min(image.naturalWidth,image.naturalHeight);
     ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,320,320);
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.80));
     if(!blob||blob.type!=='image/webp')throw new Error('This browser cannot prepare the image. Please try another format.');
     if(blob.size>1048576)throw new Error('The resulting picture is too large.');
     return blob;
   }finally{URL.revokeObjectURL(url)}
 };
 file.addEventListener('change',async()=>{
   const original=file.files?.[0];file.value='';if(!original)return;
   const user=bridge().getUser?.(),client=bridge().getClient?.();if(!user||!client)return;
   if(!/^image\/(png|jpeg|webp)$/.test(original.type)){say('Choose a JPG, PNG or WebP picture.','error');return}
   busy=true;photo.disabled=true;say('Uploading photo…');
   try{
     const blob=await squareWebp(original);
     const res=await client.storage.from('placement-profile-photos').upload(user.id+'/avatar.webp',blob,{contentType:'image/webp',upsert:true,cacheControl:'60'});
     if(res.error)throw res.error;
     if(bridge().getUser?.()?.id!==user.id)return;
     releaseAvatar();avatarObjectUrl=URL.createObjectURL(blob);setAvatar(avatarObjectUrl);
     photoLoadedFor=user.id;say('Profile photo saved privately.','success');
   }catch(err){say('Photo upload failed: '+(err.message||'Try again.'),'error')}
   finally{busy=false;photo.disabled=false}
 });
 removeBtn.addEventListener('click',async()=>{
   const user=bridge().getUser?.(),client=bridge().getClient?.();if(!user||!client)return;
   removeBtn.disabled=true;say('Removing photo…');
   try{const res=await client.storage.from('placement-profile-photos').remove([user.id+'/avatar.webp']);if(res.error)throw res.error;releaseAvatar();photoLoadedFor=user.id;say('Profile photo removed.','success');}
   catch(err){say('Could not remove photo: '+(err.message||'Try again.'),'error')}finally{removeBtn.disabled=false}
 });
 const authHost=$('orielCloudAccount')||document.querySelector('.cloudAccount');
 if(authHost)new MutationObserver(()=>queueMicrotask(refresh)).observe(authHost,{childList:true,subtree:true});
 document.addEventListener('placement:auth-changed',refresh);
 window.addEventListener('pageshow',refresh);
 refresh();
})();
