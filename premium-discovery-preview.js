/* Placement Atlas — premium discovery prototype.
   Presentation only. Existing source IDs, analysis, ranking, map and cloud state remain authoritative.
   ?atlasClassic=1 disables the experimental enhancement within this branch. */
'use strict';
(()=>{
  if(new URLSearchParams(location.search).get('atlasClassic')==='1')return;
  document.documentElement.classList.add('atlasPremiumPreview');
  const $=id=>document.getElementById(id);
  const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo=id=>$(id)?.scrollIntoView({behavior:reduceMotion()?'instant':'smooth',block:'start'});
  const profileExists=()=>{try{return Boolean(state?.prefs?.onboarding)}catch{return false;}};
  const navigate=tab=>{
    if(typeof switchTab==='function')switchTab(tab);
    else document.querySelector('[data-tab="'+tab+'"]')?.click();
  };
  const cleanTitle=(title)=>{
    let value=String(title||'').trim().replace(/\s+/g,' ');
    // Strip only a recognised slash-location suffix containing a UK postcode;
    // keep programme labels intact when no recognisable suffix is present.
    const slashLocation=value.search(/\/\s*(?:[A-Za-z][A-Za-z .'-]{1,45}\/\s*)?[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i);
    if(slashLocation>10)value=value.slice(0,slashLocation);
    value=value.replace(/\bHosp\b/g,'Hospital').replace(/\bMed\b(?=\s|$)/g,'Medical')
      .replace(/\bNHS FT\b/g,'NHS Foundation Trust');
    return value.trim()||String(title||'Programme');
  };
  window.AtlasPrototypeCleanTitle=cleanTitle;

  const enhanceHero=()=>{
    const intro=document.querySelector('.productIntro');
    if(!intro||intro.dataset.atlasPrototype==='1')return Boolean(intro);
    const copy=intro.querySelector('.productIntroCopy');
    if(!copy)return false;
    intro.dataset.atlasPrototype='1';
    const eyebrow=copy.querySelector('.eyebrow');
    if(eyebrow)eyebrow.textContent='FOUNDATION PHARMACIST TRAINING · ENGLAND & WALES';
    const headline=copy.querySelector('h2');
    if(headline)headline.textContent='Find a placement that actually fits you.';
    const desc=copy.querySelector('p');
    if(desc)desc.textContent='Compare 4,064 foundation training programmes by location, salary, training experience and what matters most to you.';
    const actions=copy.querySelector('.introActions');
    if(actions){
      // Replace only hero buttons, not any underlying navigation or questionnaire logic.
      actions.replaceChildren();
      const browse=document.createElement('button');
      browse.type='button';browse.className='btn primary atlasHeroPrimary';
      browse.textContent='Explore programmes';
      browse.addEventListener('click',()=>{navigate('explore');scrollTo('results')});
      const match=document.createElement('button');
      match.type='button';match.className='btn atlasHeroSecondary';
      match.textContent=profileExists()?'See my matches':'Find my matches';
      match.addEventListener('click',()=>{
        if(profileExists()){navigate('foryou');window.scrollTo({top:0,behavior:'instant'});}
        else window.openOrielPersonalisation?.();
      });
      actions.append(browse,match);
      const trust=document.createElement('div');
      trust.className='atlasHeroTrust';
      for(const text of ['Free to explore','No account needed to start','Independent project']){
        const span=document.createElement('span');span.textContent='✓ '+text;trust.append(span);
      }
      copy.append(trust);
    }
    // Keep the useful explanation, but let first-time visitors choose when to read it.
    const principles=document.querySelector('.productPrinciples');
    if(principles&&!principles.closest('.atlasHowItWorks')){
      const how=document.createElement('details');
      how.className='atlasHowItWorks';
      const heading=document.createElement('summary');
      heading.textContent='How Placement Atlas helps';
      principles.removeAttribute('aria-hidden');
      how.append(heading,principles);
      copy.append(how);
    }
    return true;
  };

  const enhanceNavigation=()=>{
    const nav=document.querySelector('nav.tabs');
    if(!nav)return false;
    let more=nav.querySelector(':scope > .atlasMoreNav');
    if(!more){
      more=document.createElement('details');
      more.className='atlasMoreNav';
      const heading=document.createElement('summary');
      heading.textContent='More';
      const menu=document.createElement('div');
      menu.className='atlasMoreMenu';
      more.append(heading,menu);
      nav.append(more);
      more.addEventListener('click',event=>{
        if(event.target.closest('.atlasMoreMenu .tab')){
          window.setTimeout(()=>{more.open=false;syncMoreLabel()},0);
        }
      });
    }
    const menu=more.querySelector('.atlasMoreMenu');
    const secondary=[...nav.querySelectorAll(':scope > .tab')].filter(tab=>{
      const label=tab.textContent.replace(/\\s+/g,' ').trim();
      return tab.dataset.tab==='prefs'||/Oriel Simulation|Tinder Mode/i.test(label);
    });
    secondary.forEach(tab=>menu.append(tab));
    const syncMoreLabel=()=>{
      const active=menu.querySelector('.tab.active');
      const label=active?.querySelector('span')?.textContent?.trim();
      more.querySelector('summary').textContent=active&&label?'More · '+label:'More';
    };
    if(nav.dataset.atlasMoreListener!=='1'){
      nav.dataset.atlasMoreListener='1';
      nav.addEventListener('click',()=>window.setTimeout(syncMoreLabel,0));
      document.addEventListener('desk:after-navigation',syncMoreLabel);
    }
    syncMoreLabel();
    if(!more.dataset.observing){
      more.dataset.observing='1';
      new MutationObserver(()=>{
        const late=[...nav.querySelectorAll(':scope > .tab')].filter(tab=>
          tab.dataset.tab==='prefs'||/Oriel Simulation|Tinder Mode/i.test(tab.textContent));
        late.forEach(tab=>menu.append(tab));
        syncMoreLabel();
      }).observe(nav,{childList:true});
    }
    return true;
  };

  const enhanceStats=()=>{
    const root=$('stats');
    if(!root||root.dataset.atlasPrototype==='1'||!root.querySelector('[data-atlas-stat]'))return false;
    root.dataset.atlasPrototype='1';
    const toolbar=document.createElement('div');
    toolbar.className='atlasStatToolbarPremium';
    toolbar.innerHTML='<div><b>Your placement workspace</b><span>Start broad, then narrow your choices.</span></div>';
    const show=document.createElement('button');
    show.type='button';show.className='atlasStatTogglePremium';show.textContent='More statistics';
    show.setAttribute('aria-expanded','false');
    show.addEventListener('click',()=>{
      const expanded=root.classList.toggle('atlasShowAllStats');
      show.textContent=expanded?'Fewer statistics':'More statistics';
      show.setAttribute('aria-expanded',String(expanded));
    });
    toolbar.append(show);
    root.parentElement.insertBefore(toolbar,root);
    return true;
  };

  const prototypeMeta=(p,card)=>{
    const region=String(p.region||'').trim();
    const duration=Number(p.hours);
    const hospital=typeof weeks==='function'?Number(weeks(p,'hospital'))||0:0;
    const gp=typeof weeks==='function'?Number(weeks(p,'general practice'))||0:0;
    let setting='Training setting not stated';
    if(hospital>=13&&gp>=13)setting='Hospital + GP';
    else if(typeof sector==='function')setting=sector(p)||setting;
    const locationCount=new Set(Array.isArray(p.postcodes)?p.postcodes.filter(Boolean):[]).size;
    const chips=[
      setting,
      duration>0?duration+' hours/week':'Hours not stated',
      locationCount>1?locationCount+' listed postcodes':region
    ].filter(Boolean).slice(0,3);
    const area=card.querySelector('.placementTop .eyebrow');
    if(area)area.textContent=[region,locationCount>1?locationCount+' training postcodes':null].filter(Boolean).join(' · ')||'Programme overview';
    const row=document.createElement('div');
    row.className='atlasCompactSummary';
    row.setAttribute('aria-label','Programme summary');
    for(const label of chips){
      const chip=document.createElement('span');
      chip.className='atlasSummaryChip';
      chip.textContent=label;
      row.append(chip);
    }
    const top=card.querySelector('.placementTop');
    if(top)top.insertAdjacentElement('afterend',row);
    // Keep a discoverable fit-quiz action without showing a big empty score
    // panel to visitors who have not personalised the app yet.
    if(!profileExists()&&card===card.parentElement?.querySelector('.placement')){
      const hint=document.createElement('div');
      hint.className='atlasCompactPrompt';
      const label=document.createElement('span');
      label.textContent='Personal fit not yet assessed';
      const action=document.createElement('button');
      action.type='button';
      action.className='atlasFitQuizLink atlasCompactQuizCta';
      action.setAttribute('data-atlas-start-quiz','');
      action.textContent='Check my fit';
      hint.append(label,action);
      row.insertAdjacentElement('afterend',hint);
    }
    const title=top?.querySelector('h3');
    if(title){
      const full=title.textContent.trim();
      const concise=cleanTitle(full);
      if(concise!==full){
        title.dataset.atlasFullTitle=full;
        title.replaceChildren();
        const shortText=document.createElement('span');
        shortText.className='atlasTitleConcise';shortText.textContent=concise;
        const original=document.createElement('span');
        original.className='atlasTitleOriginal';original.textContent=full;
        title.append(shortText,original);
      }
    }
  };

  const enhanceCards=()=>{
    const results=$('results');
    if(!results||typeof placements==='undefined'||!Array.isArray(placements))return;
    const data=new Map(placements.map(p=>[String(p.id),p]));
    for(const card of results.querySelectorAll('.placement[data-id]')){
      if(card.dataset.atlasCompact==='1')continue;
      card.dataset.atlasCompact='1';
      const p=data.get(card.dataset.id);
      if(!p)continue;
      prototypeMeta(p,card);
      for(const item of card.querySelectorAll('.fitColumn.caution .fitPoint')){
        if(!profileExists()&&item.textContent.trim()==='No major trade-offs.'){
          item.textContent='Trade-offs depend on your priorities and the source data may be incomplete.';
        }
      }
      const rotation=key=>{try{return Math.max(0,Number(weeks(p,key))||0)}catch{return 0}};
      const h=rotation('hospital'),g=rotation('general practice');
      const c=rotation('community'),i=rotation('industry');
      const rotations=[
        h?'Hospital '+h+' weeks':null,g?'GP '+g+' weeks':null,
        c?'Community '+c+' weeks':null,i?'Industry '+i+' weeks':null
      ].filter(Boolean).join(' · ');
      for(const item of card.querySelectorAll('.fitColumn.positive .fitPoint')){
        const label=item.textContent.trim();
        if((label==='Strong pay'||label==='Strong salary')&&Number(p.salary)>0){
          item.textContent='Stated gross salary: £'+Number(p.salary).toLocaleString('en-GB')+' per year';
        }else if(label==='Major hospital exposure'&&h){
          item.textContent='Hospital rotation: '+h+' weeks';
        }else if(label==='Major GP exposure'&&g){
          item.textContent='GP rotation: '+g+' weeks';
        }else if(label==='Substantial community exposure'&&c){
          item.textContent='Community rotation: '+c+' weeks';
        }else if(label==='Industry placement exposure'&&i){
          item.textContent='Industry rotation: '+i+' weeks';
        }else if(label==='Meaningful exposure across settings'&&rotations){
          item.textContent='Recorded rotations: '+rotations;
        }
      }
      const details=card.querySelector('[data-ux-expand]');
      if(details){
        details.classList.add('atlasDetailsButtonPremium');
        details.textContent=card.classList.contains('uxExpanded')?'Hide full analysis':'View full details';
        details.setAttribute('aria-label','View full details for '+(p.title||p.employer||'programme'));
      }
      const primary=card.querySelector('[data-action="prefer"]');
      if(primary)primary.classList.add('atlasPrimarySave');
      card.classList.add('atlasDiscoveryCard');
    }
  };

  const organiseFilters=()=>{
    const panel=$('uxFilterSidebar');
    if(!panel||panel.dataset.atlasPrototype==='1'||!$('quick')||!$('visa'))return false;
    panel.dataset.atlasPrototype='1';
    const labels=[
      ['sector','Training setting'],
      ['hours','Maximum hours / week'],
      ['salary','Minimum annual salary']
    ];
    for(const [id,copy] of labels){
      const target=$(id)?.closest('.field')?.querySelector(':scope > span');
      if(target)target.textContent=copy;
    }
    const quick=$('quick');
    for(const [key,label,tip] of [
      ['hospitalgp','Hospital + GP','Hospital and general practice experience'],
      ['desk','Potential desk-based exposure','Keyword-derived indicator, not a verified work arrangement'],
      ['cv','Transferable experience','Relevant cross-sector or analytical experience; indicative only']
    ]){
      const chip=quick.querySelector('[data-q="'+key+'"]');
      if(chip){chip.textContent=label;chip.title=tip;}
    }
    quick.classList.add('atlasQuickFilters');
    const toggleQuick=document.createElement('button');
    toggleQuick.type='button';toggleQuick.className='atlasQuickMore';
    toggleQuick.textContent='More quick filters';
    toggleQuick.setAttribute('aria-expanded','false');
    toggleQuick.addEventListener('click',()=>{
      const expanded=quick.classList.toggle('atlasQuickExpanded');
      toggleQuick.textContent=expanded?'Fewer quick filters':'More quick filters';
      toggleQuick.setAttribute('aria-expanded',String(expanded));
    });
    quick.insertAdjacentElement('afterend',toggleQuick);
    const details=document.createElement('details');details.className='atlasAdvancedFilters';
    const summary=document.createElement('summary');summary.textContent='Advanced filters & exclusions';
    const description=document.createElement('p');description.className='atlasAdvancedHelp';
    description.textContent='Commute, sponsorship, specialist settings and your saved decision status.';
    details.append(summary,description);
    const advanced=[
      panel.querySelector(':scope > .uxHomePostcodeFilter'),
      $('decision')?.closest('.field'),
      $('visa')?.closest('.field'),
      $('hideAvoid')?.closest('.check'),
      $('hideOuterLondon')?.closest('.check'),
      $('hideExcluded')?.closest('.check'),
      $('hideShortlisted')?.closest('.check'),
      panel.querySelector(':scope > .uxSpecialistFilters'),
      $('sort')?.closest('.field'),
      panel.querySelector(':scope > .notice')
    ];
    for(const node of advanced)if(node&&node.parentElement===panel)details.append(node);
    panel.querySelector(':scope > .footerbar')?.insertAdjacentElement('beforebegin',details);
    // If a returning user's advanced settings are active, expose the controls.
    const current=typeof state!=='undefined'?state.filters||{}:{};
    if(['decision','visa','specialistView','hideAvoid','hideOuterLondon','hideExcluded','hideShortlisted','hideJustice','hideMental','hideOtherSpecialist'].some(k=>{
      const v=current[k];return v===true||(typeof v==='string'&&v&&v!=='all');
    }))details.open=true;
    const activeAdvanced=[...details.querySelectorAll('input,select,textarea')].some(el=>{
      if(el.type==='checkbox')return el.checked;
      if(el.type==='radio')return el.checked;
      if(el.tagName==='SELECT')return !['','all','fit'].includes(el.value);
      return Boolean(String(el.value||'').trim());
    });
    if(activeAdvanced)details.open=true;
    return true;
  };

  const syncMapToRegion=()=>{
    // The map helper uses the current filtered pin bounds, including the
    // all-regions and London cases. Do not leave a stale viewport after a change.
    window.setTimeout(()=>{if(typeof window.OrielFitMapToScope==='function')window.OrielFitMapToScope()},420);
  };
  const activate=()=>{
    // Only install after the base, product, map, and card-enhancement scripts finish.
    // Earlier installation can race with programme-card and filter initialization.
    if(typeof placements==='undefined'||!Array.isArray(placements)||!placements.length||
       !document.querySelector('.productIntro')||!window.OrielEnhanceProgrammeCards)return false;
    const hero=enhanceHero();
    const navigation=enhanceNavigation();
    const stats=enhanceStats();
    const filters=organiseFilters();
    enhanceCards();
    return hero&&navigation&&stats&&filters;
  };
  let checks=0;
  const timer=setInterval(()=>{checks++;if(activate()||checks>130)clearInterval(timer)},100);
  const results=$('results');
  if(results){
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enhanceCards();});
    }).observe(results,{childList:true,subtree:false});
  }
  document.addEventListener('click',event=>{
    const details=event.target.closest('#results .placement [data-ux-expand]');
    if(!details)return;
    requestAnimationFrame(()=>{
      details.textContent=details.closest('.placement')?.classList.contains('uxExpanded')
        ?'Hide full analysis':'View full details';
    });
  });
  $('region')?.addEventListener('change',syncMapToRegion);
})();