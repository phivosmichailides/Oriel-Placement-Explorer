'use strict';
/* Placement Atlas learning library: independent guidance and programme research links.
   It does not change catalogue data, decisions, scoring or official Oriel rankings. */
(()=>{
  const nav=document.querySelector('nav.tabs');
  if(!nav||document.getElementById('learn'))return;
  const tab=document.createElement('button');
  tab.type='button';tab.className='tab atlasLearnNavTab';tab.dataset.tab='learn';
  tab.setAttribute('aria-label','Learning Hub');
  tab.innerHTML='<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M4 5.5v17M8 7h8M8 11h8"/></svg><span class="atlasTabLabel">Learning Hub</span>';
  const preferencesTab=nav.querySelector(':scope > .tab[data-tab="prefs"]');
  if(preferencesTab)nav.insertBefore(tab,preferencesTab);else nav.append(tab);
  const panel=document.createElement('section');panel.id='learn';panel.className='panel atlasLearnPanel';
  panel.innerHTML=`
    <header class="atlasLearnHero">
      <div class="eyebrow">PLACEMENT ATLAS · LEARNING LIBRARY</div>
      <h2>Understand the year before you choose it.</h2>
      <p>Independent, practical guidance on training settings, programme structures, regions, pay, working life and what to ask before accepting a placement.</p>
      <div class="atlasLearnHeroActions">
        <button type="button" class="btn primary" data-learn-jump="settings">Explore training settings</button>
        <button type="button" class="btn" data-learn-jump="research">Research a programme</button>
      </div>
      <p class="atlasLearnDisclaimer">Guidance, not a promise about any individual employer. Programme details can vary between sites and change between recruitment cycles.</p>
    </header>

    <section class="atlasLearnSection" id="atlasLearnSettings">
      <div class="atlasLearnSectionHead"><div><div class="eyebrow">01 · THE WORK</div><h3>What does each training setting involve?</h3><p>The setting gives you a clue about the work, but the actual rota, supervisor and responsibilities matter more than the label.</p></div></div>
      <div class="atlasLearnSettingGrid">
        <details class="atlasLearnTopic"><summary>Community pharmacy</summary><div><p>Usually combines dispensing and accuracy checking with patient-facing advice, services, medicines safety and the day-to-day running of a pharmacy.</p><ul><li>Expect regular interaction with patients and the wider primary-care network.</li><li>Workload can be shaped by prescription volume, staffing, service demand and local systems.</li><li>Ask how much protected learning time is available alongside operational work.</li></ul></div></details>
        <details class="atlasLearnTopic"><summary>Hospital pharmacy</summary><div><p>Can include clinical ward work, medicines reconciliation, discharge planning, specialist services, dispensary work and multidisciplinary team learning.</p><ul><li>Rotations and exposure differ significantly between hospitals and departments.</li><li>Ask which clinical areas you will actually visit and how often you will be supervised on wards.</li><li>Clarify weekend, evening and bank-holiday commitments.</li></ul></div></details>
        <details class="atlasLearnTopic"><summary>General practice (GP)</summary><div><p>Often involves working with GPs, practice pharmacists and other primary-care colleagues on medicines optimisation, structured reviews, long-term conditions and prescribing-related work.</p><ul><li>Ask what a trainee is permitted and expected to do at each stage.</li><li>Check whether the placement is embedded in a practice team or split across several practices.</li><li>Find out how clinical supervision and feedback are organised.</li></ul></div></details>
        <details class="atlasLearnTopic"><summary>Split or mixed programmes</summary><div><p>A split programme can give experience across hospital, GP and/or community settings. The number of weeks in each setting is important, but so is how the placements fit together.</p><ul><li>Check the exact weeks and sequence in each setting.</li><li>Ask whether supervisors coordinate learning across sites.</li><li>Calculate travel between every site, not just the first postcode.</li></ul></div></details>
        <details class="atlasLearnTopic"><summary>Industry, research or specialist exposure</summary><div><p>Some programmes may include specialist or non-traditional exposure. Read the programme description carefully and confirm the day-to-day work with the employer.</p><ul><li>Ask what projects, responsibilities and supervision are guaranteed.</li><li>Check how the experience maps to the foundation training outcomes.</li><li>Do not assume that a programme title alone guarantees a particular role.</li></ul></div></details>
      </div>
    </section>

    <section class="atlasLearnSection" id="atlasLearnStructure">
      <div class="eyebrow">02 · PROGRAMME STRUCTURE</div><h3>How to read a split placement</h3>
      <p>A programme may list several training settings or postcodes. That does not automatically tell you the weekly timetable, whether you move between sites, or how much time you spend in each team.</p>
      <div class="atlasLearnChecklist">
        <div><b>Weeks</b><span>Check the stated weeks in hospital, GP, community or other settings.</span></div>
        <div><b>Sequence</b><span>Ask which setting comes first and whether rotations change during the year.</span></div>
        <div><b>Sites</b><span>Confirm the exact address for every site and whether the location can change.</span></div>
        <div><b>Travel</b><span>Check whether travel between sites happens during the working day and whether expenses are reimbursed.</span></div>
        <div><b>Supervision</b><span>Find out who your designated supervisor is and how feedback is coordinated across placements.</span></div>
      </div>
    </section>

    <section class="atlasLearnSection atlasRegionExplorer" id="atlasLearnRegions">
      <div class="eyebrow">03 · LOCATION & LIFESTYLE</div>
      <h3>Find a region that fits the rest of your life.</h3>
      <p>Look beyond the regional label. Use the actual programme postcodes, salary, rota and likely commute when comparing places.</p>
      <div class="atlasLearnRegionTools">
        <label for="atlasLearnRegion">Where are you considering?</label>
        <select id="atlasLearnRegion"><option value="">Choose a region</option></select>
      </div>
      <div class="atlasRegionData" id="atlasRegionData" aria-live="polite">
        <p class="atlasLearnCaution">Select a region to see the programme snapshot and research tools.</p>
      </div>
      <div class="atlasLearnRegionLinks" id="atlasLearnRegionLinks" aria-label="Independent region research"></div>
      <div class="atlasRegionDecision">
        <div><strong>Housing</strong><span>Compare rental prices for the towns or postcodes where you might actually live — not a region-wide average.</span></div>
        <div><strong>Commute</strong><span>Check the journey on a weekday at your real start time, and whether late or weekend services work.</span></div>
        <div><strong>Work–life balance</strong><span>Weigh weekly hours, shift patterns, commute and housing costs together.</span></div>
      </div>
      <p class="atlasLearnCaution">Programme statistics below use the site's dated 2026 Oriel dataset. They are not live salary, rental or availability figures.</p>
    </section>

    <section class="atlasLearnSection" id="atlasLearnPay">
      <div class="eyebrow">04 · PAY & WORKING LIFE</div><h3>Look beyond the headline salary</h3>
      <p>Compare the advertised gross annual salary with contracted weekly hours, rota expectations and the real cost of getting to work. A higher salary can be less attractive if the commute, hours or housing costs are substantially higher.</p>
      <div class="atlasLearnChecklist">
        <div><b>Gross pay</b><span>Confirm the annual salary, pay point and whether the figure is for the full training year.</span></div>
        <div><b>Take-home pay</b><span>Income tax, National Insurance, pension contributions and student-loan deductions affect net pay.</span></div>
        <div><b>Hours and rota</b><span>Ask about weekends, evenings, bank holidays, overtime, breaks and how rotas are published.</span></div>
        <div><b>Travel and expenses</b><span>Check reimbursement for travel between sites, mileage, parking and required training days.</span></div>
        <div><b>Support</b><span>Ask about protected study time, exam preparation, supervision and access to learning resources.</span></div>
      </div>
      <div class="atlasLearnExternalLinks">
        <a href="https://www.gov.uk/income-tax-rates" target="_blank" rel="noopener noreferrer">GOV.UK · Income Tax rates</a>
        <a href="https://www.nhsbsa.nhs.uk/nhs-pensions" target="_blank" rel="noopener noreferrer">NHS Pensions</a>
        <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/housing/bulletins/privaterentandhousepricesuk/latest" target="_blank" rel="noopener noreferrer">ONS · Private rent and house prices</a>
        <a href="https://tfl.gov.uk/fares" target="_blank" rel="noopener noreferrer">TfL · Fares</a>
      </div>
    </section>

    <section class="atlasLearnSection" id="atlasLearnYear">
      <div class="eyebrow">05 · THE FOUNDATION YEAR</div><h3>What should you expect as a trainee?</h3>
      <div class="atlasLearnTimeline">
        <div><b>Get oriented</b><p>Understand your role, workplace policies, supervision arrangements, learning plan and the expectations for each placement.</p></div>
        <div><b>Build evidence</b><p>Keep up with your learning portfolio, record relevant experiences and use feedback to identify gaps early.</p></div>
        <div><b>Develop judgement</b><p>Practise clinical reasoning, communication, medicines safety and reflective learning with appropriate supervision.</p></div>
        <div><b>Prepare consistently</b><p>Set a regular study routine for the GPhC registration assessment rather than leaving preparation until the final weeks.</p></div>
        <div><b>Review progress</b><p>Use supervisor meetings to discuss progress, workload, support needs and the next learning objectives.</p></div>
      </div>
      <p class="atlasLearnCaution">Your employer's training plan and the current GPhC requirements take precedence. Confirm current rules and deadlines directly with the regulator.</p>
      <div class="atlasLearnExternalLinks">
        <a href="https://www.pharmacyregulation.org/" target="_blank" rel="noopener noreferrer">General Pharmaceutical Council (GPhC)</a>
        <a href="https://www.pharmacyregulation.org/students-and-trainees/pharmacist-education-and-training/common-registration-assessment/sitting-common-registration-assessment" target="_blank" rel="noopener noreferrer">GPhC · Common Registration Assessment</a>
      </div>
    </section>

    <section class="atlasLearnSection" id="atlasLearnChecklist">
      <div class="eyebrow">06 · BEFORE YOU RANK OR ACCEPT</div><h3>Questions worth asking the employer</h3>
      <div class="atlasLearnQuestionGrid">
        <label><input type="checkbox"> What are the exact training addresses and rotation dates?</label>
        <label><input type="checkbox"> How many weeks are spent in each setting?</label>
        <label><input type="checkbox"> What are the contracted hours and weekend expectations?</label>
        <label><input type="checkbox"> Who supervises me in each placement?</label>
        <label><input type="checkbox"> How much protected study and assessment preparation is provided?</label>
        <label><input type="checkbox"> Are travel costs between sites reimbursed?</label>
        <label><input type="checkbox"> What support is available if I struggle or fall behind?</label>
        <label><input type="checkbox"> Which details are confirmed, and which may change?</label>
      </div>
    </section>

    <section class="atlasLearnSection atlasLearnResearch" id="atlasLearnResearch">
      <div class="eyebrow">07 · REAL-WORLD RESEARCH</div><h3>Look up a specific programme</h3>
      <p>Search the catalogue to find public discussions and reviews relating to an employer or training site. These links open the original public sources; Placement Atlas does not verify or endorse individual comments.</p>
      <label class="atlasLearnSearchLabel" for="atlasLearnProgrammeSearch">Search by programme, employer, region or postcode</label>
      <input id="atlasLearnProgrammeSearch" type="search" autocomplete="off" placeholder="e.g. Royal Free, Chelsea & Westminster, SW10 9NH">
      <div id="atlasLearnProgrammeResults" class="atlasLearnProgrammeResults" aria-live="polite"></div>
      <div id="atlasLearnSelectedProgramme" class="atlasLearnSelectedProgramme" hidden></div>
      <p class="atlasLearnCaution">Google reviews usually describe patient or customer experiences, not the quality of foundation training. Reddit discussions and individual reviews are anecdotes, not representative evidence. Check dates, context and the exact site before relying on them.</p>
    </section>

    <section class="atlasLearnSection atlasLearnSources">
      <div class="eyebrow">REFERENCE POINTS</div><h3>Use official information to verify the details</h3>
      <div class="atlasLearnExternalLinks">
        <a href="https://www.pharmacyregulation.org/" target="_blank" rel="noopener noreferrer">GPhC · Registration and training requirements</a>
        <a href="https://www.oriel.nhs.uk/" target="_blank" rel="noopener noreferrer">Official Oriel recruitment system</a>
        <a href="https://www.nhs.uk/" target="_blank" rel="noopener noreferrer">NHS · Health and services</a>
        <a href="https://www.nationalrail.co.uk/" target="_blank" rel="noopener noreferrer">National Rail · Journey planning</a>
      </div>
      <p class="atlasLearnCaution">This guide is separate from the future member discussion forum. Community-submitted experiences will need clear dates, source context, moderation and reporting before they are published.</p>
    </section>
  `;
  // Existing Oriel information becomes a secondary Guidance view.
  const guide=document.createElement('div');guide.id='atlasLearnGuidance';
  while(panel.firstChild)guide.append(panel.firstChild);
  guide.hidden=true;
  const home=document.createElement('div');home.id='atlasLearnHome';
  home.innerHTML='<header class="atlasLearnHero"><div class="eyebrow">YOUR PHARMACY LEARNING SPACE</div><h2>Learn with purpose.</h2><p>Build confidence from your first MPharm year through foundation training and registration preparation.</p></header>'+
  '<div class="atlasLearnHomeGrid">'+
  '<article class="atlasLearnModule"><span class="atlasModuleIndex">01</span><h3>Drug knowledge</h3><p>Practise a structured formulary and build clinically accurate medicine knowledge.</p><small>Formulary exercises · next stage</small></article>'+
  '<article class="atlasLearnModule"><span class="atlasModuleIndex">02</span><h3>Flashcards &amp; revision</h3><p>Organise year-specific material and revisit the concepts you find difficult.</p><small>Study tools · planned</small></article>'+
  '<article class="atlasLearnModule"><span class="atlasModuleIndex">03</span><h3>Clinical simulations</h3><p>Practise counselling, prescription checking, services and OSCE-style scenarios.</p><small>Interactive practice · planned</small></article>'+
  '<article class="atlasLearnModule"><span class="atlasModuleIndex">04</span><h3>Journal &amp; portfolio</h3><p>Capture learning experiences, reflections and future portfolio material.</p><small>Private autosaving journal · planned</small></article></div>'+
  '<section class="atlasLearnHubGuidance"><div><span class="eyebrow">GUIDANCE &amp; ADVICE</span><h3>Research a placement</h3><p>Understand training settings, salary, working life and programme structure.</p></div><button type="button" class="btn" data-atlas-learn-view="guide">Open guidance</button></section>';
  const menu=document.createElement('nav');menu.className='atlasLearnHubNav';menu.setAttribute('aria-label','Learning Hub sections');
  menu.innerHTML='<button type="button" data-atlas-learn-view="home" aria-current="page">Learning</button><button type="button" data-atlas-learn-view="guide">Guidance &amp; advice</button>';
  panel.append(menu,home,guide);
  panel.querySelectorAll('[data-atlas-learn-view]').forEach(b=>b.addEventListener('click',()=>{
    const guidance=b.dataset.atlasLearnView==='guide';
    guide.hidden=!guidance;home.hidden=guidance;
    menu.querySelectorAll('button').forEach(x=>x.setAttribute('aria-current',String(x===b?'page':'false')));
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  const prefs=document.getElementById('prefs');
  if(prefs)prefs.insertAdjacentElement('afterend',panel);
  else document.querySelector('.shell')?.append(panel);
  tab.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('learn')});
  panel.querySelectorAll('[data-learn-jump]').forEach(button=>button.addEventListener('click',()=>{
    panel.querySelector('#atlasLearn'+(button.dataset.learnJump==='settings'?'Settings':'Research'))?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }));
  const regionSelect=panel.querySelector('#atlasLearnRegion'),regionLinks=panel.querySelector('#atlasLearnRegionLinks');
  const regionNames={'east midlands':'East Midlands','east of england':'East of England','kent, surrey and sussex':'Kent, Surrey and Sussex','north east':'North East','north west':'North West','south west':'South West','thames valley':'Thames Valley','wales':'Wales','wessex':'Wessex','west midlands':'West Midlands','yorkshire and the humber':'Yorkshire and the Humber','london':'London'};
  const formatRegion=value=>regionNames[String(value||'').trim().toLowerCase()]||String(value||'').replace(/\b[a-z]/g,c=>c.toUpperCase());
  const allPlacements=()=>{try{return Array.isArray(placements)?placements:[]}catch{return []}};
  const cleanTitle=p=>window.AtlasPrototypeCleanTitle?.(p.title||p.employer||'Programme',p)||p.title||p.employer||'Programme';
  const populateRegions=()=>{
    if(!regionSelect)return;
    const current=regionSelect.value,regions=[...new Set(allPlacements().map(p=>p.region).filter(Boolean))].sort((a,b)=>formatRegion(a).localeCompare(formatRegion(b)));
    regionSelect.replaceChildren(new Option('Choose a region',''));
    for(const value of regions)regionSelect.add(new Option(formatRegion(value),value));
    if(regions.includes(current))regionSelect.value=current;
  };
  const addLink=(parent,label,url)=>{
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;parent.append(a);
  };
  const regionData=panel.querySelector('#atlasRegionData');
  const regionExplore=region=>{
    const exploreFilter=document.getElementById('region');
    if(exploreFilter){
      exploreFilter.value=region;
      exploreFilter.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.querySelector('nav.tabs [data-tab="explore"]')?.click();
  };
  const updateRegionLinks=()=>{
    if(!regionLinks||!regionData)return;
    const region=regionSelect.value;
    regionLinks.replaceChildren();regionData.replaceChildren();
    if(!region){
      const hint=document.createElement('p');hint.textContent='Choose a region to compare its programmes and plan your next steps.';
      hint.className='atlasLearnCaution';regionData.append(hint);return;
    }
    const items=allPlacements().filter(p=>p.region===region);
    const salaries=items.map(p=>Number(p.salary)).filter(n=>Number.isFinite(n)&&n>10000&&n<150000).sort((a,b)=>a-b);
    const hours=items.map(p=>Number(p.hours)).filter(n=>Number.isFinite(n)&&n>=15&&n<=60).sort((a,b)=>a-b);
    const median=a=>a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null;
    const money=n=>'£'+Math.round(n).toLocaleString('en-GB');
    const tiles=[
      ['Programmes in catalogue',String(items.length)],
      ['Median listed salary',salaries.length?money(median(salaries)):'Not stated'],
      ['Median weekly hours',hours.length?median(hours)+' hours':'Not stated']
    ];
    const title=document.createElement('h4');title.textContent=formatRegion(region)+' · at a glance';regionData.append(title);
    const grid=document.createElement('div');grid.className='atlasRegionStats';
    for(const [label,value] of tiles){
      const item=document.createElement('div');
      const small=document.createElement('span');small.textContent=label;
      const big=document.createElement('strong');big.textContent=value;
      item.append(small,big);grid.append(item);
    }
    regionData.append(grid);
    const note=document.createElement('p');note.className='atlasRegionFootnote';
    note.textContent=salaries.length
      ?'Salary data available for '+salaries.length+' of '+items.length+' programmes. Median is descriptive, not a prediction of an offer.'
      :'Programme salaries are not available for this region in the loaded dataset.';
    regionData.append(note);
    const button=document.createElement('button');button.type='button';button.className='btn primary atlasRegionExploreBtn';
    button.textContent='Explore programmes in '+formatRegion(region);
    button.addEventListener('click',()=>regionExplore(region));regionData.append(button);
    const heading=document.createElement('strong');heading.className='atlasRegionLinksHeading';
    heading.textContent='Useful next checks';regionLinks.append(heading);
    addLink(regionLinks,'Local rents · ONS','https://www.ons.gov.uk/visualisations/housingpriceslocal/');
    addLink(regionLinks,'Train routes · National Rail','https://www.nationalrail.co.uk/');
    const transport={
      'london':['London travel · TfL','https://tfl.gov.uk/'],
      'wales':['Wales travel · TfW','https://tfw.wales/'],
      'north west':['Greater Manchester travel · TfGM','https://tfgm.com/'],
      'west midlands':['West Midlands travel · TfWM','https://www.tfwm.org.uk/'],
      'north east':['Tyne and Wear travel · Nexus','https://www.nexus.org.uk/'],
      'south west':['West of England travel · Travelwest','https://travelwest.info/']
    };
    const specific=transport[String(region).toLowerCase()];
    if(specific)addLink(regionLinks,...specific);
    addLink(regionLinks,'Local transport · Traveline','https://www.traveline.info/');
    const footer=document.createElement('p');footer.className='atlasRegionFootnote';
    footer.textContent='Select exact towns and training sites before using local rent and travel information.';
    regionLinks.append(footer);
  };
  regionSelect?.addEventListener('change',updateRegionLinks);
  populateRegions();updateRegionLinks();
  const search=panel.querySelector('#atlasLearnProgrammeSearch'),results=panel.querySelector('#atlasLearnProgrammeResults'),selected=panel.querySelector('#atlasLearnSelectedProgramme');
  const researchFor=p=>{
    if(!selected)return;
    selected.hidden=false;selected.replaceChildren();
    const heading=document.createElement('div');heading.className='atlasLearnSelectedHead';
    const name=document.createElement('strong');name.textContent=cleanTitle(p);
    const meta=document.createElement('span');meta.textContent=formatRegion(p.region)+' · '+(p.postcodes||[]).join(' + ');
    heading.append(name,meta);selected.append(heading);
    const links=document.createElement('div');links.className='atlasLearnExternalLinks';
    const base=(p.employer||cleanTitle(p))+' '+(p.region||'')+' foundation pharmacist training';
    addLink(links,'Search Google reviews','https://www.google.com/search?q='+encodeURIComponent((p.employer||cleanTitle(p))+' '+(p.region||'')+' reviews'));
    addLink(links,'Search Reddit discussions','https://www.reddit.com/search/?q='+encodeURIComponent(base));
    addLink(links,'Find the training site on Google Maps','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((p.employer||cleanTitle(p))+' '+(p.postcodes||[]).join(' ')));
    addLink(links,'Search the wider web','https://www.google.com/search?q='+encodeURIComponent(base+' trainee experience'));
    selected.append(links);
  };
  const renderMatches=()=>{
    if(!search||!results)return;
    const query=search.value.trim().toLowerCase();results.replaceChildren();
    if(query.length<2){results.hidden=true;return}
    const terms=query.split(/\s+/).filter(Boolean);
    const matches=allPlacements().filter(p=>{
      const haystack=[p.title,p.employer,p.region,p.id,...(p.postcodes||[])].join(' ').toLowerCase();
      return terms.every(term=>haystack.includes(term));
    }).slice(0,8);
    results.hidden=false;
    if(!matches.length){const empty=document.createElement('p');empty.className='atlasLearnNoResults';empty.textContent='No matching programmes. Try an employer, town or postcode.';results.append(empty);return}
    for(const p of matches){
      const button=document.createElement('button');button.type='button';button.className='atlasLearnProgrammeResult';
      const title=document.createElement('strong');title.textContent=cleanTitle(p);
      const meta=document.createElement('span');meta.textContent=formatRegion(p.region)+' · '+(p.postcodes||[]).join(' + ')+' · '+(p.salary?'£'+Number(p.salary).toLocaleString('en-GB'):'Salary not listed');
      button.append(title,meta);button.addEventListener('click',()=>{search.value=cleanTitle(p);results.hidden=true;researchFor(p)});
      results.append(button);
    }
  };
  search?.addEventListener('input',renderMatches);
  // The catalogue loads asynchronously. The main app announces desk:ready,
  // not necessarily desk:dataset; hydrate again once data is available.
  const syncLibrary=()=>{populateRegions();updateRegionLinks();renderMatches();};
  for(const event of ['desk:ready','desk:dataset','desk:cards-ready'])document.addEventListener(event,syncLibrary);
  tab.addEventListener('click',syncLibrary);
  const awaitCatalogue=attempt=>{
    if(allPlacements().length){syncLibrary();return;}
    if(attempt<40)window.setTimeout(()=>awaitCatalogue(attempt+1),250);
  };
  awaitCatalogue(0);
})();
