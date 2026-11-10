/* Placement Atlas: second-stage compact + tabbed programme-card prototype.
   All original form controls, source descriptions, mini maps and handlers are moved,
   not duplicated. Only Explore results are enhanced; other views remain unchanged.
   ?atlasClassic=1 disables the prototype's styles and scripts. */
'use strict';
(()=>{
  if(new URLSearchParams(location.search).get('atlasClassic')==='1')return;
  const results=document.getElementById('results');
  if(!results)return;
  const safeNum=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):0;
  const money=n=>Number(n).toLocaleString('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});
  const dateFromSource=s=>String(s||'').trim()||'Not stated in catalogue';
  const make=(tag,className,text)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!=null)el.textContent=String(text);
    return el;
  };
  const field=(name,value)=>{
    const box=make('div','atlasCardFact');
    box.append(make('span','atlasCardFactLabel',name),make('strong','atlasCardFactValue',value));
    return box;
  };
  const eligibleProfile=()=>{try{return Boolean(state?.prefs?.onboarding)}catch{return false}};
  const weeksIn=(p,key)=>{try{return safeNum(weeks(p,key))}catch{return 0}};
  const sourceStatus=p=>{try{return mark(p)?.status||'unmarked'}catch{return 'unmarked'}};
  const countPostcodes=p=>new Set((p.postcodes||[]).map(x=>String(x).trim()).filter(Boolean)).size;
  const updateEstimate=card=>{
    const salary=safeNum(card.dataset.atlasSalary);
    const target=card.querySelector('.atlasPayEstimateValue');
    const basis=card.querySelector('.atlasPayEstimateBasis');
    const estimate=salary>0?window.OrielPay?.estimate?.(salary):null;
    if(target)target.textContent=estimate&&Number.isFinite(Number(estimate.monthly))
      ?money(estimate.monthly)+' / month':'Not available';
    if(basis)basis.textContent=window.OrielPay?.descriptor?.()||'Illustrative estimate; check your circumstances.';
  };
  const tabLabels=[
    ['overview','Overview'],
    ['training','Training & dates'],
    ['pay','Pay & eligibility'],
    ['locations','Locations & commute'],
    ['assessment','My assessment']
  ];
  function assembleCard(card,p){
    if(card.dataset.atlasDetailTabs==='1'||!card.dataset.uxEnhanced||card.dataset.atlasCompact!=='1')return;
    const fit=card.querySelector(':scope > .fit');
    const quick=card.querySelector(':scope > .decision-quick');
    const controls=card.querySelector(':scope > .controls');
    const expand=card.querySelector(':scope > [data-ux-expand]');
    if(!fit||!quick||!controls||!expand)return;
    card.dataset.atlasDetailTabs='1';

    // Source-based metadata only. A postcode count does not imply a verified
    // count of physical training sites.
    const hospital=weeksIn(p,'hospital'),gp=weeksIn(p,'general practice');
    const community=weeksIn(p,'community'),industry=weeksIn(p,'industry');
    const postcodes=countPostcodes(p);
    const hours=safeNum(p.hours),salary=safeNum(p.salary),places=safeNum(p.places);
    const setting=(hospital>=13&&gp>=13)?'Hospital + GP':(typeof sector==='function'?sector(p):'Setting not stated');
    const pills=[setting,hours?hours+'h / week':'Hours not stated'];
    const exposure=[
      hospital?'Hospital '+hospital+'w':null,gp?'GP '+gp+'w':null,
      community?'Community '+community+'w':null,industry?'Industry '+industry+'w':null
    ].filter(Boolean).join(' · ');
    if(exposure)pills.push(exposure);
    if(places)pills.push(places+' training '+(places===1?'place':'places'));
    if(postcodes>1)pills.push(postcodes+' listed postcodes');
    if(p.visa===false)pills.push('Sponsorship not offered');
    const row=card.querySelector(':scope > .atlasCompactSummary');
    if(row){
      row.replaceChildren();
      for(const [index,label] of pills.entries()){
        const chip=make('span','atlasSummaryChip',label);
        if(index===0)chip.classList.add('atlasSummaryChipPrimary');
        if(label==='Sponsorship not offered')chip.classList.add('atlasSummaryChipCaution');
        row.append(chip);
      }
    }
    card.querySelector(':scope > .atlasCompactPrompt')?.remove();

    // The compact layer shows concrete, labelled information. Unknowns remain
    // unknown; no subjective "strong pay"/"no trade-offs" claims.
    const summary=make('div','atlasCardQuickRead');
    const signals=make('div','atlasCardQuickSignals');
    const facts=[];
    if(hospital&&gp)facts.push(['good','Hospital + GP',hospital+'w hospital · '+gp+'w GP']);
    else if(exposure)facts.push(['neutral','Training rotations',exposure]);
    if(hours)facts.push(['neutral','Working week',hours+' hours']);
    if(postcodes>1)facts.push(['caution','Travel to check',postcodes+' listed postcodes']);
    else if(p.visa===false)facts.push(['caution','Eligibility to check','Sponsorship not offered']);
    if(!facts.length)facts.push(['neutral','Programme details','Check the supplied Oriel description']);
    for(const [tone,name,value] of facts.slice(0,3)){
      const span=make('span','atlasCardQuickFact atlasCardQuickFact-'+tone);
      span.append(make('i','atlasCardSignalDot'),make('b','',name),make('span','',value));
      signals.append(span);
    }
    const fitbox=make('div','atlasCardCompactFit');
    fitbox.append(make('span','atlasCardCompactFitLabel','Personal fit'));
    if(eligibleProfile()){
      let score;
      try{score=analyse(p)}catch{score=null}
      const value=Number(score?.score);
      fitbox.append(make('strong','atlasCardCompactFitValue',Number.isFinite(value)?value+' / 100':'Not available'));
      fitbox.append(make('small','',score?.band||'Based on your preferences'));
    }else{
      fitbox.append(make('strong','atlasCardCompactFitValue atlasFitUnassessed','Not personalised'));
      const quiz=make('button','atlasFitQuizLink atlasCompactFitLink','Take the quiz to assess fit');
      quiz.type='button';quiz.setAttribute('data-atlas-start-quiz','');
      fitbox.append(quiz);
    }
    summary.append(signals,fitbox);
    row?.insertAdjacentElement('afterend',summary);

    const sections=make('section','atlasCardSections');
    sections.setAttribute('aria-label','Expanded programme information');
    const tabs=make('div','atlasCardTabs');
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Programme detail sections');
    const pages=make('div','atlasCardPages');
    const panels={};
    for(const [key,label] of tabLabels){
      const tab=make('button','atlasCardTab',label);
      tab.type='button';tab.dataset.atlasCardTab=key;
      tab.id='atlas-'+CSS.escape(String(p.id)).replace(/[^a-zA-Z0-9_-]/g,'-')+'-'+key+'-tab';
      tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(key==='overview'));
      tab.tabIndex=key==='overview'?0:-1;
      tab.addEventListener('click',()=>activateTab(key,true));
      tab.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const current=tabLabels.findIndex(([id])=>id===key);
        const next=event.key==='Home'?0:event.key==='End'?tabLabels.length-1:
          (current+(event.key==='ArrowRight'?1:-1)+tabLabels.length)%tabLabels.length;
        activateTab(tabLabels[next][0],true);
      });
      tabs.append(tab);
      const pane=make('div','atlasCardPage');
      pane.dataset.atlasCardPage=key;
      pane.id=tab.id.replace('-tab','-panel');
      pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
      pane.hidden=key!=='overview';
      panels[key]=pane;
      pages.append(pane);
    }
    const activateTab=(key,focus=false)=>{
      for(const tab of tabs.children){
        const active=tab.dataset.atlasCardTab===key;
        tab.classList.toggle('atlasCardTabActive',active);
        tab.setAttribute('aria-selected',String(active));
        tab.tabIndex=active?0:-1;
        if(active&&focus)tab.focus({preventScroll:true});
      }
      for(const pane of pages.children)pane.hidden=pane.dataset.atlasCardPage!==key;
      if(key==='locations'){
        // Existing lazy mini-map and commute observer are tied to visibility.
        requestAnimationFrame(()=>{
          window.dispatchEvent(new Event('resize'));
          card.querySelector('.uxMiniMap')?.scrollIntoView?.({block:'nearest',behavior:'instant'});
        });
      }
    };
    sections.append(tabs,pages);

    // Overview: keep the genuine, preference-aware score and explanation nodes.
    const originalLocation=fit.querySelector(':scope > .uxLocationPanel');
    fit.classList.add('atlasTabbedFit');
    panels.overview.append(fit);
    const sourceNote=make('p','atlasCardSourceNote',
      'Source fields come from the supplied Oriel catalogue. Fit signals are inferred or personalised and may not reflect actual working conditions.');
    panels.overview.append(sourceNote);

    // Training: use the genuine start/rotation/description, not fabricated dates.
    const trainingFacts=make('div','atlasCardFactGrid');
    trainingFacts.append(
      field('Programme identifier',String(p.id||'Not stated').split('/').pop()),
      field('Training start',dateFromSource(p.start)),
      field('Recorded rotation weeks',exposure||'Not specified'),
      field('Training positions',places?String(places):'Not stated')
    );
    panels.training.append(trainingFacts);
    const dates=card.querySelector(':scope > .programmeDates');
    if(dates)panels.training.append(dates);
    panels.training.append(make('h4','atlasCardSubhead','Original programme description'));
    const desc=card.querySelector(':scope > .desc');
    if(desc)panels.training.append(desc);
    else panels.training.append(make('p','atlasCardSourceNote','No source description provided.'));
    const more=card.querySelector(':scope > .more');
    if(more)panels.training.append(more);

    // Pay: reuse the exact estimator and expose its existing assumptions.
    const payGrid=make('div','atlasCardFactGrid');
    payGrid.append(
      field('Gross annual salary',salary?money(salary):'Not stated'),
      field('Gross hourly rate',salary&&hours?money(salary/(52*hours))+' / hour':'Not available'),
      field('Contracted week',hours?hours+' hours':'Not stated'),
      field('Visa sponsorship',p.visa===true?'Offered':p.visa===false?'Not offered':'Not stated')
    );
    const estimate=field('Estimated monthly take-home','Calculating…');
    estimate.querySelector('.atlasCardFactValue').classList.add('atlasPayEstimateValue');
    payGrid.append(estimate);
    panels.pay.append(payGrid);
    const basis=make('p','atlasCardSourceNote atlasPayEstimateBasis');
    panels.pay.append(basis);
    panels.pay.append(make('p','atlasCardSourceNote','Estimated income is illustrative, not a guaranteed payslip. Verify tax, pension and student-loan assumptions.'));
    updateEstimate(card);

    // Locations: move the real location panel with its actual mini-map,
    // postcode switching, nearby stations and transport links.
    if(originalLocation)panels.locations.append(originalLocation);
    else panels.locations.append(make('p','atlasCardSourceNote','Location information is not available for this programme.'));
    panels.locations.append(make('p','atlasCardSourceNote','Map pins indicate supplied postcodes, not verified addresses for every rotation. Check the employer and official listing.'));

    // Assessment: move the original decision selector, priority, note and
    // comparison controls without creating parallel persistence.
    panels.assessment.append(make('p','atlasCardSourceNote','Your decisions, ranking and notes continue to use Placement Atlas’s existing saved workspace.'));
    panels.assessment.append(controls);

    quick.insertAdjacentElement('beforebegin',sections);
    // Leave shortlist/exclude controls in the compact footer; bring the real
    // compare action to that footer as shown in the supplied concept.
    const compare=controls.querySelector('[data-action="compare"]');
    if(compare){
      compare.classList.add('atlasCardFooterCompare');
      const exclusion=quick.querySelector('[data-action="exclude"]');
      if(exclusion)exclusion.insertAdjacentElement('beforebegin',compare);
      else quick.append(compare);
    }
    quick.classList.add('atlasCardFooter');
    const smallnote=quick.querySelector('.smallnote');
    if(smallnote){
      smallnote.title=smallnote.textContent.trim();
      const stateName=sourceStatus(p);
      smallnote.textContent=stateName==='unmarked'?'Not yet shortlisted':
        String(stateName).replace(/[-_]/g,' ')+' · your decision';
      smallnote.classList.add('atlasFooterDecisionStatus');
    }
    expand.classList.add('atlasSampleExpandButton');
    quick.append(expand);
    expand.textContent='View all details ↓';
    expand.setAttribute('aria-controls',sections.className);
    // Preserve product's delegated event handler and its single source of truth.
    // The button only toggles uxExpanded; tab content is revealed by CSS.
    activateTab('overview',false);
    card.classList.add('atlasSampleCard');
    card.dataset.atlasSalary=String(salary);
    updateEstimate(card);
  }
  function enhanceAll(){
    if(typeof placements==='undefined'||!Array.isArray(placements))return;
    const lookup=new Map(placements.map(p=>[String(p.id),p]));
    for(const card of results.querySelectorAll(':scope > .placement[data-id]')){
      if(card.dataset.atlasDetailTabs==='1')continue;
      const p=lookup.get(card.dataset.id);
      if(p)assembleCard(card,p);
    }
  }
  let scheduled=false;
  const queue=()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhanceAll();});
  };
  // The original results container changes children on every filter, page,
  // shortlist or preference change; only newly rendered cards are enhanced.
  new MutationObserver(queue).observe(results,{childList:true,subtree:false});
  const ready=setInterval(()=>{
    if(typeof placements!=='undefined'&&placements.length&&results.querySelector('.placement[data-atlas-compact="1"]')){
      queue();clearInterval(ready);
    }
  },150);
  // On save, the original card may rerender; do not hijack its state.
  document.addEventListener('desk:pay-settings',()=>{
    for(const card of results.querySelectorAll('.atlasSampleCard'))updateEstimate(card);
  });
  document.addEventListener('click',e=>{
    const exp=e.target.closest('#results .atlasSampleCard [data-ux-expand]');
    if(!exp)return;
    requestAnimationFrame(()=>{
      const opened=exp.closest('.placement')?.classList.contains('uxExpanded');
      exp.textContent=opened?'Collapse details ↑':'View all details ↓';
    });
  });
})();