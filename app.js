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

    const fitDetail=(title,items,tone,empty)=>{
      const values=items.length?items:[empty];
      return `<div class="fitColumn ${tone}"><div class="fitLabel">${title}</div>${values.map(x=>`<div class="fitPoint">${esc(x)}</div>`).join('')}</div>`;
    };

    card=(p,compact=false)=>{
      const a=analyse(p),m=mark(p),inComp=state.compare.includes(p.id);
      const h=weeks(p,'hospital'),g=weeks(p,'general practice'),c=weeks(p,'community'),i=weeks(p,'industry');
      const icon=sector(p)==='Hospital'?'🏥':sector(p)==='General Practice'?'🩺':sector(p)==='Industry'?'🏭':'💊';
      const tags=[
        p.places&&`👥 ${p.places} training ${p.places===1?'place':'places'}`,
        `Sponsorship: ${p.visa===true?'offered':p.visa===false?'not offered':'not stated'}`,
        p.region&&`📍 ${p.region}`,
        `${icon} ${sector(p)}`,
        p.hours&&`⏱️ ${p.hours}h/week`,
        p.settings.length>1&&'🔀 Split',
        h&&`🏥 ${h}w`,
        g&&`🩺 ${g}w`,
        c&&`🛍️ ${c}w`,
        i&&`🏭 ${i}w`
      ].filter(Boolean);

      const code=p.id.split('/').pop();
      const savedIndex=ORIEL_SNAPSHOT.codes.indexOf(code);
      const orielState=savedIndex>=0?`Saved in Oriel #${savedIndex+1}`:ORIEL_SNAPSHOT.noPreference.includes(code)?'Oriel: No Preference':'Not in saved Oriel export';

      return `<article class="placement card" data-id="${esc(p.id)}">
        <div class="placementTop">
          <div>
            <div class="eyebrow">${esc(p.postcodes.join(' · ')||p.area||p.region)}</div>
            <h3>${esc(p.title||p.employer)}</h3>
            <div class="employer">${esc(p.employer)}</div>
          </div>
          <div>
            <div class="salary">${p.salary?'£'+p.salary.toLocaleString():'Salary n/a'}</div>
            <div class="hourly">${hourly(p)?'≈ £'+hourly(p).toFixed(2)+'/hr gross':''}</div>
          </div>
        </div>
        <div class="badges">${tags.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div>
        <div class="fit fitExpanded">
          <div class="score"><span>Personal fit</span><b>${a.score}</b><small>${esc(a.band)}</small><em>based on your priorities</em></div>
          <div class="fitBreakdown">
            ${fitDetail('Why it could fit',a.good.slice(0,4),'positive','No strong positive signals found yet.')}
            ${fitDetail('Trade-offs to check',a.bad.slice(0,3),'caution','No major trade-offs detected from the available text.')}
          </div>
        </div>
        ${compact?'':`<p class="desc">${esc(p.desc||'No programme description supplied.')}</p><button class="more" data-action="more">Read more</button>`}
        <div class="decision-quick">
          <button class="btn ${SHORT.has(m.status)?'selected':''}" data-action="prefer">${SHORT.has(m.status)?'✓ Preferred':'♡ Prefer'}</button>
          <button class="btn ${isExcluded(p)?'excluded':''}" data-action="exclude">${isExcluded(p)?'Excluded — undo':'Exclude'}</button>
          <span class="smallnote">Programme ${esc(code)} · ${esc(orielState)}</span>
        </div>
        <div class="controls">
          <select aria-label="Placement decision" data-action="status">${statusOpts(m.status)}</select>
          <div class="rate">${[1,2,3,4,5].map(n=>`<button class="star ${m.rating>=n?'on':''}" data-action="rate" data-value="${n}" title="${n}/5">⭐</button>`).join('')}</div>
          <input class="manualPriority" type="number" min="1" step="1" data-action="priority" inputmode="numeric" value="${esc(m.priority||'')}" placeholder="#" title="Manual priority">
          <input data-action="note" value="${esc(m.note||'')}" placeholder="📝 Your note…">
          <button class="btn compare ${inComp?'on':''}" data-action="compare">${inComp?'✓ Comparing':'⚖️ Compare'}</button>
          <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.postcodes[0]||p.title)+', UK')}">Map ↗</a>
        </div>
      </article>`;
    };

    stats=()=>{
      const marks=Object.values(state.marks);
      const short=marks.filter(x=>SHORT.has(x.status)).length;
      const london=placements.filter(x=>x.region.toLowerCase()==='london').length;
      const places=placements.reduce((sum,p)=>sum+(Number(p.places)||0),0);
      const hosp=placements.filter(x=>sector(x)==='Hospital').length;
      const gp=placements.filter(x=>sector(x)==='General Practice').length;
      const strong=placements.filter(x=>analyse(x).score>=78).length;
      const d=[
        ['❤️',short,'Shortlisted'],
        ['📍',london,'London programmes'],
        ['👥',places.toLocaleString(),'Training places stated'],
        ['🏥',hosp,'Hospital-led'],
        ['🩺',gp,'GP-led'],
        ['✨',strong,'Strong-fit flags']
      ];
      $('stats').innerHTML=d.map(x=>`<div class="stat"><div class="k">${x[0]} ${x[1]}</div><div class="l">${x[2]}</div></div>`).join('');
    };

    reco=()=>{
      const arr=placements
        .filter(p=>p.region.toLowerCase()==='london'&&!isExcluded(p)&&(!$('hideAvoid').checked||areaPref(p)!==-2)&&visaMatches(p))
        .map(p=>({p,a:analyse(p)}))
        .sort((x,y)=>y.a.score-x.a.score||y.p.salary-x.p.salary)
        .slice(0,18);

      $('reco').innerHTML=arr.map((x,i)=>`
        <article class="reco card">
          <div class="eyebrow">#${i+1} TO LOOK AT · ${x.a.score}/100</div>
          <h3>${esc(x.p.title)}</h3>
          <div class="badges">
            <span class="badge good">✨ ${esc(x.a.band)}</span>
            ${x.p.places?`<span class="badge">👥 ${x.p.places} ${x.p.places===1?'place':'places'}</span>`:''}
            <span class="badge">💷 ${x.p.salary?'£'+x.p.salary.toLocaleString():'n/a'}</span>
            <span class="badge">⏱️ ${x.p.hours||'?'}h</span>
          </div>
          <div class="miniFit">
            <b>Why:</b> ${esc(x.a.good.slice(0,3).join(' · ')||'No strong signals yet.')}
          </div>
          ${x.a.bad.length?`<div class="miniFit warning"><b>Check:</b> ${esc(x.a.bad.slice(0,2).join(' · '))}</div>`:''}
          <button class="btn" data-open="${esc(x.p.id)}">Open in Explore</button>
        </article>`).join('');
    };

    const injectProductIntro=()=>{
      if(document.querySelector('.productIntro'))return;
      const header=document.querySelector('header.top');
      if(!header)return;
      const intro=document.createElement('section');
      intro.className='productIntro card';
      intro.innerHTML=`
        <div class="productIntroCopy">
          <div class="eyebrow">PERSONALISED ORIEL DECISION TOOL</div>
          <h2>4,064 programmes. One long-term decision.</h2>
          <p><b>Oriel</b> is the NHS recruitment platform pharmacy students use to choose and rank foundation training programmes. The raw options are extensive; this desk turns them into a cleaner decision by filtering and explaining each programme against the priorities that matter to you.</p>
          <div class="introActions">
            <button class="btn primary" id="tuneCriteria">Tune what matters to you</button>
            <button class="btn" id="showForYou">Show my strongest matches</button>
          </div>
        </div>
        <div class="productPrinciples">
          <div><span>01</span><b>Reduce overload</b><small>Surface the useful information first instead of treating every field equally.</small></div>
          <div><span>02</span><b>Explain the score</b><small>Show the reasons and trade-offs behind a recommendation, not just a number.</small></div>
          <div><span>03</span><b>Keep the human in control</b><small>Your priorities, notes and decisions remain editable throughout the process.</small></div>
        </div>`;
      header.insertAdjacentElement('afterend',intro);

      $('tuneCriteria')?.addEventListener('click',()=>document.querySelector('[data-tab="prefs"]')?.click());
      $('showForYou')?.addEventListener('click',()=>document.querySelector('[data-tab="foryou"]')?.click());
    };

    const injectContextStrip=()=>{
      if(document.querySelector('.contextStrip'))return;
      const nav=document.querySelector('nav.tabs');
      if(!nav)return;
      const strip=document.createElement('div');
      strip.className='contextStrip';
      strip.innerHTML=`
        <span><b>Designed for a cleaner decision:</b> visual hierarchy, explicit pros/cons and adjustable priorities help reduce information overload.</span>
        <span class="contextMeta">Built-in snapshot · Oct 2026 · not affiliated with NHS England or Oriel</span>`;
      nav.insertAdjacentElement('afterend',strip);
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
    if(notice)notice.innerHTML='<b>🏠 Your circumstances can change.</b><br>London starts selected, but preferences are signals rather than hard rules. Areas you dislike are penalised rather than automatically removed so a strong programme can still surface. Commute, workload and autonomy should still be verified with the employer.';

    const hero=document.querySelector('#foryou .sectionHero p');
    if(hero)hero.textContent='A starting point, not an automatic final ranking. Each recommendation combines your priorities with the programme data and now shows both the reasons it fits and the trade-offs worth checking.';

    const footer=document.querySelector('.app-footer');
    if(footer)footer.innerHTML='Based on <a href="https://github.com/Acid555/Oriel-Placement-Explorer" target="_blank" rel="noopener">Acid555’s open-source Oriel Placement Explorer</a> · Rebuilt as a personalised decision experience using AI-assisted development. Built-in snapshot: 1 October 2026, not live Oriel data. Scores are heuristic suggestions, not verified working conditions.';

    $('resetBtn').onclick=()=>{
      $('decision').value='active';$('visa').value='';$('hideAvoid').checked=false;$('search').value='';$('sector').value='';$('region').value='';$('hours').value='';$('salary').value='';$('sort').value='fit';
      pageLimit=40;quick=new Set(['london']);document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.q==='london'));explore();reco();
    };

    injectProductIntro();
    injectContextStrip();

    try{
      renderAll();
      setTimeout(()=>placementMap?.invalidateSize(),0);
    }catch{}
  };

  base.onerror=()=>{
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk logic.</b><br>Refresh the page. If this persists, open the legacy explorer from Preferences.</div>';
  };

  document.body.appendChild(base);
})();
