'use strict';
(()=>{
  const loadDeadlineDates=()=>{
    const extra=document.createElement('script');
    extra.src='deadline-dates.js?v=20261014-deadline-dates';
    document.body.appendChild(extra);
  };

  const loadOnboarding=()=>{
    const onboarding=document.createElement('script');
    onboarding.src='onboarding.js?v=20261014-personal';
    onboarding.onload=loadDeadlineDates;
    onboarding.onerror=loadDeadlineDates;
    document.body.appendChild(onboarding);
  };

  const product=document.createElement('script');
  product.src='app-product.js?v=20261014-regions';
  product.onload=()=>{
    const sectors=document.createElement('script');
    sectors.src='sector-map.js?v=20261014-sector-pins-v2';
    sectors.onload=loadOnboarding;
    sectors.onerror=loadOnboarding;
    document.body.appendChild(sectors);
  };
  product.onerror=()=>{
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk.</b><br>Refresh the page and try again.</div>';
  };
  document.body.appendChild(product);
})();
