'use strict';
(()=>{
  const button=document.getElementById('installAppBtn');
  const offlineNotice=document.getElementById('pwaOfflineNotice');
  const toast=message=>{
    const node=document.getElementById('toast');
    if(!node)return;
    node.textContent=message;node.classList.add('show');
    clearTimeout(node._pwaTimer);node._pwaTimer=setTimeout(()=>node.classList.remove('show'),3600);
  };
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const safariDesktop=/Macintosh/i.test(navigator.userAgent)&&/Apple/i.test(navigator.vendor||'')&&!/Chrome|Chromium|Edg/i.test(navigator.userAgent);
  let deferredPrompt=null;
  if(button){
    if(standalone())button.hidden=true;
    else if(ios||safariDesktop)button.hidden=false;
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();deferredPrompt=event;button.hidden=false;
      const label=button.querySelector('span');if(label)label.textContent='Install app';
      button.title='Install Placement Atlas on this device';
    });
    button.addEventListener('click',async()=>{
      if(deferredPrompt){
        const prompt=deferredPrompt;deferredPrompt=null;
        try{
          await prompt.prompt();
          const choice=await prompt.userChoice;
          if(choice?.outcome==='accepted'){button.hidden=true;toast('Placement Atlas is being installed.');}
          else toast('You can install Placement Atlas later from your browser menu.');
        }catch{toast('Open your browser menu and choose Install Placement Atlas.');}
        return;
      }
      if(ios)toast('To install: tap Share in Safari, then choose Add to Home Screen.');
      else if(safariDesktop)toast('In Safari, choose File → Add to Dock to install Placement Atlas.');
      else toast('Open your browser menu and choose Install Placement Atlas or Create shortcut.');
    });
    window.addEventListener('appinstalled',()=>{button.hidden=true;toast('Placement Atlas has been installed.');});
  }
  const syncConnection=()=>{if(offlineNotice)offlineNotice.hidden=navigator.onLine!==false;};
  window.addEventListener('online',syncConnection);
  window.addEventListener('offline',syncConnection);
  syncConnection();
  if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'})
        .then(registration=>{
          registration.update().catch(()=>{});
          registration.addEventListener('updatefound',()=>{
            const worker=registration.installing;
            if(worker)worker.addEventListener('statechange',()=>{
              if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('A Placement Atlas update is ready. Refresh when convenient.');
            });
          });
        })
        .catch(error=>console.warn('Placement Atlas offline support could not be registered:',error));
    },{once:true});
  }
})();
