'use strict';
/* Placement Atlas learning library: independent guidance and programme research links.
   It does not change catalogue data, decisions, scoring or official Oriel rankings. */
(()=>{
  const nav=document.querySelector('nav.tabs');
  if(!nav||document.getElementById('learn'))return;
  const tab=document.createElement('button');
  tab.type='button';tab.className='tab atlasLearnNavTab';tab.dataset.tab='learn';
  tab.setAttribute('aria-label','Learn');
  tab.innerHTML='<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M4 5.5v17M8 7h8M8 11h8"/></svg><span class="atlasTabLabel">Learn</span>';
  nav.append(tab);
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

    <section class="atlasLearnSection" id="atlasLearnRegions">
      <div class="eyebrow">03 · LOCATION & LIFESTYLE</div><h3>Choose a place to live as well as a placement</h3>
      <p>A region name is only a starting point. Compare the actual training postcodes, your likely home base, commute reliability, rent, transport costs and the kind of day-to-day life you want.</p>
      <div class="atlasLearnRegionTools">
        <label for="atlasLearnRegion">Explore a region</label>
        <select id="atlasLearnRegion"><option value="">Choose a region</option></select>
        <div class="atlasLearnRegionLinks" id="atlasLearnRegionLinks"><span>Choose a region to see useful research links.</span></div>
      </div>
      <div class="atlasLearnChecklist">
        <div><b>Housing</b><span>Compare rent, bills, deposits and the cost of living near the actual site.</span></div>
        <div><b>Transport</b><span>Check door-to-door time, service frequency, first and last trains, cycling and late finishes.</span></div>
        <div><b>Daily life</b><span>Think about access to friends, green space, gyms, food, culture and the activities you enjoy.</span></div>
        <div><b>Flexibility</b><span>Consider whether you may move during the year and how easily you can reach every training site.</span></div>
      </div>
      <p class="atlasLearnCaution">Use current local information rather than assuming that every town or borough in a region has the same costs or lifestyle.</p>
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
        <a href="https://www.pharmacyregulation.org/pharmacists/registering-pharmacist/registration-assessment" target="_blank" rel="noopener noreferrer">GPhC · Registration assessment</a>
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
  const prefs=document.getElementById('prefs');
  if(prefs)prefs.insertAdjacentElement('afterend',panel);
  else document.querySelector('.shell')?.append(panel);
  tab.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('learn')});
  panel.querySelectorAll('[data-learn-jump]').forEach(button=>button.addEventListener('click',()=>{
    panel.querySelector('#atlasLearn'+(button.dataset.learnJump==='settings'?'Settings':'Research'))?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }));
  const regionSelect=panel.querySelector('#atlasLearnRegion'),regionLinks=panel.querySelector('#atlasLearnRegionLinks');
  const regionNames={'east midlands':'East Midlands','east of england':'East of England','kent, surrey and sussex':'Kent, Surrey and Sussex','north east':'North East','north west':'North West','south west':'South West','thames valley':'Thames Valley','wales':'Wales','wessex':'Wessex','west midlands':'West Midlands','yorkshire and the humber':'Yorkshire and the Humber','london':'London'};
  const formatRegion=value=>regionNames[String(value||'').trim().toLowerCase()]||String(value||'').replace(/\\b[a-z]/g,c=>c.toUpperCase());
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
  const updateRegionLinks=()=>{
    if(!regionLinks||!regionSelect.value){regionLinks?.replaceChildren(Object.assign(document.createElement('span'),{textContent:'Choose a region to see useful research links.'}));return}
    const region=formatRegion(regionSelect.value);regionLinks.replaceChildren();
    addLink(regionLinks,'Cost of living and rent','https://www.google.com/search?q='+encodeURIComponent('average rent cost of living '+region+' England'));
    addLink(regionLinks,'Transport and commuting','https://www.google.com/search?q='+encodeURIComponent('public transport commuting '+region+' England'));
    addLink(regionLinks,'Things to do and local life','https://www.google.com/search?q='+encodeURIComponent('things to do lifestyle '+region+' England'));
    if(region==='London')addLink(regionLinks,'TfL fares','https://tfl.gov.uk/fares');
  };
  regionSelect?.addEventListener('change',updateRegionLinks);
  populateRegions();updateRegionLinks();
  document.addEventListener('desk:dataset',()=>{populateRegions();updateRegionLinks()});
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
    const terms=query.split(/\\s+/).filter(Boolean);
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
  document.addEventListener('desk:dataset',renderMatches);
})();
