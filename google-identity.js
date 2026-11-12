/* Google Identity Services -> Supabase ID-token sign-in.
   The public Google Web Client ID must be set in supabase-config.js.
   Never store Google client secrets in browser files. */
'use strict';
(()=>{
  const VALID_CLIENT_ID=/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
  let sdkPromise=null,initPromise=null,rawNonce='',active=null;
  const errorMessage=(message)=>{
    const node=active?.overlay?.querySelector('#cloudAuthError');
    if(node)node.textContent=message||'Google sign-in is unavailable. Try email instead.';
  };
  const loadSDK=()=>{
    if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://accounts.google.com/gsi/client';
      script.async=true;
      script.onload=()=>window.google?.accounts?.id
        ?resolve(window.google.accounts.id)
        :reject(new Error('Google sign-in did not initialise.'));
      script.onerror=()=>reject(new Error('Google sign-in could not load.'));
      document.head.append(script);
    }).catch(error=>{sdkPromise=null;throw error;});
    return sdkPromise;
  };
  const onCredential=async(response)=>{
    const session=active;
    if(!session||session.busy)return;
    if(!response?.credential){
      errorMessage('Google did not return a sign-in credential. Please try again.');
      return;
    }
    session.busy=true;
    if(session.host.isConnected)session.host.setAttribute('aria-busy','true');
    errorMessage('');
    try{
      const {error}=await session.client.auth.signInWithIdToken({
        provider:'google',token:response.credential,nonce:rawNonce
      });
      if(error)throw error;
      if(session.overlay.isConnected)session.overlay.remove();
      if(active===session)active=null;
    }catch(error){
      if(active===session)errorMessage('Google sign-in failed: '+(error.message||'Please try again.'));
    }finally{
      session.busy=false;
      if(session.host.isConnected)session.host.removeAttribute('aria-busy');
    }
  };
  const initialise=()=>{
    if(initPromise)return initPromise;
    initPromise=(async()=>{
      const googleID=await loadSDK();
      const bytes=new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      rawNonce=btoa(String.fromCharCode(...bytes));
      const hash=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawNonce));
      const hashedNonce=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
      googleID.initialize({
        client_id:active.clientId,
        callback:onCredential,
        nonce:hashedNonce,
        ux_mode:'popup',
        auto_select:false,
        use_fedcm_for_button:true
      });
      return googleID;
    })().catch(error=>{initPromise=null;throw error;});
    return initPromise;
  };
  const mount=async({overlay,button,client,clientId})=>{
    if(!VALID_CLIENT_ID.test(String(clientId||'').trim()))return false;
    const host=document.createElement('div');
    host.className='cloudGoogleNative';
    host.setAttribute('aria-label','Continue with Google');
    host.textContent='Loading Google sign-in…';
    button.before(host);
    button.hidden=true;
    active={overlay,button,host,client,clientId:String(clientId).trim(),busy:false};
    try{
      const googleID=await initialise();
      if(!overlay.isConnected)return true;
      host.replaceChildren();
      const width=Math.min(390,Math.max(220,Math.floor(host.clientWidth||320)));
      googleID.renderButton(host,{
        type:'standard',theme:document.documentElement.getAttribute('data-theme')==='dark'?'filled_black':'outline',
        size:'large',shape:'rectangular',text:'continue_with',logo_alignment:'left',width
      });
      if(!host.firstElementChild)throw new Error('The Google button did not appear.');
      return true;
    }catch(error){
      if(overlay.isConnected){
        host.hidden=true;
        button.hidden=false;
        button.textContent='Use alternative Google sign-in';
        errorMessage('The Google button could not load. You can use email or the alternative Google sign-in.');
      }
      return false;
    }
  };
  window.PlacementAtlasGoogle={mount};
})();
