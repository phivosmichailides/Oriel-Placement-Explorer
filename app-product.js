'use strict';
(()=>{
  const hadSaved=(()=>{try{return !!localStorage.getItem('phivos-desk-v2')}catch{return false}})();
  const base=document.createElement('script');
  base.src='app-base.js?v=20261109fix1';
  base.onload=()=>{
    const decisions=[['','○','Unmarked'],['love','♡','Love'],['yes','✓','Strong yes'],['maybe','◐','Maybe'],['backup','◇','Only if needed'],['no','−','No'],['never','×','Absolutely not']];
    const decisionPicker=status=>{
      const current=decisions.find(x=>x[0]===status)||decisions[0];
      return `<details class="decisionPicker decision-${status||'unmarked'}"><summary aria-label="Placement decision: ${current[2]}"><span>${current[1]} ${current[2]}</span><span aria-hidden="true">⌄</span></summary><div class="decisionChoices" role="group" aria-label="Choose your decision">${decisions.map(([value,icon,label])=>`<button type="button" class="decisionChoice decision-${value||'unmarked'}" data-action="status-choice" data-value="${value}" aria-pressed="${value===status}"><span aria-hidden="true">${icon}</span><span>${label}</span>${value===status?'<span class="decisionTick" aria-hidden="true">✓</span>':''}</button>`).join('')}</div></details>`;
    };
    document.addEventListener('click',event=>{
      const choice=event.target.closest('[data-action="status-choice"]');
      if(choice){const card=choice.closest('.placement');const p=placements.find(x=>x.id===card?.dataset.id);if(p)setMark(p,{status:choice.dataset.value});}
      document.querySelectorAll('.decisionPicker[open]').forEach(picker=>{if(!picker.contains(event.target))picker.open=false;});
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.decisionPicker[open]').forEach(picker=>{picker.open=false;picker.querySelector('summary').focus();});});

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

    // Resolve every missing location code for the current scope in one run.
    // Full postcodes use the bulk endpoint (100 per request); outcodes use
    // postcode.io's district centroid and are labelled approximate on the map.
    let resolveScopeAgain=false;
    const resolveScopePins=async()=>{
      if(geoBusy){resolveScopeAgain=true;return;}
      if(typeof geo==='undefined')return;
      const region=activeRegion();
      const source=placements;
      const validPoint=value=>Array.isArray(value)&&value.length>=2&&Number.isFinite(Number(value[0]))&&Number.isFinite(Number(value[1]));
      // A cached null is a failed lookup, not a resolved location. A valid
      // postcode-district centroid is also a usable fallback for that postcode.
      const hasGeo=key=>{
        if(validPoint(geo[key]))return true;
        if(String(key).startsWith('@OUTCODE:'))return false;
        const outward=(String(key).match(/^[A-Z]{1,2}\d[A-Z\d]?/i)||[])[0];
        return !!outward&&validPoint(geo['@OUTCODE:'+outward.toUpperCase()]);
      };
      const postcodes=[...new Set(source.flatMap(p=>(p.postcodes||[]).map(pcKey)))];
      const outcodes=[...new Set(source.flatMap(p=>(p.outcodes||[]).map(x=>String(x).toUpperCase())))];
      const missingPostcodes=postcodes.filter(pc=>!hasGeo(pc));
      const missingOutcodes=outcodes.filter(oc=>!hasGeo('@OUTCODE:'+oc));
      let total=missingPostcodes.length+missingOutcodes.length;
      if(!total){
        drawMap(placements.filter(matches));
        setTimeout(()=>fitCurrentMap?.(),100);
        toast('All available postcode and outcode locations are already checked.');
        return;
      }

      geoBusy=true;
      const locateButton=$('locateBtn');
      const originalLabel=locateButton?.textContent||'Locate all sites';
      if(locateButton){locateButton.disabled=true;locateButton.textContent='Locating…';locateButton.setAttribute('aria-busy','true');}
      const status=$('mapStatus');
      let completed=0,located=0,next=0,nextRenderAt=400;
      const failed=[];
      const jobs=[];
      for(let i=0;i<missingPostcodes.length;i+=100)jobs.push({type:'postcode',values:missingPostcodes.slice(i,i+100)});
      for(const outcode of missingOutcodes)jobs.push({type:'outcode',value:outcode});
      const scheduledOutcodes=new Set(missingOutcodes);
      const queueOutcodeFallback=postcode=>{
        const outward=(postcode.match(/^[A-Z]{1,2}\d[A-Z\d]?/)||[])[0];
        if(!outward||hasGeo('@OUTCODE:'+outward)||scheduledOutcodes.has(outward))return;
        scheduledOutcodes.add(outward);jobs.push({type:'outcode',value:outward});total++;
      };
      const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

      const request=async(url,options={})=>{
        let lastError;
        for(let attempt=0;attempt<3;attempt++){
          try{
            const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});
            if(response.status===404)return {status:404,result:null};
            if(!response.ok){
              const retryable=response.status===429||response.status>=500;
              if(retryable&&attempt<2){await delay(500*(attempt+1));continue;}
              throw Error('Location service returned '+response.status);
            }
            return await response.json();
          }catch(error){
            lastError=error;
            if(attempt<2)await delay(450*(attempt+1));
          }
        }
        throw lastError||Error('Location lookup failed');
      };

      const processJob=async job=>{
        if(job.type==='postcode'){
          const data=await request('https://api.postcodes.io/postcodes',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({postcodes:job.values})
          });
          const returned=new Set();
          (Array.isArray(data.result)?data.result:[]).forEach(item=>{
            const key=pcKey(item.query||'');
            if(!key)return;
            returned.add(key);
            const point=item.result;
            if(point&&Number.isFinite(Number(point.latitude))&&Number.isFinite(Number(point.longitude))){
              geo[key]=[Number(point.latitude),Number(point.longitude)];located++;
            }else{geo[key]=null;queueOutcodeFallback(key);}
          });
          job.values.forEach(key=>{if(!returned.has(key)){geo[key]=null;queueOutcodeFallback(key);}});
        }else{
          const key='@OUTCODE:'+job.value;
          const data=await request('https://api.postcodes.io/outcodes/'+encodeURIComponent(job.value));
          const point=data.result;
          if(point&&Number.isFinite(Number(point.latitude))&&Number.isFinite(Number(point.longitude))){
            geo[key]=[Number(point.latitude),Number(point.longitude)];located++;
          }else{geo[key]=null;}
        }
      };

      const worker=async()=>{
        while(next<jobs.length){
          const job=jobs[next++];
          try{await processJob(job);}
          catch(error){
            const keys=job.type==='postcode'?job.values:['@OUTCODE:'+job.value];
            failed.push(...keys);
            console.warn('Location batch could not be resolved',error);
          }
          completed+=job.type==='postcode'?job.values.length:1;
          if(status)status.textContent='Locating all training sites · '+completed.toLocaleString()+' of '+total.toLocaleString()+' location codes checked';
          if(completed>=nextRenderAt||completed===total){
            drawMap(placements.filter(matches));
            try{localStorage.setItem('phivos-geo-v1',JSON.stringify(geo))}catch{}
            nextRenderAt+=400;
          }
        }
      };

      try{
        await Promise.all(Array.from({length:Math.min(4,jobs.length)},worker));
        try{localStorage.setItem('phivos-geo-v1',JSON.stringify(geo))}catch{}
        drawMap(placements.filter(matches));
        setTimeout(()=>fitCurrentMap?.(),100);
        document.dispatchEvent(new CustomEvent('desk:locations-updated'));
        const unresolvedPostcodes=postcodes.filter(pc=>!hasGeo(pc));
        const unresolvedOutcodes=outcodes.filter(oc=>!validPoint(geo['@OUTCODE:'+oc]));
        const unresolvedCount=new Set([...unresolvedPostcodes,...unresolvedOutcodes.map(oc=>'@OUTCODE:'+oc)]).size;
        if(failed.length)toast(located.toLocaleString()+' locations added; '+failed.length.toLocaleString()+' lookup requests need a retry.');
        else if(unresolvedCount)toast(located.toLocaleString()+' locations added; '+unresolvedCount.toLocaleString()+' location codes remain unresolved.'+(navigator.onLine===false?' Reconnect and the app will retry automatically.':''));
        else toast('All '+(postcodes.length+outcodes.length).toLocaleString()+' location codes have usable map positions.');
      }catch(error){
        console.error('Location resolution failed',error);
        if(status)status.textContent='Location lookup was interrupted. Existing map pins are still available; retry Locate all sites.';
        toast('Location lookup was interrupted. You can retry without losing completed locations.');
      }finally{
        geoBusy=false;
        if(locateButton){locateButton.disabled=false;locateButton.textContent=originalLabel;locateButton.removeAttribute('aria-busy');}
        if(resolveScopeAgain){resolveScopeAgain=false;setTimeout(()=>resolveScopePins(),0);}
      }
    };
    // Retry any missing postcode/outcode lookups automatically when connectivity returns.
    let onlineResolveTimer=null;
    window.addEventListener('online',()=>{
      if(geoBusy){resolveScopeAgain=true;return;}
      if(onlineResolveTimer)clearTimeout(onlineResolveTimer);
      onlineResolveTimer=setTimeout(()=>{
        onlineResolveTimer=null;
        if(navigator.onLine!==false)resolveScopePins();
      },900);
    });

    areaPref=p=>{
      const selected=state.prefs.onboarding?.region||'';
      const t=`${p.title} ${p.area}`.toLowerCase();
      const avoids=tokens(state.prefs.avoids),likes=tokens(state.prefs.likes);
      const areaMatch=x=>(' '+t.replace(/[^a-z0-9]+/g,' ')+' ').includes(' '+x.replace(/[^a-z0-9]+/g,' ')+' ');
      if(window.OrielGeoBlacklist?.assess(p).kind==='blocked')return-2;
      if(window.OrielGeoBlacklist?.matchesPreferred?.(p))return 2;
      if(likes.some(areaMatch))return 2;
      if(selected)return p.region===selected?1:-1;
      return 0;
    };

    const originalAnalyse=analyse;
    analyse=p=>{
      const result=originalAnalyse(p);
      const selected=state.prefs.onboarding?.region||'';
      if(selected&&selected!=='London')result.good=result.good.map(x=>x===' London location'?` ${selected} location`:x);
      return result;
    };

    matches=p=>{
      if(window.OrielSpecialist?.filterOut(p))return false;
      if(!decisionMatches(p))return false;
      if(state.prefs.preferredAreasOnly&&(state.prefs.locationLikes||[]).length){const preferred=window.OrielGeoBlacklist?.matchesPreferred?.(p);if(preferred===false)return false;}
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
      if(quick.has('community'))sectorQuick.push(()=>sector(p)==='Community Pharmacy');
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
      const icon=sector(p)==='Hospital'?'':sector(p)==='General Practice'?'':sector(p)==='Industry'?'':'';
      const badgeClass=label=>{
        const text=label.trim();
        if(text==='Sponsorship: not offered')return 'badge-sponsorship-warning';if(text.startsWith('Specialist:'))return 'badge-specialist';
        if(/^(Hospital)(:|$)/.test(text))return 'badge-hospital';
        if(/^(General Practice|GP)(:|$)/.test(text))return 'badge-gp';
        if(/^Industry(:|$)/.test(text))return 'badge-industry';
        if(/^Community(?: Pharmacy)?(:|$)/.test(text))return 'badge-community';
        return '';
      };
      const specialised=window.OrielSpecialist?.classify(p)||[];
      const tags=[...specialised.map(x=>'Specialist: '+window.OrielSpecialist.labelOf(x)),p.places&&` ${p.places} training ${p.places===1?'place':'places'}`,`Sponsorship: ${p.visa===true?'offered':p.visa===false?'not offered':'not stated'}`,p.region&&` ${p.region}`,`${icon} ${sector(p)}`,p.hours&&` ${p.hours}h/week`,p.settings.length>1&&' Split',h&&`Hospital: ${h}w`,g&&`GP: ${g}w`,c&&`Community: ${c}w`,i&&`Industry: ${i}w`].filter(Boolean);
      const code=p.id.split('/').pop();
      const orielState=m.priority?`Your shortlist priority #${m.priority}`:SHORT.has(m.status)?'Saved to your shortlist':'Not shortlisted';
      return `<article class="placement card" data-id="${esc(p.id)}"><div class="placementTop"><div><div class="eyebrow">${esc(p.postcodes.join(' · ')||p.area||p.region)}</div><h3>${esc(p.title||p.employer)}</h3><div class="employer">${esc(p.employer)}</div></div><div><div class="salary ${p.salary?'salary-value':''}">${p.salary?'£'+p.salary.toLocaleString():'Salary n/a'}</div><div class="hourly">${hourly(p)?'≈ £'+hourly(p).toFixed(2)+'/hr gross':''}</div></div></div><div class="badges">${tags.map(x=>`<span class="badge ${badgeClass(x)}">${esc(x)}</span>`).join('')}</div><div class="fit fitExpanded"><div class="score" data-fit-tone="${a.score>=78?'excellent':a.score>=65?'good':a.score>=50?'mixed':'poor'}"><span>Personal fit</span><b>${a.score}</b><small>${esc(a.band)}</small><em>based on your priorities</em></div><div class="fitBreakdown">${fitDetail('Why it could fit',a.good.slice(0,4),'positive','No strong positive signals found yet.')}${fitDetail('Trade-offs to check',a.bad.slice(0,3),'caution','No major trade-offs.')}</div></div>${compact?'':`<p class="desc">${esc(p.desc||'No programme description supplied.')}</p><button class="more" data-action="more">Read more</button>`}<div class="decision-quick"><button class="btn ${SHORT.has(m.status)?'selected':''}" data-action="prefer">${SHORT.has(m.status)?'Remove from shortlist':'Add to shortlist'}</button><button class="btn ${isExcluded(p)?'excluded':''}" data-action="exclude">${isExcluded(p)?'Excluded — undo':'Exclude'}</button><span class="smallnote">Programme ${esc(code)} · ${esc(orielState)}</span></div><div class="controls">${decisionPicker(m.status)}<input class="manualPriority" type="number" min="1" step="1" data-action="priority" inputmode="numeric" value="${esc(m.priority||'')}" placeholder="#" title="Manual priority"><input data-action="note" value="${esc(m.note||'')}" placeholder=" Your note…"><button class="btn compare ${inComp?'on':''}" data-action="compare">${inComp?' Comparing':' Compare'}</button></div></article>`;
    };

    stats=()=>{
      const marks=Object.values(state.marks),short=marks.filter(x=>SHORT.has(x.status)).length,scope=scopePlacements(),places=scope.reduce((sum,p)=>sum+(Number(p.places)||0),0),hosp=scope.filter(x=>sector(x)==='Hospital').length,gp=scope.filter(x=>sector(x)==='General Practice').length,strong=scope.filter(x=>analyse(x).score>=78).length;
      const d=[['',short,'Shortlisted'],['',scope.length.toLocaleString(),`${scopeName()} programmes`],['',places.toLocaleString(),'Training places stated'],['',hosp,'Hospital-led'],['',gp,'GP-led'],['',strong,'Strong-fit flags']];
      $('stats').innerHTML=d.map(x=>`<div class="stat"><div class="k">${x[0]} ${x[1]}</div><div class="l">${x[2]}</div></div>`).join('');
    };

    reco=()=>{
      const region=activeRegion();
      const arr=placements.filter(p=>!window.OrielSpecialist?.filterOut(p)&&(window.deskWithinRadius?.(p)!==false)&&(!region||p.region===region)&&(!$('salary').value||p.salary>=Number($('salary').value))&&(!$('hours').value||(p.hours&&p.hours<=Number($('hours').value)))&&!window.OrielGeoBlacklist?.shouldHide(p)&&!isExcluded(p)&&(!$('hideShortlisted')?.checked||!SHORT.has(mark(p).status))&&(!($('hideOuterLondon')?.checked&&region==='London')||!window.OrielAreaRules?.isOuterTown(p))&&visaMatches(p)).map(p=>({p,a:analyse(p)})).sort((x,y)=>y.a.score-x.a.score||y.p.salary-x.p.salary).slice(0,18);
      const title=document.querySelector('#foryou .sectionHero h2');
      if(title)title.textContent=`✨ Your strongest matches${region?' · '+region:' · England & Wales'}`;
      $('reco').innerHTML=arr.length?arr.map((x,i)=>`<article class="reco card"><div class="eyebrow">#${i+1} TO LOOK AT · ${x.a.score}/100</div><h3>${esc(x.p.title)}</h3><div class="badges"><span class="badge good"> ${esc(x.a.band)}</span><span class="badge"> ${esc(x.p.region)}</span>${x.p.places?`<span class="badge"> ${x.p.places} ${x.p.places===1?'place':'places'}</span>`:''}<span class="badge ${x.p.salary?'salary-value':''}"> ${x.p.salary?'£'+x.p.salary.toLocaleString():'n/a'}</span><span class="badge"> ${x.p.hours||'?'}h</span></div><div class="miniFit"><b>Why:</b> ${esc(x.a.good.slice(0,3).join(' · ')||'No strong signals yet.')}</div>${x.a.bad.length?`<div class="miniFit warning"><b>Check:</b> ${esc(x.a.bad.slice(0,2).join(' · '))}</div>`:''}<button class="btn" data-open="${esc(x.p.id)}">Open in Explore</button></article>`).join(''):'<div class="card empty">No programmes match these limits. Loosen your salary or hours filters in Explore, or retake setup in Preferences.</div>';
    };

    const fitCurrentMap=()=>{
      if(typeof window.OrielFitMapToScope==='function'){
        window.OrielFitMapToScope();
        return;
      }
      if(!mapLayer||!placementMap)return;
      const bounds=window.OrielMapCurrentBounds?.isValid?.()?window.OrielMapCurrentBounds:null;
      const pts=mapLayer.getLayers().map(l=>l.getLatLng());
      const target=bounds||(pts.length?L.latLngBounds(pts):null);
      if(target?.isValid?.()){
        placementMap.invalidateSize(false);
        placementMap.fitBounds(target,{
          padding:[42,42],maxZoom:11,animate:false
        });
      }
    };
    window.OrielFitCurrentMap=fitCurrentMap;

    const updateMapHeading=()=>{
      const count=Array.isArray(window.OrielFilteredProgrammes)?window.OrielFilteredProgrammes.length:placements.filter(matches).length;
      const total=placements.length;
      const title=document.querySelector('.map-heading h2');
      const eyebrow=document.querySelector('.map-heading .eyebrow');
      if(title)title.textContent=count===total?'Explore all programme locations across England & Wales':`Explore ${count.toLocaleString()} matching programme locations`;
      if(eyebrow)eyebrow.textContent=`${total.toLocaleString()} TOTAL · ${count.toLocaleString()} MATCHING`;
    };
    const baseExplore=explore;
    explore=()=>{baseExplore();updateMapHeading();};

    const refreshScope=async({locate=false}={})=>{
      stats();explore();reco();
      updateMapHeading();
      if(locate){try{await resolveScopePins()}catch{}}
      setTimeout(fitCurrentMap,100);
    };

    const injectProductIntro=()=>{
      if(document.querySelector('.productIntro'))return;
      const header=document.querySelector('header.top');if(!header)return;
      const intro=document.createElement('section');intro.className='productIntro card';
      intro.innerHTML=`<div class="productIntroCopy"><div class="eyebrow">ENGLAND & WALES · PERSONALISED ORIEL DECISION TOOL</div><h2>4,064 programmes across 12 regions. <span class="uxNoBreak">One long-term decision.</span></h2><p><b>Oriel</b> gives pharmacy applicants thousands of England & Wales Foundation Pharmacy programmes to preference. This desk turns the dataset into a cleaner decision by filtering and explaining each programme against the priorities that matter to you.</p><div class="introActions"><button class="btn primary" id="tuneCriteria">Personalise my desk</button><button class="btn" id="showForYou">Show my strongest matches</button></div></div><div class="productPrinciples"><div><span>01</span><b>Reduce overload</b><small>Surface the useful information first instead of treating every field equally.</small></div><div><span>02</span><b>Explain the score</b><small>Show the reasons and trade-offs behind a recommendation, not just a number.</small></div><div><span>03</span><b>Work for every included region</b><small>Choose the region and priorities that work for you.</small></div></div>`;
      header.insertAdjacentElement('afterend',intro);
      $('tuneCriteria')?.addEventListener('click',()=>{
        if(typeof window.openOrielPersonalisation==='function')window.openOrielPersonalisation();
        else document.getElementById('personaliseAgain')?.click();
      });
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
    $('quick').innerHTML='<button class="chip" id="allRegionsBtn"> All regions</button><button class="chip" data-q="london"> London</button><button class="chip" data-q="hospital"> Hospital-led</button><button class="chip" data-q="gp"> GP-heavy</button><button class="chip" data-q="hospitalgp">Hosp+GP</button><button class="chip" data-q="split"> Any split</button><button class="chip" data-q="industry"> Industry</button><button class="chip" data-q="community"> Community</button><button class="chip" data-q="lowcommunity"> Low community</button><button class="chip" data-q="desk"> Desk-ish</button><button class="chip" data-q="cv"> CV boost</button><button class="chip" data-q="hours"> ≤40h</button><button class="chip" data-q="pay"> £30k+</button>';
    document.querySelectorAll('.chip[data-q]').forEach(button=>button.classList.toggle('on',quick.has(button.dataset.q)));
    const hideLabel=$('hideAvoid').parentElement;for(const n of hideLabel.childNodes)if(n.nodeType===Node.TEXT_NODE)n.textContent=' Hide avoided areas entirely';
    const notice=document.querySelector('.notice');if(notice)notice.innerHTML='<b>Start with the complete catalogue.</b><br>Filters narrow the programme list and map together. Your permanent preferences influence fit scores, while only verified location exclusions remove a programme. Check working conditions with the employer.';
    const hero=document.querySelector('#foryou .sectionHero p');if(hero)hero.textContent='A starting point, not an automatic final ranking. Recommendations follow the region you are exploring and combine your priorities with programme data, showing both reasons to consider an option and trade-offs worth checking.';
    // The canonical public footer is owned by index.html; do not overwrite it.

    const regionEl=$('region');
    regionEl.addEventListener('change',()=>{if(regionEl.value){quick.delete('london');document.querySelector('[data-q="london"]')?.classList.remove('on');}pageLimit=40;persistFilters();refreshScope({locate:false});});
    document.querySelector('[data-q="london"]')?.addEventListener('click',()=>{if(quick.has('london'))regionEl.value='';setTimeout(()=>refreshScope({locate:true}),0);});
    $('allRegionsBtn')?.addEventListener('click',()=>{regionEl.value='';quick.delete('london');document.querySelector('[data-q="london"]')?.classList.remove('on');pageLimit=40;persistFilters();refreshScope({locate:false});});
    if($('locateBtn'))$('locateBtn').onclick=()=>resolveScopePins();
    $('resetBtn').onclick=()=>{$('decision').value='all';$('visa').value='';$('hideAvoid').checked=false;$('hideOuterLondon').checked=false;$('hideExcluded').checked=false;$('hideShortlisted').checked=false;$('hideJustice').checked=false;$('hideMental').checked=false;$('hideOtherSpecialist').checked=false;$('specialistView').value='all';$('search').value='';$('sector').value='';$('region').value='';$('hours').value='';$('salary').value='';$('sort').value='fit';pageLimit=40;quick=new Set();document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.remove('on'));persistFilters();refreshScope({locate:false});};

    ['salary','hours'].forEach(id=>$(id).addEventListener('change',reco));
    injectProductIntro();injectContextStrip();
    try{renderAll();setTimeout(()=>placementMap?.invalidateSize(),0);}catch{}
    // Fill the active scope automatically once data, map and grouped pins are ready.
    let autoLocateChecks=0;
    const autoLocateTimer=setInterval(()=>{
      autoLocateChecks++;
      if(placements.length&&placementMap&&window.__sectorPinsInstalled&&!geoBusy){
        clearInterval(autoLocateTimer);
        resolveScopePins();
      }else if(autoLocateChecks>80)clearInterval(autoLocateTimer);
    },250);
  };

  base.onerror=()=>{const r=document.getElementById('results');if(r)r.innerHTML='<div class="errorBox"><b>Could not load Placement Atlas.</b><br>Refresh the page. If this persists, open the legacy explorer from Preferences.</div>';};
  document.body.appendChild(base);
})();
