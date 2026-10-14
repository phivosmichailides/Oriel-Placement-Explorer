'use strict';
(()=>{
  const product=document.createElement('script');
  product.src='app-product.js?v=20261014-regions';
  product.onload=()=>{
    const sectors=document.createElement('script');
    sectors.src='sector-map.js?v=20261014-sector-pins';
    sectors.onload=()=>{
      const onboarding=document.createElement('script');
      onboarding.src='onboarding.js?v=20261014-personal';
      document.body.appendChild(onboarding);
    };
    sectors.onerror=()=>{
      const onboarding=document.createElement('script');
      onboarding.src='onboarding.js?v=20261014-personal';
      document.body.appendChild(onboarding);
    };
    document.body.appendChild(sectors);
  };
  product.onerror=()=>{
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk.</b><br>Refresh the page and try again.</div>';
  };
  document.body.appendChild(product);
})();
