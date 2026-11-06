'use strict';
(()=>{
  const boot=async()=>{
    // Cloud data must be restored before app-base.js reads localStorage.
    try{if(window.OrielCloudReady)await window.OrielCloudReady;}catch(error){console.warn('Oriel cloud bootstrap unavailable; continuing with local storage.',error);}
    try{
      window.__placementDeskWasFresh=!localStorage.getItem('phivos-desk-v2')&&!localStorage.getItem('phivos-onboarding-v1')&&!localStorage.getItem('phivos-desk-csv-v2');
    }catch{window.__placementDeskWasFresh=true;}

    const activateCloud=()=>{try{window.OrielCloud?.activateSync?.()}catch(error){console.warn('Oriel cloud sync could not start.',error)}};
    const loadDeadlineDates=()=>{
      const extra=document.createElement('script');
      extra.src='deadline-dates.js?v=20261106g';
      extra.onload=activateCloud;
      extra.onerror=activateCloud;
      document.body.appendChild(extra);
    };
    const loadOnboarding=()=>{
      const onboarding=document.createElement('script');
      onboarding.src='onboarding.js?v=20261106h';
      onboarding.onload=loadDeadlineDates;
      onboarding.onerror=loadDeadlineDates;
      document.body.appendChild(onboarding);
    };
    const loadSectors=()=>{
      const sectors=document.createElement('script');
      sectors.src='sector-map.js?v=20261106g';
      sectors.onload=loadOnboarding;
      sectors.onerror=loadOnboarding;
      document.body.appendChild(sectors);
    };
    const loadGeneric=()=>{
      const generic=document.createElement('script');
      generic.src='generic-public.js?v=20261106fastmap';
      generic.onload=loadSectors;
      generic.onerror=loadSectors;
      document.body.appendChild(generic);
    };
    const product=document.createElement('script');
    product.src='app-product.js?v=20261106filters1';
    product.onload=loadGeneric;
    product.onerror=()=>{
      const r=document.getElementById('results');
      if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk.</b><br>Refresh the page and try again.</div>';
      activateCloud();
    };
    document.body.appendChild(product);
  };
  boot();
})();
