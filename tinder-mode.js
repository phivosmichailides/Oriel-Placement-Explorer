'use strict';
/* Tinder Mode — one programme at a time; independent of Tinder and NHS/Oriel.
   Decisions use the existing Placement Desk statuses. The local progress record
   stores an undo history and is included in the account's cloud sync. */
(()=>{
  const KEY='oriel-tinder-mode-v1', HINT_KEY='oriel-tinder-swipe-hints-seen-v1', $=id=>document.getElementById(id);
  const icon={
    flame:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.8 2.2c.8 3.1-.2 4.4-1.8 6.4-.4-1.5-1.4-2.9-3-4.1.3 2.5-.7 3.9-2.4 5.7C4.9 12 4.3 13.7 4.3 16A7.7 7.7 0 0 0 12 23.6 7.7 7.7 0 0 0 19.7 16c0-4.3-2.7-8.1-5.9-13.8Zm-1.8 18a4.4 4.4 0 0 1-4.4-4.4c0-1.5.8-2.8 2.1-4.1.3 1 .9 1.7 1.7 2.3 1.3-1.2 2-2.2 2-3.7 2 2.2 3 3.8 3 5.5a4.4 4.4 0 0 1-4.4 4.4Z"/></svg>',
    undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    no:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    yes:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 5.5a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.9a5.4 5.4 0 0 0 0-7.6Z"/></svg>',
    super:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 1.9 3.2 6.6 7.2 1.1-5.2 5.1 1.3 7.3L12 18.5 5.5 22l1.3-7.3-5.2-5.1 7.2-1.1L12 1.9Z"/></svg>'
  };
  const getData=()=>typeof placements!=='undefined'&&Array.isArray(placements)?placements:[];
  const defaultFilters=()=>({setting:'all',minSalary:'',maxHours:'',splitOnly:false,hideDecided:false});
  let game={version:1,seen:[],history:[],region:'London',filters:defaultFilters()};
  const hydrateGame=()=>{
    // Run again after the cloud workspace has restored, not just on script
    // evaluation, otherwise old local progress could overwrite cloud data.
    try{
      const v=JSON.parse(localStorage.getItem(KEY)||'null');
      if(v?.version===1){
        game.seen=Array.isArray(v.seen)?v.seen.filter(x=>typeof x==='string').slice(-5000):[];
        game.history=Array.isArray(v.history)?v.history.filter(x=>x&&typeof x.id==='string').slice(-150):[];
        game.region=typeof v.region==='string'?v.region:'London';
        const saved=v.filters&&typeof v.filters==='object'&&!Array.isArray(v.filters)?v.filters:{};
        game.filters={...defaultFilters(),
          setting:['all','hospital','gp','community','industry','mixed'].includes(saved.setting)?saved.setting:'all',
          minSalary:['','26000','28000','30000','32000','36000'].includes(String(saved.minSalary??''))?String(saved.minSalary??''):'',
          maxHours:['','35','37.5','40','42.5'].includes(String(saved.maxHours??''))?String(saved.maxHours??''):'',
          splitOnly: saved.splitOnly===true,
          hideDecided:saved.hideDecided===true};
      }
    }catch{}
  };
  hydrateGame();
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
      profile.weights,profile.likes,profile.locationAllowed,geo,game.filters]);
    if(signature===poolSignature)return poolData;
    poolSignature=signature;
    const ff=game.filters;
    poolData=data.filter(p=>{
      if((game.region!=='all'&&p.region!==game.region)||blacklisted(p))return false;
      if(ff.minSalary&&Number(p.salary||0)<Number(ff.minSalary))return false;
      if(ff.maxHours&&(!p.hours||Number(p.hours)>Number(ff.maxHours)))return false;
      if(ff.splitOnly&&(p.settings||[]).length<2)return false;
      if(ff.hideDecided&&prefs()?.marks?.[p.id]?.status)return false;
      if(ff.setting!=='all'){
        const kind=typeof sector==='function'?sector(p):'';
        const str=String(kind).toLowerCase();
        if(ff.setting==='mixed'&&(p.settings||[]).length<2)return false;
        if(ff.setting==='hospital'&&!str.includes('hospital'))return false;
        if(ff.setting==='gp'&&!str.includes('general practice')&&!str.includes('gp'))return false;
        if(ff.setting==='community'&&!str.includes('community'))return false;
        if(ff.setting==='industry'&&!str.includes('industry'))return false;
      }
      return true;
    }).map(p=>({p,score:assessed(p).score}))
      .sort((a,b)=>b.score-a.score||(b.p.salary||0)-(a.p.salary||0)||a.p.id.localeCompare(b.p.id))
      .map(x=>x.p);
    return poolData;
  };
  const lookup=id=>getData().find(p=>p.id===id);
  let forced=null,animating=false,initialized=false,activeId='',returningId='';
  let drawerMode=null,drawerOpener=null;
  const dismissHints=()=>{
    try{localStorage.setItem(HINT_KEY,'1')}catch{}
    const tips=$('tinderSwipeHints');
    if(tips)tips.hidden=true;
  };
  const refreshHints=()=>{
    const tips=$('tinderSwipeHints');
    if(!tips)return;
    let completed=false;try{completed=localStorage.getItem(HINT_KEY)==='1'}catch{}
    tips.hidden=completed||game.seen.length>0;
  };
  const available=()=>selectedPool();
  const nextProgramme=()=>{
    if(forced){const p=lookup(forced);if(p&&!blacklisted(p)&&available().some(x=>x.id===p.id))return p;forced=null;}
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
  const resolvePlaces=async(p,id,target=null)=>{
    // The next programme also has its own real, pre-rendered location text.
    // Never let an old asynchronous postcode response update a newer card.
    const el=target||$('tinderLocations');if(!el||!p)return;
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
    if(!el.isConnected||(!target&&activeId!==id))return;
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
  const build=(p,underlay=false)=>{
    const fit=assessed(p),list=checks(p);
    const card=document.createElement('article');
    card.className='tdSwipeCard'+(underlay?' tdNextCard':'');
    if(underlay){
      // Fully rendered, non-interactive programme underneath the active card.
      // The preview has no duplicate IDs or swipe handlers.
      card.setAttribute('aria-hidden','true');
      card.inert=true;
    }else{
      card.id='tinderActiveCard';card.tabIndex=0;
      card.setAttribute('aria-label','Programme '+p.title+'. Swipe right to like, left to reject; buttons below for other actions.');
    }
    const top=document.createElement('div');top.className='tdCardTop';
    const tag=document.createElement('span');tag.className='tdCardCode';tag.textContent='PROGRAMME '+code(p);
    const score=document.createElement('span');score.className='tdFitScore';score.textContent=typeof state!=='undefined'&&state.prefs?.onboarding?'FIT '+fit.score+'/100':'FIT · TAKE QUIZ';
    if(!(typeof state!=='undefined'&&state.prefs?.onboarding)){
      score.classList.add('tdFitUnpersonalised');
      if(!underlay){
        score.title='Take the personalisation quiz for a meaningful fit estimate';
        score.setAttribute('role','button');score.tabIndex=0;
        const open=()=>window.openOrielPersonalisation?.();
        score.addEventListener('click',open);
        score.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
      }
    }
    top.append(tag,score);
    const name=document.createElement('h3');name.className='tdProgrammeName';name.textContent=p.title||p.employer||'Untitled programme';
    const employer=document.createElement('p');employer.className='tdEmployer';employer.textContent=p.employer||'Employer not specified';
    const metrics=document.createElement('div');metrics.className='tdMetrics';
    for(const [label,value] of [['SALARY',money(p.salary)],['HOURS',p.hours?p.hours+' / week':'Not stated'],['PLACES',p.places||'—']]){
      const div=document.createElement('div');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;
      div.append(small,strong);metrics.append(div);
    }
    const sites=document.createElement('div');sites.className='tdSites';
    sites.innerHTML='<span class="tdSectionLabel">⌖ APPROXIMATE TRAINING LOCATIONS</span><div '+(underlay?'':'id="tinderLocations" ')+'class="tdLocationText">Looking up site locations…</div>';
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
    if(!underlay)bindGesture(card,p);
    return card;
  };
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const EXIT_MS=560;
  // Small directional sparkle bursts: no full-deck gradient or blurred frame.
  const shine=(status)=>{
    const deck=document.querySelector('#tinderMode .tdCardDeck');
    if(!deck)return ()=>{};
    deck.classList.remove('tdShineYes','tdShineNo','tdShineSuper');
    deck.querySelector('.tdFeedbackParticles')?.remove();
    const kind=status==='no'?'No':status==='yes'?'Yes':'Super';
    deck.classList.add('tdShine'+kind);
    const layer=document.createElement('div');
    layer.className='tdFeedbackParticles tdDirectionalParticles';
    layer.setAttribute('aria-hidden','true');
    const left=[[6,20,-55,-50],[13,35,-70,-9],[8,54,-65,26],[15,73,-40,60],[23,88,-38,42]];
    const right=[[82,16,44,-55],[92,31,65,-22],[89,52,73,10],[82,71,52,55],[76,88,28,60]];
    const upper=[[22,8,-58,-55],[39,11,-22,-80],[55,5,16,-76],[70,10,43,-62],[86,18,65,-45]];
    const spots=kind==='No'?left:kind==='Yes'?right:upper;
    for(const [x,y,dx,dy] of spots){
      const spark=document.createElement('span');
      spark.className='tdSparkle';
      spark.textContent='✦';
      spark.style.left=x+'%';spark.style.top=y+'%';
      spark.style.setProperty('--spark-x',dx+'px');
      spark.style.setProperty('--spark-y',dy+'px');
      layer.append(spark);
    }
    deck.append(layer);
    return ()=>{
      deck.classList.remove('tdShineYes','tdShineNo','tdShineSuper');
      layer.remove();
    };
  };
  // A few coloured stars follow the outgoing physical card, echoing the
  // familiar gold Undo return without ever covering the card underneath.
  const exitTwinkles=(card,status)=>{
    if(!card||reduced())return ()=>{};
    const layer=document.createElement('span');
    layer.className='tdExitTwinkles tdExitTwinkles-'+(status==='no'?'No':status==='yes'?'Yes':'Super');
    layer.setAttribute('aria-hidden','true');
    const points=[[12,14,-28,-36],[78,10,35,-42],[93,33,53,-9],[82,70,35,38],[52,89,0,53],[10,75,-43,37],[5,42,-54,-8]];
    for(let i=0;i<points.length;i++){
      const [x,y,dx,dy]=points[i];
      const star=document.createElement('i');
      star.textContent='✦';
      star.style.left=x+'%';star.style.top=y+'%';
      star.style.setProperty('--td-star-x',dx+'px');
      star.style.setProperty('--td-star-y',dy+'px');
      star.style.animationDelay=(i%3*35)+'ms';
      layer.append(star);
    }
    card.append(layer);
    return ()=>layer.remove();
  };
  const commit=(p,status,vector)=>{
    if(animating)return;
    animating=true;
    dismissHints();
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
      note(status==='love'?'Super liked. Excellent taste.':status==='yes'?'Liked. Keep the good ones coming.':'Like No. Next contestant.');
    };
    if(!card||reduced()){finish();return;}
    // The next real programme is already in the deck. Reveal it while the
    // current card flies off, never a blurred empty gradient.
    $('tinderCardSlot')?.classList.add('tdShowingNext');
    const clearShine=shine(status);
    const clearStars=exitTwinkles(card,status);
    card.classList.add('tdLeaving','tdLeaving'+(status==='no'?'No':status==='yes'?'Yes':'Super'));
    const distance=Math.max(680,window.innerWidth*.7);
    const slide=vector*distance;
    const lift=status==='love'?-Math.max(460,window.innerHeight*.65):-30;
    const departure=()=>{
      // Keep the physical card opaque and crisp until it leaves the screen.
      // Its movement uncovers the next card rather than exposing a blank deck.
      card.style.transition='transform '+EXIT_MS+'ms cubic-bezier(.25,.72,.22,1)';
      card.style.transform='translate3d('+slide+'px,'+lift+'px,0) rotate('+(vector*14)+'deg)';
      const stamp=card.querySelector(status==='no'?'.tdStampNo':status==='yes'?'.tdStampYes':'.tdStampSuper');
      stamp?.classList.add('tdStampShow');
    };
    // Start the transition from the card's last drag position, avoiding a jump.
    requestAnimationFrame(departure);
    setTimeout(()=>{clearShine();clearStars();finish();},EXIT_MS+35);
  };
  const undo=()=>{
    if(animating)return;
    const last=game.history.pop();
    if(!last){note('Nothing to undo yet.');return;}
    const s=prefs();if(s){if(last.prev)s.marks[last.id]=last.prev;else delete s.marks[last.id];save();}
    document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'tinder_undo'}}));
    game.seen=game.seen.filter(x=>x!==last.id);
    forced=last.id;
    returningId=last.id;
    const animateReturn=!reduced();
    animating=animateReturn;
    saveGame();
    render();
    note('Undone. Programme restored with its previous decision.');
    if(animateReturn){
      // Lock decisions only while the same card descends; animation is purely
      // decorative and never replays/changes the saved decision.
      setTimeout(()=>{
        animating=false;
        $('tinderCardSlot')?.classList.remove('tdUndoGlowing');
        const current=nextProgramme();
        $('tinderUndo').disabled=!game.history.length;
        for(const id of ['tinderNo','tinderYes','tinderSuper'])$(id).disabled=!current;
      },860);
    }
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
      card.classList.toggle('tdDragNo',dx< -18);
      card.classList.toggle('tdDragYes',dx>18);
      card.style.setProperty('--td-drag-strength',String(Math.min(1,Math.abs(dx)/130)));
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
      card.classList.remove('tdDragNo','tdDragYes');
      card.style.removeProperty('--td-drag-strength');
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

  // Tinder-only drawers use the shared canonical marks, never a second
  // shortlist/rejection store. They include every region, not only the round.
  const savedLists=()=>{
    const all=getData(),marks=prefs()?.marks||{};
    const liked=all.filter(p=>['love','yes','maybe','backup'].includes(marks[p.id]?.status));
    const rejected=all.filter(p=>['no','never'].includes(marks[p.id]?.status));
    const order=typeof ranked==='function'?ranked().map(p=>p.id):[];
    const positions=new Map(order.map((id,i)=>[id,i]));
    liked.sort((a,b)=>(positions.get(a.id)??999999)-(positions.get(b.id)??999999)||
      assessed(b).score-assessed(a).score||a.title.localeCompare(b.title));
    rejected.sort((a,b)=>assessed(b).score-assessed(a).score||a.title.localeCompare(b.title));
    return {liked,rejected};
  };
  const refreshDrawerCounts=()=>{
    const lists=savedLists();
    const heart=$('tdShortlistedCount'),cross=$('tdRejectedCount');
    if(heart)heart.textContent='('+lists.liked.length+')';
    if(cross)cross.textContent='('+lists.rejected.length+')';
  };
  const closeDecisionDrawer=()=>{
    const drawer=$('tdDecisionDrawer'),shade=$('tdDecisionShade');
    if(!drawer||!shade||drawerMode===null)return;
    drawerMode=null;
    drawer.hidden=true;drawer.inert=true;drawer.setAttribute('aria-hidden','true');
    shade.hidden=true;delete document.body.dataset.tdDrawerActive;
    $('tdDrawerSearch').value='';
    drawerOpener?.focus?.();drawerOpener=null;
  };
  const renderDecisionDrawer=()=>{
    const list=$('tdDrawerItems'),header=$('tdDrawerHeading'),subtitle=$('tdDrawerSubtitle');
    if(!list||drawerMode===null)return;
    const {liked,rejected}=savedLists();
    const inLiked=drawerMode==='liked',all=inLiked?liked:rejected;
    const search=$('tdDrawerSearch')?.value.toLowerCase().trim()||'';
    const matches=all.filter(p=>[p.title,p.employer,p.id,p.region,...(p.postcodes||[])]
      .join(' ').toLowerCase().includes(search));
    header.textContent=inLiked?'Shortlisted programmes':'Like No · Rejected';
    subtitle.textContent=all.length+' saved '+(inLiked?'to your shortlist':'as Like No')+
      ' · Tap a programme title for full details and your personalised fit.';
    $('tdDrawerSearch').placeholder=inLiked?'Search shortlisted programmes':'Search rejected programmes';
    list.replaceChildren();
    if(!matches.length){
      const empty=document.createElement('p');
      empty.className='tdDrawerEmpty';
      empty.textContent=search?'No matching programmes.':
        inLiked?'Your shortlist is empty. Like a programme to see it here.':
          'No rejected programmes yet. Swipe a card left to add one.';
      list.append(empty);return;
    }
    const rows=document.createDocumentFragment();
    matches.forEach((p,i)=>{
      const row=document.createElement('article');row.className='tdDrawerItem';
      row.dataset.programmeId=p.id;
      const details=document.createElement('details');details.className='tdDrawerDetails';
      const summary=document.createElement('summary');summary.className='tdDrawerSummary';
      const text=document.createElement('span');text.className='tdDrawerSummaryText';
      const title=document.createElement('strong');title.className='tdDrawerProgrammeTitle';
      title.textContent=p.title||p.employer||'Unnamed programme';
      const sub=document.createElement('span');sub.className='tdDrawerProgrammeSub';
      sub.textContent=(p.region||'Region not listed')+' · '+money(p.salary)+
        (p.hours?' · '+p.hours+'h/week':'');
      text.append(title,sub);
      const score=document.createElement('span');score.className='tdDrawerFit';
      const fit=assessed(p);
      score.textContent='Fit '+fit.score+'/100';
      const chevron=document.createElement('span');chevron.className='tdDrawerChevron';
      chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');
      summary.append(text,score,chevron);
      const previewSlot=document.createElement('div');previewSlot.className='tdDrawerPreview';
      details.append(summary,previewSlot);
      const populatePreview=()=>{
        if(previewSlot.childElementCount)return;
        const preview=build(p,true);
        preview.classList.remove('tdNextCard');
        preview.classList.add('tdDrawerCard');
        preview.removeAttribute('aria-hidden');preview.inert=false;
        previewSlot.append(preview);
        void resolvePlaces(p,p.id,preview.querySelector('.tdLocationText'));
      };
      // Populate before the opening animation, not after the delayed toggle.
      summary.addEventListener('click',()=>{if(!details.open)populatePreview()});
      details.addEventListener('toggle',()=>{if(details.open)populatePreview()});
      const action=document.createElement('button');
      action.type='button';action.className='tdDrawerMove';
      action.setAttribute('aria-label',inLiked?
        'Like No — remove '+(p.title||p.employer)+' from shortlist':
        'Take '+(p.title||p.employer)+' to shortlist');
      action.innerHTML=inLiked?
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6 18 18M18 6 6 18"/></svg><span>Like No</span>':
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.8 5.5a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.9a5.4 5.4 0 0 0 0-7.6Z"/></svg><span>Take to shortlist</span>';
      action.addEventListener('click',()=>{
        if(animating)return;
        const status=inLiked?'no':'yes';
        const old=prefs()?.marks?.[p.id]?structuredClone(prefs().marks[p.id]):null;
        if(game.history.length>=150)game.history.shift();
        game.history.push({id:p.id,prev:old,at:Date.now(),action:status});
        if(!game.seen.includes(p.id))game.seen.push(p.id);
        if(forced===p.id)forced=null;
        if(typeof setMark==='function')setMark(p,{status,priority:''},false);
        saveGame();
        render();
        renderDecisionDrawer();
        note(inLiked?'Moved to rejected programmes.':'Moved to your shortlist.');
        $('tdDrawerSearch')?.focus();
      });
      row.append(details,action);rows.append(row);
    });
    list.append(rows);
  };
  const openDecisionDrawer=(mode,opener)=>{
    if(!['liked','rejected'].includes(mode))return;
    if($('uxDrawer')?.classList.contains('uxOpen'))$('uxDrawerClose')?.click();
    drawerOpener=opener||document.activeElement;
    drawerMode=mode;
    const drawer=$('tdDecisionDrawer'),shade=$('tdDecisionShade');
    drawer.hidden=false;drawer.inert=false;drawer.setAttribute('aria-hidden','false');
    shade.hidden=false;document.body.dataset.tdDrawerActive='true';
    renderDecisionDrawer();
    $('tdDrawerClose')?.focus();
  };
  const mountDecisionDrawers=()=>{
    if($('tdFloatingDecisions'))return;
    const float=document.createElement('div');
    float.className='tdFloatingDecisions';float.id='tdFloatingDecisions';
    float.setAttribute('aria-label','Tinder Mode saved decisions');
    float.innerHTML='<button type="button" class="tdLauncher tdLauncherRejected" id="tdOpenRejected" aria-label="View rejected programmes">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg>'+
      '<span id="tdRejectedCount">(0)</span></button>'+
      '<button type="button" class="tdLauncher tdLauncherLiked" id="tdOpenLiked" aria-label="View shortlisted programmes">'+
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 5.5a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.9a5.4 5.4 0 0 0 0-7.6Z"/></svg>'+
      '<span id="tdShortlistedCount">(0)</span></button>';
    const shade=document.createElement('div');
    shade.id='tdDecisionShade';shade.className='tdDecisionShade';shade.hidden=true;
    const drawer=document.createElement('aside');
    drawer.id='tdDecisionDrawer';drawer.className='tdDecisionDrawer';
    drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');
    drawer.setAttribute('aria-hidden','true');drawer.setAttribute('aria-labelledby','tdDrawerHeading');
    drawer.hidden=true;drawer.inert=true;
    drawer.innerHTML='<div class="tdDrawerHeader"><div>'+
      '<div class="tdDrawerEyebrow">PLACEMENT ATLAS · TINDER MODE</div>'+
      '<h2 id="tdDrawerHeading">Saved programmes</h2>'+
      '<p id="tdDrawerSubtitle"></p></div>'+
      '<button type="button" id="tdDrawerClose" class="tdDrawerClose" aria-label="Close saved programmes">×</button></div>'+
      '<label class="tdDrawerSearchLabel" for="tdDrawerSearch">Find a programme</label>'+
      '<input type="search" id="tdDrawerSearch" placeholder="Search programmes" autocomplete="off">'+
      '<div class="tdDrawerItems" id="tdDrawerItems"></div>';
    document.body.append(float,shade,drawer);
    $('tdOpenRejected').addEventListener('click',e=>openDecisionDrawer('rejected',e.currentTarget));
    $('tdOpenLiked').addEventListener('click',e=>openDecisionDrawer('liked',e.currentTarget));
    $('tdDrawerClose').addEventListener('click',closeDecisionDrawer);
    shade.addEventListener('click',closeDecisionDrawer);
    $('tdDrawerSearch').addEventListener('input',renderDecisionDrawer);
    document.addEventListener('keydown',e=>{
      if(drawerMode===null)return;
      if(e.key==='Escape'){e.preventDefault();closeDecisionDrawer();return;}
      if(e.key!=='Tab')return;
      const focus=[...drawer.querySelectorAll('button:not([disabled]),input:not([disabled]),summary')]
        .filter(el=>el.getClientRects().length>0);
      if(!focus.length)return;
      const first=focus[0],last=focus[focus.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    document.addEventListener('desk:state-saved',()=>{
      refreshDrawerCounts();
      if(drawerMode!==null)renderDecisionDrawer();
    });
    document.addEventListener('desk:after-navigation',()=>{
      if(drawerMode!==null&&!$('tinderMode')?.classList.contains('active'))closeDecisionDrawer();
    });
    refreshDrawerCounts();
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
      // Render an actual second card *before* the active one. It stays visible
      // during a drag and exit animation, so there is no intermediate blank
      // frame or placeholder. The last card reveals the completion message.
      const seenIds=new Set(game.seen);
      const following=pool.find(candidate=>candidate.id!==p.id&&!seenIds.has(candidate.id))||null;
      if(following){
        const below=build(following,true);
        cardSlot.append(below);
        void resolvePlaces(following,following.id,below.querySelector('.tdLocationText'));
      }else{
        const done=document.createElement('div');
        done.className='tdFinished tdNextFinished';
        done.setAttribute('aria-hidden','true');
        done.innerHTML='<span aria-hidden="true">♡</span><h3>Round complete</h3><p>You’ve seen every programme in this round.</p>';
        cardSlot.append(done);
      }
      const card=build(p);
      if(p.id===returningId){
        returningId='';
        if(!reduced()){
          card.classList.add('tdUndoReturning');
          cardSlot.classList.add('tdUndoGlowing');
          const sparks=document.createElement('span');
          sparks.className='tdUndoTwinkles';
          sparks.setAttribute('aria-hidden','true');
          [[12,17,-20],[82,12,35],[73,42,70],[23,65,-40],[51,81,55],[90,75,20]].forEach(([x,y,angle],i)=>{
            const spark=document.createElement('i');
            spark.textContent='✦';
            spark.style.left=x+'%';
            spark.style.top=y+'%';
            spark.style.setProperty('--twist',angle+'deg');
            spark.style.animationDelay=(170+i*55)+'ms';
            sparks.append(spark);
          });
          card.append(sparks);
        }
      }
      cardSlot.append(card);
      const existing=prefs()?.marks?.[p.id]?.status||'';
      const status=$('tinderExisting');status.textContent=existing?'Current decision: '+({love:'Love',yes:'Strong yes',maybe:'Maybe',backup:'Only if needed',no:'No',never:'Absolutely not'}[existing]||'Unmarked'):'Not yet decided';
      void resolvePlaces(p,p.id);
    }
    refreshHints();
    refreshDrawerCounts();
    $('tinderUndo').disabled=!game.history.length||animating;
    for(const id of ['tinderNo','tinderYes','tinderSuper'])$(id).disabled=!p||animating;
    if(!p)$('tinderExisting').textContent='Round complete';
  };
  const mount=()=>{
    if($('tinderMode'))return;
    hydrateGame();
    const nav=document.querySelector('nav.tabs'),sim=nav?.querySelector('[data-tab="simulator"]');
    if(!sim)return;
    const tab=document.createElement('button');tab.className='tab tdNavTab';tab.type='button';tab.dataset.tab='tinderMode';
    tab.innerHTML='<span class="tdNavFlame">'+icon.flame+'</span><span>Tinder Mode</span>';
    sim.after(tab);
    tab.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('tinderMode');render()});
    const section=document.createElement('section');section.id='tinderMode';section.className='panel tdMode';
    section.innerHTML='<header class="tdModeIntro"><div class="tdModeEyebrow">PLACEMENT ATLAS · SPEED-DATING THE CATALOGUE</div><h2>Meet your next placement.</h2><p>One programme. One decision. No endless spreadsheets. Swipe left for Like No or right to like — and keep the super likes for the ones you really want.</p><small>Independent game-style shortlist tool; not affiliated with Tinder, Oriel or the NHS. Swipes update your Placement Desk decisions, never your official Oriel application.</small></header>'+
     '<div class="tdSettings"><label>Location <select id="tinderRegion" aria-label="Choose region for programme swiping"></select></label>'+
     '<button type="button" id="tinderFilterToggle" class="tdFilterToggle" aria-expanded="false" aria-controls="tinderFilterPanel"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/></svg><span>Refine cards</span></button>'+
     '<div class="tdRoundStats"><strong id="tinderProgress">0 / 0 reviewed</strong><span id="tinderRemaining">Loading programmes…</span></div></div>'+
     '<div id="tinderFilterPanel" class="tdFilterPanel" hidden aria-label="Tinder Mode programme filters">'+
     '<label>Training setting<select id="tdSetting"><option value="all">All settings</option><option value="hospital">Hospital-led</option><option value="gp">GP-led</option><option value="mixed">Split training</option><option value="community">Community-led</option><option value="industry">Industry</option></select></label>'+
     '<label>Minimum salary<select id="tdMinSalary"><option value="">Any salary</option><option value="26000">£26k+</option><option value="28000">£28k+</option><option value="30000">£30k+</option><option value="32000">£32k+</option><option value="36000">£36k+</option></select></label>'+
     '<label>Maximum weekly hours<select id="tdMaxHours"><option value="">Any hours</option><option value="35">35h</option><option value="37.5">37.5h</option><option value="40">40h</option><option value="42.5">42.5h</option></select></label>'+
     '<label class="tdFilterCheck"><input id="tdSplitOnly" type="checkbox"><span>Split placements only</span></label>'+
     '<label class="tdFilterCheck"><input id="tdHideDecided" type="checkbox"><span>Hide already-decided programmes</span></label>'+
     '<button type="button" id="tdFiltersReset" class="tdFilterReset">Clear game filters</button></div>'+
     '<div class="tdBoard"><div id="tinderSwipeHints" class="tdSwipeHints" hidden><span class="tdSwipeHint tdSwipeHintLeft"><span class="tdHintArrow" aria-hidden="true">←</span><span>Swipe left to exclude a programme</span></span><span class="tdSwipeHint tdSwipeHintRight"><span>Swipe right to shortlist a programme</span><span class="tdHintArrow" aria-hidden="true">→</span></span></div><div class="tdCardDeck"><div id="tinderCardSlot" class="tdCardSlot" aria-live="polite"></div></div>'+
     '<div class="tdActions"><button id="tinderUndo" class="tdAction tdAction-undo" title="Undo last swipe" aria-label="Undo last swipe">'+icon.undo+'</button><button id="tinderNo" class="tdAction tdAction-no" title="Like No — reject programme" aria-label="Like No — reject programme">'+icon.no+'</button><button id="tinderYes" class="tdAction tdAction-yes" title="Like" aria-label="Like programme">'+icon.yes+'</button><button id="tinderSuper" class="tdAction tdAction-super" title="Super Like" aria-label="Super Like programme">'+icon.super+'</button></div>'+
     '<div class="tdActionLegend"><span>Undo</span><span>Like No</span><span>Like</span><span>Super Like</span></div>'+
     '<p class="tdExisting" id="tinderExisting">Not yet decided</p><p class="tdNotice" id="tinderNotice" role="status" aria-live="polite">Tip: ← Like No · → Like · ↑ Super Like · Backspace Undo</p>'+
     '<p class="tdDisclosure">Rotation weeks, salary and hours come from the Oriel CSV. Training areas are postcode-based approximations. Cheeky pros and cons are suggestions, not verified employer promises.</p></div>';
    $('simulator')?.after(section);
    mountDecisionDrawers();
    const region=$('tinderRegion');if(region){
      const all=document.createElement('option');all.value='all';all.textContent='All regions — England & Wales';region.append(all);
      for(const r of regionList()){const option=document.createElement('option');option.value=r;option.textContent=r;region.append(option)}
      if(![...region.options].some(x=>x.value===game.region))game.region='London';
      region.value=game.region;
      region.addEventListener('change',()=>{game.region=region.value;forced=null;saveGame();render()});
    }
    const filterPanel=$('tinderFilterPanel'),toggle=$('tinderFilterToggle');
    if(filterPanel&&toggle){
      filterPanel.hidden=true;
      toggle.addEventListener('click',()=>{
        filterPanel.hidden=!filterPanel.hidden;
        toggle.setAttribute('aria-expanded',String(!filterPanel.hidden));
      });
      const updateFields=()=>{
        $('tdSetting').value=game.filters.setting;
        $('tdMinSalary').value=game.filters.minSalary;
        $('tdMaxHours').value=game.filters.maxHours;
        $('tdSplitOnly').checked=game.filters.splitOnly;
        $('tdHideDecided').checked=game.filters.hideDecided;
      };
      updateFields();
      filterPanel.addEventListener('change',()=>{
        game.filters={setting:$('tdSetting').value,minSalary:$('tdMinSalary').value,
          maxHours:$('tdMaxHours').value,splitOnly:$('tdSplitOnly').checked,
          hideDecided:$('tdHideDecided').checked};
        forced=null;saveGame();render();
      });
      $('tdFiltersReset').addEventListener('click',()=>{
        game.filters=defaultFilters();forced=null;saveGame();
        updateFields();render();
      });
    }
    $('tinderUndo').onclick=undo;
    $('tinderNo').onclick=()=>{const p=nextProgramme();if(p)commit(p,'no',-1)};
    $('tinderYes').onclick=()=>{const p=nextProgramme();if(p)commit(p,'yes',1)};
    $('tinderSuper').onclick=()=>{const p=nextProgramme();if(p)commit(p,'love',0)};
    document.addEventListener('keydown',e=>{
      if(drawerMode!==null||!$('#tinderMode')?.classList.contains('active')||e.altKey||e.metaKey||e.ctrlKey)return;
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