/* Placement Atlas · workspace refinement, phase 2.
   Presentation-only: no shortlist, ranking, preference or account data writes. */
(()=>{
  const root=document.documentElement;
  if(!root.classList.contains('atlasPremiumPreview'))return;

  const clean=value=>{
    try{
      if(typeof window.AtlasPrototypeCleanTitle==='function')
        return window.AtlasPrototypeCleanTitle(value);
    }catch{}
    return String(value||'').replace(/\s+/g,' ').trim();
  };
  const placementById=id=>{
    try{
      if(typeof placements!=='undefined'&&Array.isArray(placements))
        return placements.find(p=>p.id===id)||null;
    }catch{}
    return null;
  };

  const decorateTitle=(heading,full)=>{
    if(!heading||!full||heading.dataset.atlasWorkspaceTitle==='1')return;
    const concise=clean(full);
    if(!concise||concise===full)return;
    heading.dataset.atlasWorkspaceTitle='1';
    heading.title=full;
    const short=document.createElement('span');
    short.className='atlasWorkspaceTitleConcise';short.textContent=concise;
    const original=document.createElement('span');
    original.className='atlasWorkspaceTitleOriginal';original.textContent=full;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='atlasWorkspaceTitleExpand';
    toggle.textContent='Full name';toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Show full programme title');
    toggle.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const expanded=heading.classList.toggle('atlasWorkspaceTitleOpen');
      toggle.textContent=expanded?'Less':'Full name';
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.setAttribute('aria-label',expanded?'Show shortened programme title':'Show full programme title');
    });
    heading.replaceChildren(short,original,toggle);
  };

  const enhanceShortlist=()=>{
    const list=document.getElementById('shortlistList');
    if(!list)return;
    for(const row of list.querySelectorAll(':scope > .rank-row')){
      const card=row.querySelector(':scope > .placement');
      if(!card||card.dataset.atlasWorkspacePrepared==='1')continue;
      card.dataset.atlasWorkspacePrepared='1';
      const p=placementById(card.dataset.id);
      if(p)decorateTitle(card.querySelector(':scope > .placementTop h3'),p.title||p.employer);

      const badges=card.querySelector(':scope > .badges');
      if(badges&&badges.children.length>5){
        const all=[...badges.children];
        const warnings=all.filter(el=>el.classList.contains('warn')||el.classList.contains('bad'));
        const ordinary=all.filter(el=>!warnings.includes(el));
        const visible=[...ordinary.slice(0,5),...warnings];
        const extra=ordinary.slice(5);
        badges.replaceChildren(...visible);
        if(extra.length){
          const disclosure=document.createElement('details');
          disclosure.className='atlasShortlistFacts';
          const summary=document.createElement('summary');
          summary.textContent='Rotation details & other facts';
          disclosure.append(summary,...extra);
          badges.after(disclosure);
        }
      }

      const fit=card.querySelector(':scope > .fit');
      const why=fit?.querySelector(':scope > .why');
      if(why&&why.children.length){
        const disclosure=document.createElement('details');
        disclosure.className='atlasShortlistWhy';
        const summary=document.createElement('summary');
        summary.textContent='Why this fit';
        disclosure.append(summary,why);
        fit.append(disclosure);
      }
    }
  };

  const enhanceRecommendations=()=>{
    const grid=document.getElementById('reco');
    if(!grid)return;
    for(const card of grid.querySelectorAll(':scope > .reco')){
      const open=card.querySelector('[data-open]');
      const p=placementById(open?.dataset.open);
      if(p)decorateTitle(card.querySelector('h3'),p.title||p.employer);
    }
  };

  const updateForYouIntro=()=>{
    const hero=document.querySelector('#foryou .sectionHero');
    if(!hero)return;
    const eyebrow=hero.querySelector('.eyebrow');
    const heading=hero.querySelector('h2');
    const paragraph=hero.querySelector('p');
    let personalised=false;
    try{personalised=typeof state!=='undefined'&&!!state.prefs?.onboarding}catch{}
    if(personalised){
      if(eyebrow)eyebrow.textContent='BASED ON YOUR PRIORITIES';
      if(heading)heading.textContent='Your strongest matches';
      if(paragraph)paragraph.textContent='Based on your saved priorities. Use the reasons and trade-offs as guidance, not an Oriel ranking.';
    }else{
      if(eyebrow)eyebrow.textContent='START HERE';
      if(heading)heading.textContent='Programmes worth a closer look';
      if(paragraph)paragraph.textContent='Set your priorities to tailor these suggestions. Until then, they are a general starting point.';
    }
  };

  const polish=()=>{
    enhanceShortlist();
    enhanceRecommendations();
    updateForYouIntro();
  };
  polish();

  const shortlist=document.getElementById('shortlistList');
  if(shortlist)new MutationObserver(polish).observe(shortlist,{childList:true});
  const reco=document.getElementById('reco');
  if(reco)new MutationObserver(polish).observe(reco,{childList:true});

  document.addEventListener('desk:after-navigation',polish);
  document.addEventListener('desk:dataset',polish);
  document.addEventListener('desk:profile-updated',polish);
})();
