'use strict';
/* Cloudflare Turnstile client adapter for Supabase Auth.
   Only the public site key is included here. Supabase Auth performs
   server-side Siteverify with its protected CAPTCHA secret. */
(()=>{
  const SITE_KEY='0x4AAAAAAF_H_KvCURq8Ixkp';
  const SCRIPT_URL='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let loading=null;

  function load(){
    if(window.turnstile&&typeof window.turnstile.render==='function')return Promise.resolve(window.turnstile);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=SCRIPT_URL;
      script.async=true;
      script.defer=true;
      script.setAttribute('data-atlas-turnstile','true');
      script.onload=()=>{
        if(window.turnstile&&typeof window.turnstile.render==='function')resolve(window.turnstile);
        else reject(new Error('Verification did not initialise. Please refresh and try again.'));
      };
      script.onerror=()=>reject(new Error('Verification could not load. Check your connection or privacy extensions and try again.'));
      document.head.appendChild(script);
    }).catch(error=>{loading=null;throw error});
    return loading;
  }

  function create(container,action='login'){
    if(!(container instanceof HTMLElement))throw new Error('Missing security-check container.');
    if(!/^[A-Za-z0-9_-]{1,32}$/.test(action))throw new Error('Invalid security action.');
    let widgetId=null;
    let token='';
    let issuedAt=0;
    let destroyed=false;
    let failed=false;

    const ready=(async()=>{
      const api=await load();
      if(destroyed||!container.isConnected)return;
      widgetId=api.render(container,{
        sitekey:SITE_KEY,
        action,
        size:'flexible',
        appearance:'always',
        theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light',
        callback:value=>{if(!destroyed){token=String(value||'');issuedAt=Date.now();failed=false;}},
        'expired-callback':()=>{token='';issuedAt=0;},
        'timeout-callback':()=>{token='';issuedAt=0;},
        'error-callback':()=>{token='';issuedAt=0;failed=true;},
        'unsupported-callback':()=>{token='';issuedAt=0;failed=true;}
      });
      if(typeof widgetId!=='string'||!widgetId)throw new Error('The security check could not start. Refresh the page.');
    })();

    return {
      ready,
      async getToken(){
        await ready;
        if(destroyed||!widgetId)throw new Error('Reopen the sign-in window and try again.');
        if(failed)throw new Error('The security check failed. Please try again.');
        const api=window.turnstile;
        if(api.isExpired(widgetId)||(issuedAt>0&&Date.now()-issuedAt>280000)){
          this.reset();
        }
        const current=api.getResponse(widgetId)||token;
        if(!current)throw new Error('Complete the security check before continuing.');
        return current;
      },
      reset(){
        token='';issuedAt=0;failed=false;
        if(widgetId&&window.turnstile)try{window.turnstile.reset(widgetId)}catch{}
      },
      destroy(){
        destroyed=true;token='';issuedAt=0;
        if(widgetId&&window.turnstile)try{window.turnstile.remove(widgetId)}catch{}
        widgetId=null;
      }
    };
  }
  window.PlacementAtlasTurnstile={create,siteKey:SITE_KEY};
})();