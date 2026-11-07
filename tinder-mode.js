'use strict';
/* Tinder Mode — one programme at a time; independent of Tinder and NHS/Oriel.
   Decisions use the existing Placement Desk statuses. The local progress record
   stores an undo history and is included in the account's cloud sync. */
(()=>{
  const KEY='oriel-tinder-mode-v1', $=id=>document.getElementById(id);
  const icon={
    flame:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.8 2.2c.8 3.1-.2 4.4-1.8 6.4-.4-1.5-1.4-2.9-3-4.1.3 2.5-.7 3.9-2.4 5.7C4.9 12 4.3 13.7 4.3 16A7.7 7.7 0 0 0 12 23.6 7.7 7.7 0 0 0 19.7 16c0-4.3-2.7-8.1-5.9-13.8Zm-1.8 18a4.4 4.4 0 0 1-4.4-4.4c0-1.5.8-2.8 2.1-4.1.3 1 .9 1.7 1.7 2.3 1.3-1.2 2-2.2 2-3.7 2 2.2 3 3.8 3 5.5a4.4 4.4 0 0 1-4.4 4.4Z"/></svg>',
    undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    no:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    yes:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 5.5a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.9a5.4 5.4 0 0 0 0-7.6Z"/></svg>',
    super:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 1.9 3.2 6.6 7.2 1.1-5.2 5.1 1.3 7.3L12 18.5 5.5 22l1.3-7.3-5.2-5.1 7.2-1.1L12 1.9Z"/></svg>'
  };
  const getData=()=>typeof placements!=='undefined'&&Array.isArray(placements)?placements:[];
  let game={version:1,seen:[],history:[],region:'London'};
  try{
    const v=JSON.parse(localStorage.getItem(KEY)||'null');
    if(v?.version===1){
      game.seen=Array.isArray(v.seen)?v.seen.filter(x=>typeof x==='string').slice(-5000):[];
      game.history=Array.isArray(v.history)?v.history.filter(x=>x&&typeof x.id==='string').slice(-150):[];
      game.region=typeof v.region==='string'?v.region:'London';
    }
  }catch{}
  const saveGame=()=>{try{localStorage.setItem(KEY,JSON.stringify(game))}catch{note('Local progress storage unavailable. Export a backup.')}};
  const note=msg=>{const el=$('tinderNotice');if(el)el.textContent=msg;};
  const prefs=()=>typeof state!=='undefined'&&state?.marks?state:null;
  const assessed=p=>{try{return analyse(p)}catch{return{score:50,good:[],bad:[],band:'Not yet assessed'}}};
  const blacklisted=p=>window.OrielGeoBlacklist?.shouldHide?.(p)||false;
  const regionList=()=>[...new Set(getData().map(p=>p.region).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  let poolSignature='',poolData=[];
  const selectedPool=()=>{
    const data=getData();
    const profile=typeof state!=='undefined'?state?.prefs||{}:{};
    const geo=profile.locationBlacklist||[];
    const signature=JSON.stringify([game.region,data.length,data[0]?.id,data[data.length-1]?.id,
      profile.weights,profile.likes,profile.locationAllowed,geo]);
    if(signature===poolSignature)return poolData;
    poolSignature=signature;
    poolData=data.filter(p=>(game.region==='all'||p.region===game.region)&&!blacklisted(p))
      .map(p=>({p,score:assessed(p).score}))
      .sort((a,b)=>b.score-a.score||(b.p.salary||0)-(a.p.salary||0)||a.p.id.localeCompare(b.p.id))
      .map(x=>x.p);
    return poolData;
  };
  const lookup=id=>getData().find(p=>p.id===id);
  let forced=null,animating=false,initialized=false, activeId='';
  const available=()=>selectedPool();
  const nextProgramme=()=>{
    if(forced){const p=lookup(forced);if(p&&!blacklisted(p))return p;forced=null;}
    const seen=new Set(game.seen);return available().find(p=>!seen.has(p.id))||null;
  };
  const code=p=>String(p.id||'').split('/').pop();
  const clean=s=>String(s||'').trim();
  const shorten=(s,n=100)=>{const t=clean(s);return t.length>n?t.slice(0,n-1)+'…':t};
  const week=(p,q)=>(p.settings||[]).filter(x=>String(x[0]).toLowerCase().includes(q)).reduce((n,x)=>n+Number(x[1]||0),0);
  const money=n=>n?'£'+Math.round(n).toLocaleString('en-GB'):'Not listed';
  const placeCache=new Map();
  const west=new Set(['Hounslow','Hillingdon','Ealing','Hammersmith and Fulham','Kensington and Chelsea','Harrow','Brent']);
  const east=new Set(['Newham','Tower Hamlets','Barking and Dagenham','Redbridge','Havering','Waltham Forest']);
  const north=new Set(['Barnet','Enfield','Haringey','Camden','Islington']);
  const south=new Set(['Croydon','Lambeth','Southwark','Greenwich','Lewisham','Merton','Sutton','Wandsworth','Bexley','Bromley']);
  const zone=d=>west.has(d)?'West London':east.has(d)?'East London':north.has(d)?'North London':south.has(d)?'South London':'London';
  const locTitle=(p,data,pc)=>{
    if(!data)return 'Postcode '+pc+' · '+(p.region||'UK');
    const d=data.admin_district||'',county=data.admin_county||data.region||p.region||'UK';
    if(data.region==='London')return d+' ('+zone(d)+')';
    return d+(county&&county!==d?' ('+county+')':'');
  };
  const resolvePlaces=async(p,id)=>{
    const el=$('tinderLocations');if(!el||!p)return;
    const pcs=[...new Set((p.postcodes||[]).filter(Boolean))].slice(0,6);
    if(!pcs.length){el.textContent='Training-site postcode not provided — verify before deciding';return;}
    el.textContent=pcs.map(pc=>'Postcode '+pc+' · '+p.region).join('  +  ');
    const results=await Promise.all(pcs.map(async pc=>{
      const key=String(pc).replace(/\s+/g,'').toUpperCase();
      if(placeCache.has(key))return [pc,placeCache.get(key)];
      try{
        const res=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(key),{signal:AbortSignal.timeout(8000)});
        if(!res.ok)throw Error('Could not load this postcode');
        const json=await res.json(),data=json.result||null;
        placeCache.set(key,data);return[pc,data];
      }catch{placeCache.set(key,null);return[pc,null];}
    }));
    if(activeId!==id||!el.isConnected)return;
    el.textContent=results.map(([pc,data])=>locTitle(p,data,pc)).join('  +  ')+(pcs.length>1?' · Split sites':'');
    el.title='Approximate locations resolved from Oriel training postcodes. Confirm sites with the employer.';
  };
  const checks=p=>{
    const good=[],bad=[],h=week(p,'hospital'),g=week(p,'general practice'),c=week(p,'community'),i=week(p,'industry');
    if(p.salary>=37000)good.push('Pay cheque looking pretty persuasive');
    else if(p.salary>=32000)good.push('Respectable pay for the placement year');
    else if(p.salary&&p.salary<28500)bad.push('Salary may need a second look');
    if(p.hours&&p.hours<=37.5)good.push('Hours look fairly civilised on paper');
    if(p.hours>=42)bad.push('Long week. Your evenings might notice.');
    if(h&&g)good.push('Hospital and GP rotations — options!');
    else if(h>=26)good.push('Proper hospital exposure on the CV');
    else if(g>=26)good.push('Lots of GP experience in the mix');
    if(i>=13)good.push('Industry exposure = interesting CV potential');
    if(c>=39)bad.push('Mostly community. Hope you enjoy the counter.');
    else if(c>=13)bad.push('Community rotation included');
    if((p.postcodes||[]).length>1)bad.push('Split sites: check the travel logistics');
    if(!p.salary)bad.push('Salary missing. Suspiciously mysterious.');
    if(!p.hours)bad.push('Hours not stated — worth checking');
    if(!p.postcodes?.length)bad.push('Training location not clear');
    const fit=assessed(p);
    if(!good.length)good.push(...fit.good.filter(Boolean).slice(0,2).map(s=>shorten(s,85)));
    if(!bad.length)bad.push(...fit.bad.filter(Boolean).slice(0,2).map(s=>shorten(s,85)));
    return {good:good.slice(0,3),bad:bad.slice(0,3)};
  };
  const build=(p)=>{
    const fit=assessed(p),list=checks(p);
    const card=document.createElement('article');card.className='tdSwipeCard';card.id='tinderActiveCard';card.tabIndex=0;
    card.setAttribute('aria-label','Programme '+p.title+'. Swipe right to like, left to reject; buttons below for other actions.');
    const top=document.createElement('div');top.className='tdCardTop';
    const tag=document.createElement('span');tag.className='tdCardCode';tag.textContent='PROGRAMME '+code(p);
    const score=document.createElement('span');score.className='tdFitScore';score.textContent='FIT '+fit.score+'/100';
    top.append(tag,score);
    const name=document.createElement('h3');name.className='tdProgrammeName';name.textContent=p.title||p.employer||'Untitled programme';
    const employer=document.createElement('p');employer.className='tdEmployer';employer.textContent=p.employer||'Employer not specified';
    const metrics=document.createElement('div');metrics.className='tdMetrics';
    for(const [label,value] of [['SALARY',money(p.salary)],['HOURS',p.hours?p.hours+' / week':'Not stated'],['PLACES',p.places||'—']]){
      const div=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;
      div.append(small,strong);metrics.append(div);
    }
    const sites=document.createElement('div');sites.className='tdSites';
    sites.innerHTML='<span class="tdSectionLabel">⌖ APPROXIMATE TRAINING LOCATIONS</span><div id="tinderLocations" class="tdLocationText">Looking up site locations…</div>';
    const rotations=document.createElement('div');rotations.className='tdRotations';
    for(const [label,n] of [['Hospital',week(p,'hospital')],['GP',week(p,'general practice')],['Community',week(p,'community')],['Industry',week(p,'industry')]])
      if(n){const span=document.createElement('span');span.textContent=label+' · '+n+'w';rotations.append(span)}
    if(!rotations.children.length){const unknown=document.createElement('span');unknown.textContent='Rotation settings not specified';rotations.append(unknown);}
    const pros=document.createElement('div');pros.className='tdVerdictColumns';
    for(const [cls,title,items] of [['pro','The green flags',list.good],['con','Read the room',list.bad]]){
      const block=document.createElement('div');block.className='tdVerdict '+cls;
      const h=document.createElement('h4');h.textContent=title;block.append(h);
      const ul=document.createElement('ul');
      if(items.length===0){const li=document.createElement('li');li.textContent=cls==='pro'?'Nothing obvious — investigate.':'No obvious red flags in the supplied fields.';ul.append(li);}
      else for(const s of items){const li=document.createElement('li');li.textContent=s;ul.append(li)}
      block.append(ul);pros.append(block);
    }
    const stamps=document.createElement('div');stamps.className='tdStamps';stamps.innerHTML='<span class="tdStamp tdStampNo">NOPE</span><span class="tdStamp tdStampYes">LIKE</span><span class="tdStamp tdStampSuper">SUPER LIKE</span>';
    card.append(top,name,employer,metrics,sites,rotations,pros,stamps);
    bindGesture(card,p);
    return card;
  };
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const commit=(p,status,vector)=>{
    if(animating)return;
    animating=true;
    const card=$('tinderActiveCard');
    const finish=()=>{
      const prev=prefs()?.marks?.[p.id] ? structuredClone(prefs().marks[p.id]):null;
      game.history.push({id:p.id,prev,at:Date.now(),action:status});
      if(game.history.length>150)game.history.shift();
      if(!game.seen.includes(p.id))game.seen.push(p.id);
      forced=null;
      if(typeof setMark==='function'){
        const patch={status};
        if(status==='no')patch.priority='';
        setMark(p,patch,false);
      }
      saveGame();
      animating=false;
      render();
      note(status==='love'?'Super liked. Excellent taste.':status==='yes'?'Liked. Keep the good ones coming.':'Passed. Next contestant.');
    };
    if(!card||reduced()){finish();return;}
    card.classList.add('tdLeaving');
    card.style.transition='transform .25s cubic-bezier(.3,.8,.2,1),opacity .25s ease';
    card.style.transform='translate3d('+(vector===0?0:vector*window.innerWidth)+'px,'+(status==='love'?-window.innerHeight*.65:'-18px')+',0) rotate('+(vector*16)+'deg)';
    card.style.opacity='0';
    const stamp=card.querySelector(status==='no'?'.tdStampNo':status==='yes'?'.tdStampYes':'.tdStampSuper');
    stamp?.classList.add('tdStampShow');
    setTimeout(finish,255);
  };
  const undo=()=>{
    if(animating)return;
    const last=game.history.pop();
    if(!last){note('Nothing to undo yet.');return;}
    const s=prefs();if(s){if(last.prev)s.marks[last.id]=last.prev;else delete s.marks[last.id];save();}
    game.seen=game.seen.filter(x=>x!==last.id);
    forced=last.id;saveGame();render();
    note('Undone. Programme restored with its previous decision.');
  };
  function bindGesture(card,p){
    let startX=0,startY=0,deltaX=0,tracking=false;
    card.addEventListener('pointerdown',e=>{
      if(animating||e.button!==0||e.target.closest('button, a, input, select, textarea'))return;
      startX=e.clientX;startY=e.clientY;deltaX=0;tracking=true;
      try{card.setPointerCapture(e.pointerId)}catch{}
      card.style.transition='none';
    });
    card.addEventListener('pointermove',e=>{
      if(!tracking)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>14)return;
      deltaX=dx;
      card.style.transform='translate3d('+dx+'px,'+Math.min(Math.abs(dx)*.07,12)+'px,0) rotate('+(dx/23)+'deg)';
      const no=card.querySelector('.tdStampNo'),yes=card.querySelector('.tdStampYes');
      no?.classList.toggle('tdStampShow',dx< -50);
      yes?.classList.toggle('tdStampShow',dx>50);
    });
    const release=()=>{
      if(!tracking)return;
      tracking=false;
      if(deltaX>85){commit(p,'yes',1);return;}
      if(deltaX< -85){commit(p,'no',-1);return;}
      card.style.transition='transform .28s cubic-bezier(.22,1,.36,1)';
      card.style.transform='';
      card.querySelectorAll('.tdStamp').forEach(x=>x.classList.remove('tdStampShow'));
    };
    card.addEventListener('pointerup',release);
    card.addEventListener('pointercancel',release);
    card.addEventListener('lostpointercapture',()=>{if(tracking)release()});
  }
  const button=(kind,caption,fn)=>{
    const b=document.createElement('button');b.type='button';b.className='tdAction tdAction-'+kind;b.title=caption;b.setAttribute('aria-label',caption);
    b.innerHTML=icon[kind];b.addEventListener('click',fn);return b;
  };
  const render=()=>{
    if(!initialized)return;
    const pool=available(),ids=new Set(pool.map(p=>p.id));
    const seen=game.seen.filter(id=>ids.has(id)).length;
    const count=$('tinderProgress');if(count)count.textContent=seen.toLocaleString('en-GB')+' / '+pool.length.toLocaleString('en-GB')+' reviewed';
    const remaining=$('tinderRemaining');if(remaining)remaining.textContent=(pool.length-seen)+' remaining in this region';
    const cardSlot=$('tinderCardSlot');if(!cardSlot)return;
    cardSlot.replaceChildren();
    const p=nextProgramme();activeId=p?.id||'';
    if(!p){
      const done=document.createElement('div');done.className='tdFinished';
      done.innerHTML='<span aria-hidden="true">♡</span><h3>That’s everyone in this round.</h3><p>You’ve reviewed every available programme in this region. Switch regions to continue, or undo your last decision.</p>';
      cardSlot.append(done);
    }else{
      const card=build(p);cardSlot.append(card);
      const existing=prefs()?.marks?.[p.id]?.status||'';
      const status=$('tinderExisting');status.textContent=existing?'Current decision: '+({love:'Love',yes:'Strong yes',maybe:'Maybe',backup:'Only if needed',no:'No',never:'Absolutely not'}[existing]||'Unmarked'):'Not yet decided';
      void resolvePlaces(p,p.id);
    }
    $('tinderUndo').disabled=!game.history.length||animating;
    for(const id of ['tinderNo','tinderYes','tinderSuper'])$(id).disabled=!p||animating;
    if(!p)$('tinderExisting').textContent='Round complete';
  };
  const mount=()=>{
    if($('tinderMode'))return;
    const nav=document.querySelector('nav.tabs'),sim=nav?.querySelector('[data-tab="simulator"]');
    if(!sim)return;
    const tab=document.createElement('button');tab.className='tab tdNavTab';tab.type='button';tab.dataset.tab='tinderMode';
    tab.innerHTML='<span class="tdNavFlame">'+icon.flame+'</span><span>Tinder Mode</span>';
    sim.after(tab);
    tab.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('tinderMode');render()});
    const section=document.createElement('section');section.id='tinderMode';section.className='panel tdMode';
    section.innerHTML='<header class="tdModeIntro"><div class="tdModeEyebrow">PLACEMENT ATLAS · SPEED-DATING THE CATALOGUE</div><h2>Meet your next placement.</h2><p>One programme. One decision. No endless spreadsheets. Swipe left to pass or right to like — and keep the super likes for the ones you really want.</p><small>Independent game-style shortlist tool; not affiliated with Tinder, Oriel or the NHS. Swipes update your Placement Desk decisions, never your official Oriel application.</small></header>'+
     '<div class="tdSettings"><label>Location <select id="tinderRegion" aria-label="Choose region for programme swiping"></select></label><div class="tdRoundStats"><strong id="tinderProgress">0 / 0 reviewed</strong><span id="tinderRemaining">Loading programmes…</span></div></div>'+
     '<div class="tdBoard"><div class="tdCardDeck"><div id="tinderCardSlot" class="tdCardSlot" aria-live="polite"></div></div>'+
     '<div class="tdActions"><button id="tinderUndo" class="tdAction tdAction-undo" title="Undo last swipe" aria-label="Undo last swipe">'+icon.undo+'</button><button id="tinderNo" class="tdAction tdAction-no" title="Reject" aria-label="Reject programme">'+icon.no+'</button><button id="tinderYes" class="tdAction tdAction-yes" title="Like" aria-label="Like programme">'+icon.yes+'</button><button id="tinderSuper" class="tdAction tdAction-super" title="Super Like" aria-label="Super Like programme">'+icon.super+'</button></div>'+
     '<div class="tdActionLegend"><span>Undo</span><span>Pass</span><span>Like</span><span>Super Like</span></div>'+
     '<p class="tdExisting" id="tinderExisting">Not yet decided</p><p class="tdNotice" id="tinderNotice" role="status" aria-live="polite">Tip: ← Pass · → Like · ↑ Super Like · Backspace Undo</p>'+
     '<p class="tdDisclosure">Rotation weeks, salary and hours come from the Oriel CSV. Training areas are postcode-based approximations. Cheeky pros and cons are suggestions, not verified employer promises.</p></div>';
    $('simulator')?.after(section);
    const region=$('tinderRegion');if(region){
      const all=document.createElement('option');all.value='all';all.textContent='All regions — England & Wales';region.append(all);
      for(const r of regionList()){const option=document.createElement('option');option.value=r;option.textContent=r;region.append(option)}
      if(![...region.options].some(x=>x.value===game.region))game.region='London';
      region.value=game.region;
      region.addEventListener('change',()=>{game.region=region.value;forced=null;saveGame();render()});
    }
    $('tinderUndo').onclick=undo;
    $('tinderNo').onclick=()=>{const p=nextProgramme();if(p)commit(p,'no',-1)};
    $('tinderYes').onclick=()=>{const p=nextProgramme();if(p)commit(p,'yes',1)};
    $('tinderSuper').onclick=()=>{const p=nextProgramme();if(p)commit(p,'love',0)};
    document.addEventListener('keydown',e=>{
      if(!$('#tinderMode')?.classList.contains('active')||e.altKey||e.metaKey||e.ctrlKey)return;
      if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
      const p=nextProgramme();
      if(e.key==='ArrowLeft'&&p){e.preventDefault();commit(p,'no',-1)}
      else if(e.key==='ArrowRight'&&p){e.preventDefault();commit(p,'yes',1)}
      else if(e.key==='ArrowUp'&&p){e.preventDefault();commit(p,'love',0)}
      else if(e.key==='Backspace'){e.preventDefault();undo()}
    });
    initialized=true;saveGame();render();
  };
  let attempts=0;
  const boot=()=>{
    if(!getData().length||!document.querySelector('nav.tabs [data-tab="simulator"]')){
      if(++attempts<90)setTimeout(boot,180);
      return;
    }
    mount();
  };
  boot();
  document.addEventListener('desk:dataset',()=>{if(!initialized)return;const select=$('tinderRegion');if(select){for(const r of regionList())if(![...select.options].some(x=>x.value===r)){const o=document.createElement('option');o.value=r;o.textContent=r;select.append(o)}}render()});
  document.addEventListener('desk:geo-blacklist-changed',()=>{if(initialized)render()});
})();