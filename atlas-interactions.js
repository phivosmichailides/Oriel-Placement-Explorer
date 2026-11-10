/* Placement Atlas: contextual dashboard shortcuts, profile reset and narrow-window filter access. */
'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const explore=$('explore'), statsEl=$('stats'), profileBox=$('uxProfileApplied');
  if(!explore||!statsEl)return;
  const actions=['shortlist','catalogue','places','hospital','gp','matches'];
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navigate=tab=>{
    if(typeof switchTab==='function')switchTab(tab);
    else document.querySelector('.tab[data-tab="'+tab+'"]')?.click();
  };
  const scrollToPart=id=>{
    requestAnimationFrame(()=>$(id)?.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'start'}));
  };
  const hasProfile=()=>{try{return !!state?.prefs?.onboarding}catch{return false}};
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const enhanceStats=()=>{
    [...statsEl.children].forEach((tile,i)=>{
      const action=actions[i];if(!action||tile.dataset.atlasStat)return;
      const button=document.createElement('button');
      button.type='button';
      button.className=tile.className||'stat';
      button.dataset.atlasStat=action;
      button.append(...tile.childNodes);
      button.title={
        shortlist:'Open your saved and ranked programmes',
        catalogue:'Jump to the interactive programme map and Explore results',
        places:'See programmes listing training positions',
        hospital:'Browse hospital-led programmes with their location previews',
        gp:'Browse GP-led programmes with their location previews',
        matches:'See your personalised top matches'
      }[action];
      tile.replaceWith(button);
    });
    const matches=statsEl.querySelector('[data-atlas-stat="matches"]');
    if(matches){
      const count=matches.querySelector('.k'), label=matches.querySelector('.l');
      if(!hasProfile()){
        if(count)count.textContent='—';
        if(label)label.textContent='Find your matches';
        matches.title='Take the personalisation quiz to unlock meaningful fit matches';
      }else{
        if(label)label.textContent='Strong matches for you';
        matches.title='Programmes scoring at least 78/100 from your preferences. View For You.';
      }
    }
    const places=statsEl.querySelector('[data-atlas-stat="places"] .l');
    if(places)places.textContent='Training positions listed';
  };
  enhanceStats();
  new MutationObserver(enhanceStats).observe(statsEl,{childList:true});

  let modal=null, oldFocus=null;
  const closeModal=()=>{
    if(!modal)return;
    const list=modal.querySelector('.atlasStatCards');
    window.OrielReleaseProgrammeCards?.(list);
    modal.remove();modal=null;document.body.classList.remove('atlasStatModalOpen');
    if(oldFocus?.isConnected)oldFocus.focus({preventScroll:true});
    oldFocus=null;
  };
  const focusModal=container=>{
    const first=container.querySelector('[data-atlas-close-stat]');
    first?.focus();
  };
  const showStatModal=action=>{
    if(typeof placements==='undefined'||typeof sector!=='function'||typeof card!=='function')return;
    closeModal();
    const activeRegion=$('region')?.value||((typeof quick!=='undefined'&&quick.has('london'))?'London':'');
    const scoped=placements.filter(p=>!activeRegion||p.region===activeRegion);
    const predicates={
      hospital:p=>sector(p)==='Hospital',
      gp:p=>sector(p)==='General Practice',
      places:p=>Number(p.places)>0
    };
    const catalogue=scoped.filter(predicates[action]||(()=>false));
    if(!catalogue.length){if(typeof toast==='function')toast('No programmes in this group for this region.');return;}
    catalogue.sort((a,b)=>hasProfile()?((analyse(b).score-analyse(a).score)||a.title.localeCompare(b.title)):a.title.localeCompare(b.title));
    const names={
      hospital:'Hospital-led programmes',
      gp:'GP-led programmes',
      places:'Programmes with listed training positions'
    };
    oldFocus=document.activeElement;
    modal=document.createElement('div');
    modal.className='atlasStatOverlay';
    modal.innerHTML='<section class="atlasStatDialog" role="dialog" aria-modal="true" aria-labelledby="atlasStatTitle">'+
      '<header class="atlasStatHead"><div><small>PLACEMENT ATLAS · PROGRAMME DIRECTORY</small><h2 id="atlasStatTitle">'+escapeText(names[action])+'</h2><p class="atlasStatContext"></p></div>'+
      '<button type="button" class="atlasStatClose" data-atlas-close-stat aria-label="Close programme directory">×</button></header>'+
      '<div class="atlasStatTools"><label>Find a programme <input type="search" class="atlasStatSearch" placeholder="Search employer, programme or postcode…" aria-label="Filter programmes in this directory"></label>'+
      '<span class="atlasStatShowing" aria-live="polite"></span></div>'+
      '<div class="atlasStatScroll"><div class="atlasStatCards"></div><button type="button" class="atlasStatMore" data-atlas-more>Show more programmes</button></div>'+
      '<footer class="atlasStatFoot"><span>Locations and fit information are indicative; verify the official programme listing.</span>'+
      '<button type="button" class="atlasStatExplore" data-atlas-open-all>Explore the full catalogue</button></footer></section>';
    document.body.append(modal);
    document.body.classList.add('atlasStatModalOpen');
    const context=modal.querySelector('.atlasStatContext');
    const positions=catalogue.reduce((n,p)=>n+(Number(p.places)||0),0);
    context.textContent=action==='places'
      ?positions.toLocaleString('en-GB')+' training positions across '+catalogue.length.toLocaleString('en-GB')+' programmes. This is a sum of listed positions, not a count of distinct programmes.'
      :catalogue.length.toLocaleString('en-GB')+' programmes'+(activeRegion?' · '+activeRegion:' · England & Wales')+'. Select a card to inspect its locations.';
    const search=modal.querySelector('.atlasStatSearch');
    const cards=modal.querySelector('.atlasStatCards');
    const more=modal.querySelector('[data-atlas-more]');
    const showing=modal.querySelector('.atlasStatShowing');
    let filtered=catalogue, offset=0;
    const renderNext=()=>{
      const next=filtered.slice(offset,offset+6);offset+=next.length;
      if(next.length){
        const shell=document.createElement('div');
        shell.innerHTML=next.map(p=>card(p,true)).join('');
        while(shell.firstChild)cards.append(shell.firstChild);
        for(const article of [...cards.querySelectorAll('.placement')]){
          article.classList.add('uxExpanded');
          if(!article.querySelector('[data-atlas-open-programme]')){
            const open=document.createElement('button');
            open.type='button';open.className='atlasStatOpenProgramme';
            open.dataset.atlasOpenProgramme=article.dataset.id;
            open.textContent='Open this programme in Explore';
            article.append(open);
          }
        }
        window.OrielEnhanceProgrammeCards?.(cards);
      }
      showing.textContent=Math.min(offset,filtered.length).toLocaleString('en-GB')+' of '+filtered.length.toLocaleString('en-GB')+' programmes';
      more.hidden=offset>=filtered.length;
      if(!filtered.length)cards.innerHTML='<p class="atlasStatEmpty">No programmes match that search. Try another term.</p>';
    };
    const refilter=()=>{
      window.OrielReleaseProgrammeCards?.(cards);
      cards.replaceChildren();offset=0;
      const q=search.value.trim().toLowerCase();
      filtered=q?catalogue.filter(p=>([p.title,p.employer,p.id,p.region,...(p.postcodes||[])].join(' ')).toLowerCase().includes(q)):catalogue;
      renderNext();
    };
    search.addEventListener('input',refilter);
    more.addEventListener('click',renderNext);
    modal.addEventListener('click',event=>{
      if(event.target===modal||event.target.closest('[data-atlas-close-stat]')){closeModal();return;}
      if(event.target.closest('[data-atlas-open-all]')){
        closeModal();navigate('explore');scrollToPart('placementMap');return;
      }
      const open=event.target.closest('[data-atlas-open-programme]');
      if(open){
        const id=open.dataset.atlasOpenProgramme;
        closeModal();navigate('explore');
        // Clear temporary filters before opening the selected programme.
        $('resetBtn')?.click();
        const input=$('search');
        if(input){input.value=id;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
        scrollToPart('results');
      }
    });
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closeModal();return;}
      if(event.key!=='Tab')return;
      const focusables=[...modal.querySelectorAll('button:not([hidden]):not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length>0);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    renderNext();focusModal(modal);
  };

  statsEl.addEventListener('click',event=>{
    const tile=event.target.closest('[data-atlas-stat]');if(!tile)return;
    switch(tile.dataset.atlasStat){
      case 'shortlist':navigate('shortlist');scrollToPart('shortlist');break;
      case 'catalogue':navigate('explore');scrollToPart('placementMap');break;
      case 'places':case 'hospital':case 'gp':showStatModal(tile.dataset.atlasStat);break;
      case 'matches':
        if(hasProfile()){navigate('foryou');scrollToPart('foryou');}
        else window.openOrielPersonalisation?.();
        break;
    }
  });

  // Return to Explore without a reload: preserve data, filters, theme and scroll state.
  const brand=document.querySelector('.atlasStickyHeader .brand');
  if(brand){
    brand.setAttribute('role','link');brand.tabIndex=0;
    brand.setAttribute('aria-label','Placement Atlas home — return to Explore');
    const goHome=()=>{closeModal();navigate('explore');window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});};
    brand.addEventListener('click',goHome);
    brand.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();goHome();}});
  }

  // Clear matching preferences only after an explicit confirmation.
  const clearPersonalisation=()=>{
    if(!hasProfile())return;
    const accepted=window.confirm('Remove your personalisation and return to a general programme view?\n\nThis clears quiz answers, personalised fit weights, area preferences and temporary Explore filters. Your shortlist, notes, ranks, account, colour theme and map colours are kept.');
    if(!accepted)return;
    const colours=state.prefs.mapColours?{...state.prefs.mapColours}:null;
    state.prefs=typeof clone==='function'?clone(DEFAULT):{...DEFAULT};
    if(colours)state.prefs.mapColours=colours;
    state.filters=typeof clone==='function'?clone(FILTER_DEFAULTS):{...FILTER_DEFAULTS};
    if(typeof quick!=='undefined')quick.clear();
    try{
      for(const key of ['phivos-onboarding-v1','phivos-onboarding-profile-v1','oriel-onboarding-applied-quick-v1'])localStorage.removeItem(key);
      sessionStorage.setItem('phivos-onboarding-skip-session','1');
      sessionStorage.removeItem('oriel-desk-last-view-v1');
    }catch{}
    window.OrielCommuteProfile?.save?.('',{silent:true});
    $('resetBtn')?.click();
    for(const id of ['search','sector','region','hours','salary','visa']){const input=$(id);if(input)input.value='';}
    document.querySelectorAll('.chip[data-q]').forEach(chip=>chip.classList.remove('on'));
    document.body.classList.remove('deskPersonalised');
    if(typeof save==='function')save();
    if(typeof renderAll==='function')renderAll();
    document.dispatchEvent(new CustomEvent('desk:personalisation-removed'));
    syncPreferencesButtons();
    navigate('explore');
    if(typeof toast==='function')toast('Personalisation cleared. Your shortlist is safe.');
  };
  const profileButton=document.createElement('button');
  profileButton.type='button';profileButton.className='atlasRemovePreferences';
  profileButton.textContent='Remove preferences';
  profileButton.title='Clear personalisation while keeping your shortlist and appearance';
  profileButton.addEventListener('click',clearPersonalisation);
  if(profileBox)profileBox.append(profileButton);

  const topButtons=[];
  document.querySelectorAll('.atlasExploreSubnav').forEach(bar=>{
    const button=document.createElement('button');
    button.type='button';button.className='atlasRemovePreferences atlasRemovePreferencesTop';
    button.textContent='Remove preferences';
    button.title=profileButton.title;
    button.addEventListener('click',clearPersonalisation);
    bar.append(button);topButtons.push(button);
  });
  function syncPreferencesButtons(){
    const visible=hasProfile();
    profileButton.hidden=!visible;
    topButtons.forEach(button=>button.hidden=!visible);
  }
  syncPreferencesButtons();
  document.addEventListener('desk:state-saved',syncPreferencesButtons);
  document.addEventListener('desk:after-navigation',syncPreferencesButtons);

  // On split screens and phones the filter form is a compact, dismissible drawer.
  const backdrop=document.createElement('button');
  backdrop.type='button';backdrop.id='atlasFilterBackdrop';
  backdrop.setAttribute('aria-label','Close the Refine filters panel');
  backdrop.addEventListener('click',()=>$('uxCollapseFilters')?.click());
  explore.append(backdrop);
  const refine=document.createElement('button');
  refine.type='button';refine.id='atlasRefinePill';
  refine.setAttribute('aria-controls','uxFilterSidebar');
  refine.innerHTML='<span aria-hidden="true">☷</span> <span class="atlasRefineLabel">Refine filters</span>';
  refine.addEventListener('click',()=>$('uxCollapseFilters')?.click());
  const layout=explore.querySelector(':scope > .layout');
  if(layout)explore.insertBefore(refine,layout);
  const syncRefine=()=>{
    const narrow=window.matchMedia('(max-width: 1180px)').matches;
    const open=narrow&&!explore.classList.contains('uxFiltersCollapsed');
    explore.classList.toggle('atlasNarrowFilterOpen',open);
    refine.setAttribute('aria-expanded',String(open));
    refine.querySelector('.atlasRefineLabel').textContent=open?'Close filters':'Refine filters';
  };
  new MutationObserver(syncRefine).observe(explore,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',syncRefine,{passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&explore.classList.contains('atlasNarrowFilterOpen'))$('uxCollapseFilters')?.click();});
  syncRefine();
})();