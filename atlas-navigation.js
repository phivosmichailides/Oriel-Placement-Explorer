'use strict';
/* Placement Atlas navigation and data-tools layout. No catalogue or map mutations. */
(()=>{
  const root=document.querySelector('.shell');
  const header=root?.querySelector(':scope > header.top');
  const headerActions=header?.querySelector('.actions');
  const nav=root?.querySelector('nav.tabs');
  const footer=document.querySelector('.app-footer');
  if(!root||!header||!headerActions||!nav||!footer)return;

  // Reuse the original SVG navigation, button IDs, account and theme controls.
  // The existing switchTab/session handlers remain authoritative.
  header.classList.add('atlasStickyHeader');
  nav.setAttribute('aria-label','Placement Atlas main navigation');
  header.insertBefore(nav,headerActions);

  // File management is available after the active page's content rather than
  // occupying the primary app navigation. All original click handlers survive.
  const utilities=document.createElement('section');
  utilities.id='atlasDataTools';
  utilities.className='atlasDataTools';
  utilities.setAttribute('aria-labelledby','atlasDataToolsTitle');
  utilities.innerHTML='<div class="atlasDataToolsHeading">'+
    '<div><div class="eyebrow">YOUR DATA & APP</div><h2 id="atlasDataToolsTitle">Manage your Placement Atlas</h2>'+
    '<p>Install the app, save your choices or import a newer Oriel catalogue.</p></div></div>'+
    '<div class="atlasDataToolsButtons" id="atlasDataToolsButtons"></div>';
  const buttons=utilities.querySelector('#atlasDataToolsButtons');
  for(const id of ['installAppBtn','exportBtn','backupBtn','restoreBtn','restoreInput','uploadBtn','fileInput']){
    const control=document.getElementById(id);
    if(control)buttons.append(control);
  }
  const savedHelp=document.getElementById('saveHelp');
  if(savedHelp)utilities.append(savedHelp);
  // Keep the management panel inside the same bounded workspace as page content.
  root.append(utilities);

  const navigate=target=>{
    if(typeof switchTab==='function')switchTab(target);
    else nav.querySelector('[data-tab="'+target+'"]')?.click();
  };

  // "For You" is a subview of Explore, not another top-level app destination.
  const addExploreSubnav=(panelId,title,description)=>{
    const panel=document.getElementById(panelId);if(!panel)return;
    const bar=document.createElement('div');
    bar.className='atlasExploreSubnav';
    bar.id=panelId==='explore'?'atlasExploreSubnav':'atlasForYouSubnav';
    bar.innerHTML='<div class="atlasSubnavIntro">'+
      '<span class="eyebrow">EXPLORE · YOUR DECISION SPACE</span>'+
      '<span class="atlasSubnavDescription">'+description+'</span></div>'+
      '<div class="atlasSubnavChoices" role="group" aria-label="Explore views">'+
      '<button type="button" data-atlas-subtab="explore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>All programmes</button>'+
      '<button type="button" data-atlas-subtab="foryou"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>For You</button>'+
      '</div>';
    if(panelId==='explore'){
      const compare=document.createElement('button');
      compare.type='button';compare.id='atlasCompareOpen';
      compare.className='btn atlasCompareOpen';
      compare.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/></svg><span>Compare selected</span><b id="atlasCompareCount">0</b>';
      compare.title='View and compare up to five programmes selected from Explore';
      compare.addEventListener('click',()=>navigate('compare'));
      bar.append(compare);
    }
    bar.querySelectorAll('[data-atlas-subtab]').forEach(button=>{
      button.addEventListener('click',()=>navigate(button.dataset.atlasSubtab));
    });
    panel.prepend(bar);
  };
  addExploreSubnav('explore','Explore','Browse every programme, then see which suit your own priorities.');
  addExploreSubnav('foryou','For You','Personalised matches based on your preferences, quiz and filters.');

  // Comparison remains fully functional through programme cards and the
  // Explore-specific button, but it is not a primary top-level destination.
  const comparePanel=document.getElementById('compare');
  if(comparePanel){
    const back=document.createElement('button');
    back.type='button';back.id='atlasCompareBack';
    back.className='btn atlasCompareBack';
    back.textContent='← Back to Explore';
    back.addEventListener('click',()=>navigate('explore'));
    comparePanel.prepend(back);
  }

  // Add convenient shortcuts without replacing the existing ranked CSV export.
  const shortlistBar=document.querySelector('#shortlist .shortlist-toolbar');
  if(shortlistBar){
    const shortcuts=document.createElement('div');
    shortcuts.className='atlasShortlistDataActions';
    shortcuts.innerHTML='<button class="btn" type="button" id="atlasShortlistExportDecisions">Export decisions</button>'+
      '<button class="btn" type="button" id="atlasShortlistBackup">Backup</button>';
    shortcuts.querySelector('#atlasShortlistExportDecisions').addEventListener('click',()=>document.getElementById('exportBtn')?.click());
    shortcuts.querySelector('#atlasShortlistBackup').addEventListener('click',()=>document.getElementById('backupBtn')?.click());
    shortlistBar.append(shortcuts);
  }

  const sync=()=>{
    const view=document.querySelector('.panel.active')?.id||'explore';
    document.body.dataset.atlasView=view;
    nav.querySelector('[data-tab="explore"]')?.classList.toggle('atlasParentActive',view==='foryou'||view==='compare');
    for(const button of document.querySelectorAll('[data-atlas-subtab]')){
      const active=button.dataset.atlasSubtab===view;
      button.classList.toggle('atlasActive',active);
      button.setAttribute('aria-pressed',String(active));
    }
    for(const button of nav.querySelectorAll('.tab')){
      const visibleParent=button.dataset.tab==='explore'&&(view==='foryou'||view==='compare');
      if(button.classList.contains('active')||visibleParent)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
    const count=document.getElementById('atlasCompareCount');
    if(count){
      try{count.textContent=String(typeof state!=='undefined'&&Array.isArray(state.compare)?state.compare.length:0)}
      catch{count.textContent='0'}
    }
  };
  document.body.dataset.atlasView='explore';
  document.addEventListener('desk:after-navigation',sync);
  document.addEventListener('desk:state-saved',sync);
  document.addEventListener('desk:dataset',sync);
  let scrollScheduled=false;
  const syncShadow=()=>{
    scrollScheduled=false;
    header.classList.toggle('atlasNavScrolled',window.scrollY>18);
  };
  window.addEventListener('scroll',()=>{
    if(scrollScheduled)return;
    scrollScheduled=true;requestAnimationFrame(syncShadow);
  },{passive:true});
  sync();syncShadow();
})();