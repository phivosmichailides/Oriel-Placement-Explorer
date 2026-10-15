'use strict';
(()=>{
  const hadSaved=(()=>{try{return !!localStorage.getItem('phivos-desk-v2')}catch{return false}})();
  const base=document.createElement('script');
  base.src='app-base.js?v=20261015-research';
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

    const activeRegion=()=>($('region')?.value||'').trim()||(quick.has('london')?'London':'');
    const scopePlacements=()=>{
      const r=activeRegion();
      return r?placements.filter(p=>p.region===r):placements;
    };
    const scopeName=()=>activeRegion()||'England & Wales';

    const resolveScopePins=async()=>{
      if(geoBusy)return;
      const region=activeRegion();
      const source=region?scopePlacements():placements.filter(matches);
      const pcs=[...new Set(source.flatMap(p=>p.postcodes.map(pcKey)))].filter(pc=>!geo[pc]);
      if(!pcs.length){drawMap(placements.filter(matches));return;}
      geoBusy=true;
      if($('locateBtn'))$('locateBtn').disabled=true;
      try{
        for(let i=0;i<pcs.length;i+=100){
          $('mapStatus').textContent=`Locating ${scopeName()} programme postcodes: ${Math.min(i+100,pcs.length)} of ${pcs.length}…`;
          const r=await fetch('https://api.postcodes.io/postcodes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postcodes:pcs.slice(i,i+100)}),signal:AbortSignal.timeout(15000)});
          if(!r.ok)throw Error();
          const j=await r.json();
          j.result.forEach(x=>{if(x.result)geo[pcKey(x.query)]=[x.result.latitude,x.result.longitude]});
        }
        try{localStorage.setItem('phivos-geo-v1',JSON.stringify(geo))}catch{}
        drawMap(placements.filter(matches));
        toast(`${scopeName()} map locations updated.`);
      }catch{
        $('mapStatus').textContent='Postcode lookup unavailable. Existing pins and all list results remain usable.';
      }finally{
        geoBusy=false;
        if($('locateBtn'))$('locateBtn').disabled=false;
      }
    };

    areaPref=p=>{
      const selected=state.prefs.onboarding?.region||'';
      const t=`${p.title} ${p.area}`.toLowerCase();
      const avoids=tokens(state.prefs.avoids),likes=tokens(state.prefs.likes);
      const areaMatch=x=>(' '+t.replace(/[^a-z0-9]+/g,' ')+' ').includes(' '+x.replace(/[^a-z0-9]+/g,' ')+' ');
      if(avoids.some(areaMatch))return-2;
      if(likes.some(areaMatch))return 2;
      if(selected)return p.region===selected?1:-1;
      return 0;
    };

    const originalAnalyse=analyse;
    analyse=p=>{
      const result=originalAnalyse(p);
      const selected=state.prefs.onboarding?.region||'';
      if(selected&&selected!=='London')result.good=result.good.map(x=>x==='📍 London location'?`📍 ${selected} location`:x);
      return result;
    };

    matches=p=>{
      if(!decisionMatches(p))return false;
      const q=$('search').value.trim().toLowerCase();
      if(q&&!q.split(/\s+/).filter(Boolean).every(term=>searchText2(p).includes(term)))return false;
      if($('sector').value&&sector(p)!==$('sector').value)return false;
      if($('region').value&&p.region!==$('region').value)return false;
      if($('hours').value&&(!p.hours||p.hours>Number($('hours').value)))return false;
      if($('salary').value&&p.salary<Number($('salary').value))return false;
      if(quick.has('london')&&!$('region').value&&p.region.toLowerCase()!=='london')return false;
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
      const tags=[p.places&&`👥 ${p.places} training ${p.places===1?'place':'places'}`,`Sponsorship: ${p.visa===true?'offered':p.visa===false?'not offered':'not stated'}`,p.region&&`📍 ${p.region}`,`${icon} ${sector(p)}`,p.hours&&`⏱️ ${p.hours}h/week`,p.settings.length>1&&'🔀 Split',h&&`🏥 ${h}w`,g&&`🩺 ${g}w`,c&&`🛍️ ${c}w`,i&&`🏭 ${i}w`].filter(Boolean);
      const code=p.id.split('/').pop();
      const savedIndex=ORIEL_SNAPSHOT.codes.indexOf(code);
      const orielState=savedIndex>=0?`Saved in Oriel #${savedIndex+1}`:ORIEL_SNAPSHOT.noPreference.includes(code)?'Oriel: No Preference':'Not in saved Oriel export';
      return `<article class="placement card" data-id="${esc(p.id)}"><div class="placementTop"><div><div class="eyebrow">${esc(p.postcodes.join(' · ')||p.area||p.region)}</div><h3>${esc(p.title||p.employer)}</h3><div class="employer">${esc(p.employer)}</div></div><div><div class="salary">${p.salary?'£'+p.salary.toLocaleString():'Salary n/a'}</div><div class="hourly">${hourly(p)?'≈ £'+hourly(p).toFixed(2)+'/hr gross':''}</div></div></div><div class="badges">${tags.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div><div class="fit fitExpanded"><div class="score"><span>Personal fit</span><b>${a.score}</b><small>${esc(a.band)}</small><em>based on your priorities</em></div><div class="fitBreakdown">${fitDetail('Why it could fit',a.good.slice(0,4),'positive','No strong positive signals found yet.')}${fitDetail('Trade-offs to check',a.bad.slice(0,3),'caution','No major trade-offs detected from the available text.')}</div></div>${compact?'':`<p class="desc">${esc(p.desc||'No programme description supplied.')}</p><button class="more" data-action="more">Read more</button>`}<div class="decision-quick"><button class="btn ${SHORT.has(m.status)?'selected':''}" data-action="prefer">${SHORT.has(m.status)?'✓ Preferred':'♡ Prefer'}</button><button class="btn ${isExcluded(p)?'excluded':''}" data-action="exclude">${isExcluded(p)?'Excluded — undo':'Exclude'}</button><span class="smallnote">Programme ${esc(code)} · ${esc(orielState)}</span></div><div class="controls"><select aria-label="Placement decision" data-action="status">${statusOpts(m.status)}</select><div class="rate">${[1,2,3,4,5].map(n=>`<button class="star ${m.rating>=n?'on':''}" data-action="rate" data-value="${n}" title="${n}/5">⭐</button>`).join('')}</div><input class="manualPriority" type="number" min="1" step="1" data-action="priority" inputmode="numeric" value="${esc(m.priority||'')}" placeholder="#" title="Manual priority"><input data-action="note" value="${esc(m.note||'')}" placeholder="📝 Your note…"><button class="btn compare ${inComp?'on':''}" data-action="compare">${inComp?'✓ Comparing':'⚖️ Compare'}</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.postcodes[0]||p.title)+', UK')}">Map ↗</a></div></article>`;
    };

    stats=()=>{
      const marks=Object.values(state.marks),short=marks.filter(x=>SHORT.has(x.status)).length,scope=scopePlacements(),places=scope.reduce((sum,p)=>sum+(Number(p.places)||0),0),hosp=scope.filter(x=>sector(x)==='Hospital').length,gp=scope.filter(x=>sector(x)==='General Practice').length,strong=scope.filter(x=>analyse(x).score>=78).length;
      const d=[['❤️',short,'Shortlisted'],['📍',scope.length.toLocaleString(),`${scopeName()} programmes`],['👥',places.toLocaleString(),'Training places stated'],['🏥',hosp,'Hospital-led'],['🩺',gp,'GP-led'],['✨',strong,'Strong-fit flags']];
      $('stats').innerHTML=d.map(x=>`<div class="stat"><div class="k">${x[0]} ${x[1]}</div><div class="l">${x[2]}</div></div>`).join('');
    };

    reco=()=>{
      const region=activeRegion();
      const arr=placements.filter(p=>(window.deskWithinRadius?.(p)!==false)&&(!region||p.region===region)&&(!$('salary').value||p.salary>=Number($('salary').value))&&(!$('hours').value||(p.hours&&p.hours<=Number($('hours').value)))&&!isExcluded(p)&&(!$('hideAvoid').checked||areaPref(p)!==-2)&&visaMatches(p)).map(p=>({p,a:analyse(p)})).sort((x,y)=>y.a.score-x.a.score||y.p.salary-x.p.salary).slice(0,18);
      const title=document.querySelector('#foryou .sectionHero h2');
      if(title)title.textContent=`✨ Your strongest matches${region?' · '+region:' · England & Wales'}`;
      $('reco').innerHTML=arr.length?arr.map((x,i)=>`<article class="reco card"><div class="eyebrow">#${i+1} TO LOOK AT · ${x.a.score}/100</div><h3>${esc(x.p.title)}</h3><div class="badges"><span class="badge good">✨ ${esc(x.a.band)}</span><span class="badge">📍 ${esc(x.p.region)}</span>${x.p.places?`<span class="badge">👥 ${x.p.places} ${x.p.places===1?'place':'places'}</span>`:''}<span class="badge">💷 ${x.p.salary?'£'+x.p.salary.toLocaleString():'n/a'}</span><span class="badge">⏱️ ${x.p.hours||'?'}h</span></div><div class="miniFit"><b>Why:</b> ${esc(x.a.good.slice(0,3).join(' · ')||'No strong signals yet.')}</div>${x.a.bad.length?`<div class="miniFit warning"><b>Check:</b> ${esc(x.a.bad.slice(0,2).join(' · '))}</div>`:''}<button class="btn" data-open="${esc(x.p.id)}">Open in Explore</button></article>`).join(''):'<div class="card empty">No programmes match these limits. Loosen your salary or hours filters in Explore, or retake setup in Preferences.</div>';
    };

    const fitCurrentMap=()=>{
      if(!mapLayer||!placementMap)return;
      const pts=mapLayer.getLayers().map(l=>l.getLatLng());
      if(pts.length)placementMap.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:11});
    };

    const updateMapHeading=()=>{
      const region=activeRegion();
      const title=document.querySelector('.map-heading h2');
      const eyebrow=document.querySelector('.map-heading .eyebrow');
      if(title)title.textContent=region?`See where you could work in ${region}`:'See where you could work across England & Wales';
      if(eyebrow)eyebrow.textContent=region?`${region.toUpperCase()} PROGRAMMES`:'ENGLAND & WALES PROGRAMMES';
    };
    const baseExplore=explore;
    explore=()=>{baseExplore();updateMapHeading();};

    const refreshScope=async({locate=false}={})=>{
      stats();explore();reco();
      const mapTitle=document.querySelector('.map-heading h2');
      if(mapTitle)mapTitle.textContent=activeRegion()?`See where you could work in ${activeRegion()}`:'See where you could work across England & Wales';
      const mapEyebrow=document.querySelector('.map-heading .eyebrow');
      if(mapEyebrow)mapEyebrow.textContent=activeRegion()?`${activeRegion().toUpperCase()} PROGRAMMES`:'ENGLAND & WALES PROGRAMMES';
      if(locate&&activeRegion()){
        try{await resolveScopePins()}catch{}
        setTimeout(fitCurrentMap,100);
      }else setTimeout(fitCurrentMap,100);
    };

    const injectProductIntro=()=>{
      if(document.querySelector('.productIntro'))return;
      const header=document.querySelector('header.top');if(!header)return;
      const intro=document.createElement('section');intro.className='productIntro card';
      intro.innerHTML=`<div class="productIntroCopy"><div class="eyebrow">ENGLAND & WALES · PERSONALISED ORIEL DECISION TOOL</div><h2>4,064 programmes across 12 regions. One long-term decision.</h2><p><b>Oriel</b> gives pharmacy applicants thousands of England & Wales Foundation Pharmacy programmes to preference. This desk turns the dataset into a cleaner decision by filtering and explaining each programme against the priorities that matter to you.</p><div class="introActions"><button class="btn primary" id="tuneCriteria">Personalise my desk</button><button class="btn" id="showForYou">Show my strongest matches</button></div></div><div class="productPrinciples"><div><span>01</span><b>Reduce overload</b><small>Surface the useful information first instead of treating every field equally.</small></div><div><span>02</span><b>Explain the score</b><small>Show the reasons and trade-offs behind a recommendation, not just a number.</small></div><div><span>03</span><b>Work for every included region</b><small>Choose the region and priorities that work for you.</small></div></div>`;
      header.insertAdjacentElement('afterend',intro);
      $('tuneCriteria')?.addEventListener('click',()=>document.getElementById('personaliseAgain')?.click());
      $('showForYou')?.addEventListener('click',()=>document.querySelector('[data-tab="foryou"]')?.click());
    };

    const injectContextStrip=()=>{
      if(document.querySelector('.contextStrip'))return;
      const nav=document.querySelector('nav.tabs');if(!nav)return;
      const strip=document.createElement('div');strip.className='contextStrip';
      strip.innerHTML=`<span><b>Designed for a cleaner decision:</b> choose any included Oriel region, then compare programmes using the same personalised criteria, pros/cons, map and ranking tools.</span><span class="contextMeta">England & Wales programme dataset · Oct 2026 · not affiliated with NHS England or Oriel</span>`;
      nav.insertAdjacentElement('afterend',strip);
    };

    if(!hadSaved){state.prefs.weights={money:5,hospital:4,gp:4,lifestyle:5,location:4,progression:5,independence:5,communityPenalty:5};save();}
    $('search').placeholder='Employer, region, postcode, programme ID…';
    $('quick').innerHTML='<button class="chip" id="allRegionsBtn">🌍 All regions</button><button class="chip" data-q="london">📍 London</button><button class="chip" data-q="hospital">🏥 Hospital-led</button><button class="chip" data-q="gp">🩺 GP-heavy</button><button class="chip" data-q="hospitalgp">🏥+🩺 Hosp+GP</button><button class="chip" data-q="split">🔀 Any split</button><button class="chip" data-q="industry">🏭 Industry</button><button class="chip" data-q="lowcommunity">🛍️ Low community</button><button class="chip" data-q="desk">🎧 Desk-ish</button><button class="chip" data-q="cv">🚀 CV boost</button><button class="chip" data-q="hours">⏱️ ≤40h</button><button class="chip" data-q="pay">💷 £30k+</button>';
    document.querySelector('[data-q="london"]')?.classList.toggle('on',quick.has('london'));
    $('hideAvoid').checked=false;
    const hideLabel=$('hideAvoid').parentElement;for(const n of hideLabel.childNodes)if(n.nodeType===Node.TEXT_NODE)n.textContent=' Hide avoided areas entirely';
    const notice=document.querySelector('.notice');if(notice)notice.innerHTML='<b>🧭 London is your default, not a limitation.</b><br>Select any included region and the list, recommendations, statistics and map switch with you. The app resolves that region’s programme postcodes so the interactive pins work there too. Commute, workload and autonomy should still be verified with the employer.';
    const hero=document.querySelector('#foryou .sectionHero p');if(hero)hero.textContent='A starting point, not an automatic final ranking. Recommendations follow the region you are exploring and combine your priorities with programme data, showing both reasons to consider an option and trade-offs worth checking.';
    const footer=document.querySelector('.app-footer');if(footer)footer.innerHTML='Based on <a href="https://github.com/Acid555/Oriel-Placement-Explorer" target="_blank" rel="noopener">Acid555’s open-source Oriel Placement Explorer</a> · Rebuilt as a personalised England & Wales decision experience using AI-assisted development. Built-in snapshot: October 2026, not live Oriel data. Scores are heuristic suggestions, not verified working conditions.';

    const regionEl=$('region');
    regionEl.addEventListener('change',()=>{if(regionEl.value){quick.delete('london');document.querySelector('[data-q="london"]')?.classList.remove('on');}pageLimit=40;refreshScope({locate:!!regionEl.value});});
    document.querySelector('[data-q="london"]')?.addEventListener('click',()=>{if(quick.has('london'))regionEl.value='';setTimeout(()=>refreshScope({locate:false}),0);});
    $('allRegionsBtn')?.addEventListener('click',()=>{regionEl.value='';quick.delete('london');document.querySelector('[data-q="london"]')?.classList.remove('on');pageLimit=40;refreshScope({locate:false});});
    if($('locateBtn'))$('locateBtn').onclick=resolveScopePins;
    $('resetBtn').onclick=()=>{$('decision').value='active';$('visa').value='';$('hideAvoid').checked=false;$('search').value='';$('sector').value='';$('region').value='';$('hours').value='';$('salary').value='';$('sort').value='fit';pageLimit=40;quick=new Set(['london']);document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.toggle('on',x.dataset.q==='london'));refreshScope({locate:false});};

    ['salary','hours'].forEach(id=>$(id).addEventListener('change',reco));
    injectProductIntro();injectContextStrip();
    try{renderAll();setTimeout(()=>placementMap?.invalidateSize(),0);}catch{}
  };

  base.onerror=()=>{const r=document.getElementById('results');if(r)r.innerHTML='<div class="errorBox"><b>Could not load the Placement Desk logic.</b><br>Refresh the page. If this persists, open the legacy explorer from Preferences.</div>';};
  document.body.appendChild(base);
})();
