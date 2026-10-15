'use strict';
(()=>{
  try{
    window.__placementDeskWasFresh=!localStorage.getItem('phivos-desk-v2')&&!localStorage.getItem('phivos-onboarding-v1')&&!localStorage.getItem('phivos-desk-csv-v2');
  }catch{window.__placementDeskWasFresh=true;}

  const loadDeadlineDates=()=>{
    const extra=document.createElement('script');
    extra.src='deadline-dates.js?v=20261014-deadline-dates';
    document.body.appendChild(extra);
  };

  const loadOnboarding=()=>{
    const onboarding=document.createElement('script');
    onboarding.src='onboarding.js?v=20261015-research';
    onboarding.onload=loadDeadlineDates;
    onboarding.onerror=loadDeadlineDates;
    document.body.appendChild(onboarding);
  };

  const loadSectors=()=>{
    const sectors=document.createElement('script');
    sectors.src='sector-map.js?v=20261015-research';
    sectors.onload=loadOnboarding;
    sectors.onerror=loadOnboarding;
    document.body.appendChild(sectors);
  };

  const loadGeneric=()=>{
    const generic=document.createElement('script');
    generic.src='generic-public.js?v=20261015-research';
    generic.onload=loadSectors;
    generic.onerror=loadSectors;
    document.body.appendChild(generic);
  };

  const product=document.createElement('script');
  product.src='app-product.js?v=20261015-research';
  product.onload=loadGeneric;
  product.onerror=()=>{
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk.</b><br>Refresh the page and try again.</div>';
  };
  document.body.appendChild(product);
})();
