'use strict';
(()=>{
  const hadSaved=(()=>{try{return !!localStorage.getItem('phivos-desk-v2')}catch{return false}})();
  const base=document.createElement('script');
  base.src='app-base.js?v=20261013-oriel-snapshot';
  base.onload=()=>{
    const aliases=[
      [/university college london hospitals|university college hospital/i,' uclh '],
      [/guy.?s and st.? thomas|guys and st thomas/i,' gstt '],
      [/king.?s college hospital/i,' kch kings '],
      [/chelsea and westminster/i,' chelwest cwh '],
      [/imperial college healthcare/i,' imperial ich '],
      [/royal free/i,' rfl royal free '],
      [/great ormond street/i,' gosh '],
      [/south london and (?:the )?maudsley/i,' slam '],
      [/east london nhs foundation trust/i,' elft '],
      [/central and north west london/i,' cnwl '],
      [/lewisham and greenwich/i,' lgt '],
      [/st george.?s university hospitals/i,' st georges stgh '],
      [/barts health/i,' barts '],
      [/homerton healthcare/i,' homerton '],
      [/whittington health/i,' whittington '],
      [/croydon health services/i,' chs ']
    ];
    const searchText2=p=>{let t=`${p.id} ${text(p)}`;for(const [re,a] of aliases)if(re.test(t))t+=a;return t.toLowerCase()};
    const communityHeavy2=p=>weeks(p,'community')>=26||(!p.settings.length&&p.type.toLowerCase().includes('community'));
    const deskSignal2=p=>{const t=text(p);return any(t,['medication review','medicines optimisation','medicines information','audit','quality improvement','repeat prescribing','clinical trial','data','hybrid','remote','regulatory','pharmacovigilance','digital'])||weeks(p,'general practice')>=26||weeks(p,'hospital')>=26};
    const cvSignal2=p=>{const t=text(p);return weeks(p,'industry')>=13||any(t,['clinical trials','research','medicines information','industry','gsk','viatris','glaxosmithkline','pharmacovigilance','regulatory','teaching hospital','specialist','tertiary','quality improvement','clinical procurement','academia','digital','data'])};
    matches=p=>{
      if(!decisionMatches(p))return false;
      const q=$('search').value.trim().toLowerCase();
      if(q&&!q.split(/\s+/).filter(Boolean).every(term=>searchText2(p).includes(term)))return false;
      if($('sector').value&&sector(p)!==$('sector').value)return false;
      if($('region').value&&p.region!==$('region').value)return false;
      if($('hours').value&&(!p.hours||p.hours>Number($('hours').value)))return false;
      if($('salary').value&&p.salary<Number($('salary').value))return false;
      if(quick.has('london')&&p.region.toLowerCase()!=='london')return false;
      const sectorQuick=[];
      if(quick.has('hospital'))sectorQuick.push(()=>sector(p)==='Hospital');
      if(quick.has('gp'))sectorQuick.push(()=>sector(p)==='General Practice');
      if(quick.has('industry'))sectorQuick.push(()=>has(p,'industry'));
      if(sectorQuick.length&&!sectorQuick.some(fn=>fn()))return false;
      if(quick.has('hospitalgp')&&!(weeks(p,'hospital')>0&&weeks(p,'general practice')>0))return false;
      if(quick.has('split')&&p.settings.length<2)return false;
      if(quick.has('lowcommunity')&&communityHeavy2(p))return false;
      if(quick.has('desk')&&!deskSignal2(p))return false;
      if(quick.has('cv')&&!cvSignal2(p))return false;
      if(quick.has('hours')&&(!p.hours||p.hours>40))return false;
      if(quick.has('pay')&&p.salary<30000)return false;
      return true;
    };
    reco=()=>{
      const arr=placements.filter(p=>p.region.toLowerCase()==='london'&&!isExcluded(p)&&(!$('hideAvoid').checked||areaPref(p)!==-2)&&visaMatches(p)).map(p=>({p,a:analyse(p)})).sort((x,y)=>y.a.score-x.a.score||y.p.salary-x.p.salary).slice(0,18);
      $('reco').innerHTML=arr.map((x,i)=>`<article class="reco card"><div class="eyebrow">#${i+1} TO LOOK AT · ${x.a.score}/100</div><h3>${esc(x.p.title)}</h3><div class="badges"><span class="badge good">✨ ${esc(x.a.band)}</span><span class="badge">💷 ${x.p.salary?'£'+x.p.salary.toLocaleString():'n/a'}</span><span class="badge">⏱️ ${x.p.hours||'?'}h</span></div><p>${esc(x.a.good.slice(0,4).join(' · ')||'Worth a closer look based on your current preferences.')}</p>${x.a.bad.length?`<p class="recoWarn">⚠️ ${esc(x.a.bad.slice(0,2).join(' · '))}</p>`:''}<button class="btn" data-open="${esc(x.p.id)}">Open in Explore</button></article>`).join('');
    };
    if(!hadSaved){
      state.prefs.weights={money:5,hospital:4,gp:4,lifestyle:5,location:4,progression:5,independence:5,communityPenalty:5};
      save();
    }
    $('search').placeholder='Employer, acronym (UCLH/GSTT), postcode, programme ID…';
    $('quick').innerHTML='<button class="chip" data-q="london">📍 London</button><button class="chip" data-q="hospital">🏥 Hospital-led</button><button class="chip" data-q="gp">🩺 GP-heavy</button><button class="chip" data-q="hospitalgp">🏥+🩺 Hosp+GP</button><button class="chip" data-q="split">🔀 Any split</button><button class="chip" data-q="industry">🏭 Industry</button><button class="chip" data-q="lowcommunity">🛍️ Low community</button><button class="chip" data-q="desk">🎧 Desk-ish</button><button class="chip" data-q="cv">🚀 CV boost</button><button class="chip" data-q="hours">⏱️ ≤40h</button><button class="chip" data-q="pay">💷 £30k+</button>';
    document.querySelector('[data-q="london"]')?.classList.toggle('on',quick.has('london'));
    $('hideAvoid').checked=false;
    const hideLabel=$('hideAvoid').parentElement;
    for(const n of hideLabel.childNodes)if(n.nodeType===Node.TEXT_NODE)n.textContent=' Hide avoided areas entirely';
    const notice=document.querySelector('.notice');
    if(notice)notice.innerHTML='<b>🏠 Move-friendly by design.</b><br>Bermondsey is not treated as permanent. London starts selected. Areas you dislike are penalised, not hidden, unless you tick the box above. Area matching is approximate; zones, commute, workload and autonomy still need checking with the employer.';
    const hero=document.querySelector('#foryou .sectionHero p');
    if(hero)hero.textContent='Not an automatic final ranking. Oriel is your safety net: this surfaces options that fit your money, lifestyle, hospital/GP and transferable-CV priorities and explains why.';
    const footer=document.querySelector('.app-footer');
    if(footer)footer.innerHTML='Based on <a href="https://github.com/Acid555/Oriel-Placement-Explorer" target="_blank" rel="noopener">Acid555’s Oriel Placement Explorer</a> · Built-in snapshot: 1 October 2026, not live Oriel data. Upload your latest CSV to refresh. Scores are text-based suggestions, not verified working conditions.';
    $('resetBtn').onclick=()=>{
      $('decision').value='active';$('visa').value='';$('hideAvoid').checked=false;$('search').value='';$('sector').value='';$('region').value='';$('hours').value='';$('salary').value='';$('sort').value='fit';
      pageLimit=40;quick=new Set(['london']);document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.q==='london'));explore();reco();
    };
    try{renderAll();setTimeout(()=>placementMap?.invalidateSize(),0)}catch{}
  };
  base.onerror=()=>{
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk logic.</b><br>Refresh the page. If this persists, open the legacy explorer from Preferences.</div>';
  };
  document.body.appendChild(base);
})();

