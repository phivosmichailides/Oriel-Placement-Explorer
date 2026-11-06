'use strict';
/* Supabase-backed private applicant accounts.
   The browser only receives a publishable/anon key; row security is enforced in Postgres. */
(()=>{
  const TABLE='oriel_user_workspaces';
  const VERSION=1;
  const KEYS=[
    'phivos-desk-v2',
    'phivos-desk-csv-v2',
    'phivos-onboarding-v1',
    'phivos-onboarding-profile-v1',
    'oriel-desk-home-postcode-v1',
    'oriel-simulator-v1',
    'oriel-simulator-zoom-v1',
    'oriel-desk-theme-v1',
    'oriel-desk-palette-v1',
    'oriel-desk-layout-v1',
    'oriel-desk-outcome-v1',
    'oriel-shortlist-view-order-v1',
    'oriel-desk-sidebar-collapsed-v1',
    'oriel-desk-page-zoom-v1',
    'oriel-research-v1'
  ];
  const TRACKED=new Set(KEYS);
  const MARKER='oriel-cloud-user-v1';
  const LAST_SYNC='oriel-cloud-last-sync-v1';
  const LOCAL_CHANGE='oriel-cloud-local-change-v1';
  const $=id=>document.getElementById(id);
  const nativeSet=window.Storage&&Storage.prototype.setItem;
  const nativeRemove=window.Storage&&Storage.prototype.removeItem;
  const cfg=window.ORIEL_SUPABASE_CONFIG||{};
  const configured=typeof cfg.url==='string'&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url.trim())&&typeof cfg.publishableKey==='string'&&cfg.publishableKey.trim().length>10;
  let client=null,currentUser=null,syncActive=false,suppress=false,saving=false,conflictBlocked=false,saveTimer=null;
  let bootUserId='';

  const read=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
  const rawSet=(key,value)=>{if(nativeSet)nativeSet.call(localStorage,key,String(value))};
  const rawRemove=(key)=>{if(nativeRemove)nativeRemove.call(localStorage,key)};
  const isoNow=()=>new Date().toISOString();
  const parseTime=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:0};
  const snapshot=()=>{
    const storage={};
    KEYS.forEach(key=>{const value=read(key);if(value!==null)storage[key]=value});
    return storage;
  };
  const meaningfulLocalData=()=>{
    try{
      const desk=JSON.parse(read('phivos-desk-v2')||'null');
      if(desk&&((desk.marks&&Object.keys(desk.marks).length)||(Array.isArray(desk.compare)&&desk.compare.length)||(desk.prefs&&desk.prefs.onboarding)))return true;
      if(desk&&desk.prefs){
        if(desk.prefs.likes&&desk.prefs.likes!=='London Bridge, Southwark, Borough, Waterloo, Holborn, Bloomsbury, Clerkenwell, Angel, Islington, Shoreditch, Camden, Fitzrovia, Westminster, Vauxhall, Battersea, Kensington, Chelsea, Hammersmith, Fulham, Ealing, Wembley')return true;
        if(desk.prefs.avoids&&desk.prefs.avoids!=='Croydon, Barnet, Wood Green, Morden, New Addington, Romford, Dagenham, Enfield, Lewisham')return true;
      }
    }catch{}
    if(read('phivos-desk-csv-v2')||read('phivos-onboarding-profile-v1')||read('oriel-desk-home-postcode-v1')||read('oriel-desk-outcome-v1')||read('oriel-research-v1'))return true;
    try{
      const sim=JSON.parse(read('oriel-simulator-v1')||'null');
      if(sim&&['preferred','neutral','unwanted'].some(key=>Array.isArray(sim[key])&&sim[key].length))return true;
    }catch{}
    return false;
  };
  const setMarker=(userId,updatedAt)=>{
    rawSet(MARKER,userId);
    rawSet(LAST_SYNC,updatedAt||isoNow());
    rawRemove(LOCAL_CHANGE);
  };
  const applyWorkspace=(workspace,userId,updatedAt)=>{
    if(!workspace||typeof workspace!=='object'||!workspace.storage||typeof workspace.storage!=='object'||Array.isArray(workspace.storage))throw new Error('The saved cloud workspace has an invalid format.');
    suppress=true;
    try{
      KEYS.forEach(key=>{
        if(Object.prototype.hasOwnProperty.call(workspace.storage,key)&&typeof workspace.storage[key]==='string')rawSet(key,workspace.storage[key]);
        else rawRemove(key);
      });
      setMarker(userId,updatedAt||workspace.updatedAt||isoNow());
    }finally{suppress=false}
  };
  const status=(message,tone)=>{
    const node=$('orielCloudStatus');
    if(node){node.textContent=message||'';node.dataset.tone=tone||'neutral'}
  };
  const element=(tag,className,label)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(label!==undefined)node.textContent=label;
    return node;
  };
  const mount=()=>{
    let host=$('orielCloudAccount');
    if(!host){
      host=element('div','cloudAccount');
      host.id='orielCloudAccount';
      const actions=document.querySelector('.top .actions');
      if(actions)actions.prepend(host);
    }
    return host;
  };
  const renderAccount=()=>{
    const host=mount();
    if(!host)return;
    host.replaceChildren();
    const main=element('div','cloudAccountMain');
    if(!configured){
      const button=element('button','btn cloudAccountButton','Cloud accounts setup');
      button.type='button';button.disabled=true;
      main.append(button,element('span','cloudAccountHint','Cloud sync is being configured'));
    }else if(currentUser){
      const identity=element('span','cloudAccountIdentity',(currentUser.user_metadata&&currentUser.user_metadata.full_name)||currentUser.email||'Your account');
      identity.title=currentUser.email||'Signed-in account';
      const signout=element('button','btn cloudAccountButton','Sign out');
      signout.type='button';
      signout.addEventListener('click',async()=>{
        signout.disabled=true;
        status('Signing out…','pending');
        if(syncActive)await flush();
        const result=await client.auth.signOut();
        if(result.error){status('Could not sign out: '+result.error.message,'error');signout.disabled=false;}
      });
      main.append(identity,signout);
    }else{
      const button=element('button','btn primary cloudAccountButton','Sign in to save');
      button.type='button';
      button.addEventListener('click',showAuthModal);
      main.append(button,element('span','cloudAccountHint','Private cloud backup'));
    }
    const state=element('span','cloudAccountStatus');
    state.id='orielCloudStatus';
    state.setAttribute('role','status');
    state.setAttribute('aria-live','polite');
    main.append(state);
    host.append(main);
    if(!configured)status('Add the Supabase project URL and publishable key to activate accounts.','pending');
    else if(currentUser)status('Checking your saved workspace…','pending');
    else status('Your data stays in this browser until you sign in.','neutral');
  };
  const redirectUrl=()=>window.location.origin+window.location.pathname;
  const showAuthModal=()=>{
    if(!client||!configured)return;
    const overlay=element('div','cloudOverlay');
    overlay.innerHTML='<section class="cloudDialog" role="dialog" aria-modal="true" aria-labelledby="cloudDialogTitle"><button type="button" class="cloudClose" aria-label="Close">×</button><div class="cloudEyebrow">YOUR PRIVATE WORKSPACE</div><h2 id="cloudDialogTitle">Save your Placement Desk</h2><p class="cloudLead">Sign in to keep your profile, shortlist, notes, simulation and outcome synchronised across devices.</p><button type="button" class="btn primary cloudGoogleButton" id="cloudGoogleSignIn"><span aria-hidden="true">G</span> Continue with Google</button><div class="cloudOr"><span>or use email</span></div><label class="cloudEmailLabel" for="cloudEmail">Email address</label><div class="cloudEmailRow"><input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com"><button type="button" class="btn" id="cloudEmailSignIn">Send link</button></div><p class="cloudFine">By signing in, you agree to save the current browser workspace to your private account. Your existing shortlist will be migrated if this account has no saved workspace. You can sign out at any time.</p><p class="cloudPrivacy">Only your authenticated account can access its workspace. Your commute starting point is included if you have saved one.</p><p class="cloudError" id="cloudAuthError" role="status"></p></section>';
    document.body.append(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.cloudClose').addEventListener('click',close);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
    overlay.querySelector('#cloudGoogleSignIn').addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;button.textContent='Opening Google…';
      const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl(),queryParams:{prompt:'select_account'}}});
      if(result.error){overlay.querySelector('#cloudAuthError').textContent=result.error.message;button.disabled=false;button.textContent='Continue with Google';}
    });
    overlay.querySelector('#cloudEmailSignIn').addEventListener('click',async event=>{
      const input=overlay.querySelector('#cloudEmail'),button=event.currentTarget,email=input.value.trim();
      if(!email||!input.checkValidity()){overlay.querySelector('#cloudAuthError').textContent='Enter a valid email address.';input.focus();return;}
      button.disabled=true;button.textContent='Sending…';
      const result=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectUrl()}});
      if(result.error){overlay.querySelector('#cloudAuthError').textContent=result.error.message;button.disabled=false;button.textContent='Send link';}
      else{overlay.querySelector('#cloudAuthError').textContent='Check your inbox for your secure sign-in link.';button.textContent='Link sent';}
    });
  };
  const chooseWorkspace=()=>{
    return new Promise(resolve=>{
      const overlay=element('div','cloudOverlay');
      overlay.innerHTML='<section class="cloudDialog" role="dialog" aria-modal="true" aria-labelledby="cloudConflictTitle"><div class="cloudEyebrow">WORKSPACE CHOICE</div><h2 id="cloudConflictTitle">Which saved version should we keep?</h2><p class="cloudLead">This browser already has applicant data, and this account also has a saved workspace. Choose one source. The other copy will be replaced, so export a backup first if you want to keep both.</p><div class="cloudConflictChoices"><button type="button" class="btn primary" id="cloudUseRemote">Use my cloud workspace</button><button type="button" class="btn" id="cloudUseLocal">Keep this browser’s workspace</button></div><p class="cloudPrivacy">Your workspace remains private to your account.</p></section>';
      document.body.append(overlay);
      overlay.querySelector('#cloudUseRemote').addEventListener('click',()=>{overlay.remove();resolve('cloud')});
      overlay.querySelector('#cloudUseLocal').addEventListener('click',()=>{overlay.remove();resolve('local')});
    });
  };
  const fetchWorkspace=async(userId)=>{
    const result=await client.from(TABLE).select('workspace,updated_at').eq('user_id',userId).maybeSingle();
    if(result.error)throw result.error;
    return result.data||null;
  };
  const writeWorkspace=async(user,reason)=>{
    const updatedAt=isoNow();
    const workspace={version:VERSION,updatedAt:updatedAt,storage:snapshot()};
    const result=await client.from(TABLE).upsert({user_id:user.id,workspace:workspace,updated_at:updatedAt},{onConflict:'user_id'}).select('updated_at').single();
    if(result.error)throw result.error;
    const confirmed=result.data&&result.data.updated_at?result.data.updated_at:updatedAt;
    setMarker(user.id,confirmed);
    status(reason||'Saved securely to your account.','success');
    return confirmed;
  };
  const prepareUser=async(user)=>{
    if(!user||!user.id||!client)return;
    currentUser=user;
    renderAccount();
    status('Checking your saved workspace…','pending');
    const row=await fetchWorkspace(user.id);
    if(!row){
      await writeWorkspace(user,'Your existing browser workspace has been saved to your account.');
      bootUserId=user.id;
      return;
    }
    const remoteWorkspace=row.workspace||{};
    const remoteAt=row.updated_at||remoteWorkspace.updatedAt||isoNow();
    const previousUser=read(MARKER)||'';
    const lastSync=parseTime(read(LAST_SYNC));
    const localChange=Number(read(LOCAL_CHANGE)||0);
    const remoteTime=parseTime(remoteAt);
    const localExists=meaningfulLocalData();
    let choice='cloud';
    if(previousUser===user.id){
      if(localChange>lastSync&&remoteTime>lastSync)choice=await chooseWorkspace();
      else if(localChange>lastSync)choice='local';
      else if(remoteTime>lastSync||!localExists)choice='cloud';
      else if(JSON.stringify(snapshot())!==JSON.stringify(remoteWorkspace.storage||{}))choice='local';
    }else if(localExists){
      choice=await chooseWorkspace();
    }
    if(choice==='cloud'){
      applyWorkspace(remoteWorkspace,user.id,remoteAt);
      status('Your cloud workspace is ready on this device.','success');
    }else{
      await writeWorkspace(user,'This browser’s workspace is now saved to your account.');
    }
    bootUserId=user.id;
  };
  const flush=async()=>{
    if(!syncActive||!currentUser||!client||saving||conflictBlocked)return;
    saving=true;
    status('Saving changes…','pending');
    try{
      const latest=await fetchWorkspace(currentUser.id);
      const lastSync=parseTime(read(LAST_SYNC));
      const localChange=Number(read(LOCAL_CHANGE)||0);
      const remoteTime=parseTime(latest&&latest.updated_at);
      if(latest&&localChange>lastSync&&remoteTime>lastSync){
        conflictBlocked=true;
        const choice=await chooseWorkspace();
        conflictBlocked=false;
        if(choice==='cloud'){
          applyWorkspace(latest.workspace,currentUser.id,latest.updated_at);
          status('The newer cloud workspace has been restored.','success');
          return;
        }
      }
      await writeWorkspace(currentUser,'All changes saved to your account.');
    }catch(error){
      status('Cloud save failed. Your browser copy is safe. '+(error.message||''),'error');
    }finally{saving=false}
  };
  const scheduleSave=()=>{
    if(!syncActive||!currentUser||suppress)return;
    rawSet(LOCAL_CHANGE,String(Date.now()));
    if(saveTimer)clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{saveTimer=null;flush()},1100);
    status('Changes waiting to sync…','pending');
  };
  const activateSync=()=>{
    if(syncActive)return;
    syncActive=true;
    if(currentUser)flush();
  };

  if(nativeSet&&nativeRemove){
    Storage.prototype.setItem=function(key,value){
      const result=nativeSet.call(this,key,value);
      if(this===window.localStorage&&TRACKED.has(String(key))&&!suppress)scheduleSave();
      return result;
    };
    Storage.prototype.removeItem=function(key){
      const result=nativeRemove.call(this,key);
      if(this===window.localStorage&&TRACKED.has(String(key))&&!suppress)scheduleSave();
      return result;
    };
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&syncActive&&currentUser){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}flush();}});
  window.addEventListener('online',()=>{if(syncActive&&currentUser)flush()});

  window.OrielCloud={activateSync:activateSync,signIn:showAuthModal,getClient:()=>client};
  window.OrielCloudReady=(async()=>{
    renderAccount();
    if(!configured){bootstrappingDone();return null;}
    if(!window.supabase||typeof window.supabase.createClient!=='function'){
      status('The cloud sign-in library could not load. Refresh to retry.','error');
      bootstrappingDone();return null;
    }
    client=window.supabase.createClient(cfg.url.trim().replace(/\/$/,''),cfg.publishableKey.trim(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){
        currentUser=null;syncActive=false;conflictBlocked=false;
        if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}
        renderAccount();status('Signed out. This browser’s saved copy remains available.','neutral');
      }else if(session&&session.user&&session.user.id!==bootUserId){
        setTimeout(()=>prepareUser(session.user).then(()=>{if(syncActive)flush()}).catch(error=>status('Could not load your cloud workspace. '+(error.message||''),'error')),0);
      }
    });
    const result=await client.auth.getSession();
    if(result.error)throw result.error;
    if(result.data&&result.data.session){
      await prepareUser(result.data.session.user);
    }else{
      currentUser=null;renderAccount();
      status('Sign in when you want to save this workspace across devices.','neutral');
    }
    bootstrappingDone();
    return result.data&&result.data.session||null;
  })().catch(error=>{
    renderAccount();
    status('Cloud accounts could not initialise. Your local workspace is still available. '+(error.message||''),'error');
    bootstrappingDone();
    return null;
  });
  function bootstrappingDone(){window.__orielCloudBootstrapped=true;}
})();
