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
    else{button.hidden=false;button.title='Install Placement Atlas on this device';}
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
      else if(/Firefox/i.test(navigator.userAgent))toast('For app-style installation, open Placement Atlas in Chrome or Edge. On mobile Safari, use Share → Add to Home Screen.');
      else toast('Open your browser menu and choose Install Placement Atlas or Add to Home Screen.');
    });
    window.addEventListener('appinstalled',()=>{button.hidden=true;toast('Placement Atlas has been installed.');});
  }
  const syncConnection=()=>{if(offlineNotice)offlineNotice.hidden=navigator.onLine!==false;};
  window.addEventListener('online',syncConnection);
  window.addEventListener('offline',syncConnection);
  syncConnection();

  if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
    const hadController=!!navigator.serviceWorker.controller;
    let pendingControllerRefresh=false,refreshStarted=false;
    const userIsEditing=()=>{
      const active=document.activeElement;
      return !!active?.matches?.('input:not([type="button"]):not([type="submit"]):not([type="file"]),textarea,select,[contenteditable="true"]')||!!window.OrielMapDrawing?.isInteracting?.();
    };
    const refreshAfterControllerChange=()=>{
      if(!pendingControllerRefresh||refreshStarted||document.hidden||userIsEditing())return;
      pendingControllerRefresh=false;
      refreshStarted=true;
      window.location.reload();
    };
    // skipWaiting() + clients.claim() activates the new shell immediately.
    // Reload the old document as soon as that new worker takes control, but
    // never interrupt someone who is actively editing a field.
    if(hadController){
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!navigator.serviceWorker.controller)return;
        pendingControllerRefresh=true;
        toast('Placement Atlas has updated. Refreshing…');
        refreshAfterControllerChange();
      });
      document.addEventListener('focusout',()=>Promise.resolve().then(refreshAfterControllerChange),true);
      document.addEventListener('visibilitychange',()=>{
        if(!document.hidden)refreshAfterControllerChange();
      });
    }

    const checkForUpdate=registration=>{
      if(navigator.onLine!==false)registration.update().catch(()=>{});
    };
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js?v=20261111makeover2',{scope:'./',updateViaCache:'none'})
        .then(registration=>{
          checkForUpdate(registration);
          window.addEventListener('online',()=>checkForUpdate(registration));
          document.addEventListener('visibilitychange',()=>{
            if(!document.hidden)checkForUpdate(registration);
          });
          registration.addEventListener('updatefound',()=>{
            const worker=registration.installing;
            if(worker)worker.addEventListener('statechange',()=>{
              if(worker.state==='installed'&&navigator.serviceWorker.controller)
                toast('A Placement Atlas update is ready.');
            });
          });
        })
        .catch(error=>console.warn('Placement Atlas offline support could not be registered:',error));
    },{once:true});
  }
})();
