'use strict';
/* Location blacklist for the independent Placement Atlas.
   Matches actual listed training-site postcodes, NEVER employer/title text.
   British postcode administration: postcodes.io (ONS/OS), up to 100/batch.
   OS Open Names place predictions: postcodes.io/places?q=... .
   A Google Places widget can be connected separately when a licensed key exists. */
(()=>{
  const GEO_CACHE='oriel-site-admin-v1';
  const byId=id=>document.getElementById(id);
  const clean=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const pcKey=s=>String(s||'').toUpperCase().replace(/\s+/g,'');
  const postcodes=()=>typeof placements!=='undefined'&&Array.isArray(placements)?placements:[];
  const prefs=()=>typeof state!=='undefined'&&state?.prefs?state.prefs:null;
  const areas=()=>Array.isArray(prefs()?.locationBlacklist)?prefs().locationBlacklist:[];
  const likedAreas=()=>Array.isArray(prefs()?.locationLikes)?prefs().locationLikes:[];
  const legacyLikes=()=>String(prefs()?.likes||'').split(',').map(value=>value.trim()).filter(Boolean);
  const allowed=()=>prefs()?.locationAllowed||{};
  const allPC=()=>[...new Set(postcodes().flatMap(p=>(p.postcodes||[]).map(pcKey).filter(Boolean)))];
  const matchDistrict=(name,site)=>!!name&&clean(site?.district)===clean(name);
  let adminCache={};
  try{const c=JSON.parse(localStorage.getItem(GEO_CACHE)||'{}');if(c&&typeof c==='object'&&!Array.isArray(c))adminCache=c;}catch{}
  const persistCache=()=>{try{localStorage.setItem(GEO_CACHE,JSON.stringify(adminCache))}catch{}};
  const has=pc=>Object.prototype.hasOwnProperty.call(adminCache,pc);
  const activeIds=()=>areas().map(a=>a.id).sort().join('|');
  const isAllowed=p=>allowed()[p.id]===activeIds()&&activeIds().length>0;

  /* A borough exclusion is exact by postcode admin_district. OS settlements
     without a district scope use their published easting/northing extent;
     bounding rectangles are approximate and explicitly labelled as such. */
  const matchArea=(area,site)=>{
    if(!site)return false;
    if(area.kind==='district'){
      return matchDistrict(area.district,site)&&(!area.region||clean(site.region)===clean(area.region));
    }
    if(area.kind==='postcode')return pcKey(area.postcode)===pcKey(site.postcode);
    if(area.kind==='settlement'){
      const b=area.bounds;
      if(!Array.isArray(b)||b.length!==4||![site.e,site.n].every(Number.isFinite))return false;
      return site.e>=b[0]&&site.e<=b[2]&&site.n>=b[1]&&site.n<=b[3];
    }
    return false;
  };
  const assess=p=>{
    if(!areas().length||isAllowed(p))return {kind:'clear',reasons:[],uncertain:[]};
    const codes=[...new Set((p.postcodes||[]).map(pcKey).filter(Boolean))];
    const reasons=[],uncertain=[];
    for(const pc of codes){
      if(!has(pc)){uncertain.push(pc+' — awaiting postcode verification');continue;}
      const site=adminCache[pc];
      if(!site){uncertain.push(pc+' — postcode unavailable');continue;}
      for(const area of areas())if(matchArea(area,site)){
        if(area.kind==='settlement'){
          const note=pc+' — possible match to '+area.label+'; the mapped settlement extent is approximate and needs review';
          if(!uncertain.includes(note))uncertain.push(note);
        }else if(!reasons.some(r=>r.area.id===area.id))reasons.push({area,site:site.postcode||pc});
      }
    }
    if(codes.length===0)uncertain.push('No training-site postcode supplied');
    // Do not claim safety when a split appears to list only one site.
    if((p.settings||[]).length>1&&codes.length<2)uncertain.push('Additional split-placement site may be missing');
    return {
      kind:reasons.length?'blocked':uncertain.length?'unverified':'clear',
      reasons,uncertain
    };
  };
  const shouldHide=p=>assess(p).kind==='blocked';
  const matchesPreferred=p=>{
    const preferred=likedAreas();if(!preferred.length)return null;
    const codes=[...new Set((p.postcodes||[]).map(pcKey).filter(Boolean))];if(!codes.length)return null;
    let uncertain=false;
    for(const pc of codes){
      const site=adminCache[pc];
      if(!has(pc)||!site){uncertain=true;continue;}
      if(preferred.some(area=>matchArea(area,site)))return true;
    }
    return uncertain?null:false;
  };
  const getExcluded=()=>postcodes().map(p=>({p,assessment:assess(p)}))
    .filter(x=>x.assessment.kind!=='clear');
  const safeText=(str)=>String(str||'').slice(0,300);
  let scanning=false,scanFailures=0,scanned=0,total=0,refreshTimer=null;
  const refresh=()=>{
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      renderChips();renderSummary();renderModal();
      try{if(typeof explore==='function')explore();if(typeof reco==='function')reco()}catch(error){console.warn('Location filter refresh failed',error)}
      document.dispatchEvent(new CustomEvent('desk:geo-blacklist-changed'));
    },180);
  };
  const progress=()=>{
    const status=byId('geoBlacklistStatus');
    if(!status)return;
    const hasAnyArea=areas().length||likedAreas().length;
    const missing=hasAnyArea?allPC().filter(pc=>!has(pc)).length:0;
    if(!areas().length&&!likedAreas().length)status.textContent='Add an area to check listed training sites.';
    else if(scanning)status.textContent='Checking site postcodes · '+scanned+' / '+total+'.';
    else if(missing)status.textContent=missing+' postcodes need verification. Affected programmes remain visible.';
    else status.textContent='Site checks complete. Only exact verified matches are excluded.';
  };
  const scan=async()=>{
    if(scanning||(!areas().length&&!likedAreas().length)||!postcodes().length){progress();return;}
    const missing=allPC().filter(pc=>!has(pc));
    if(!missing.length){progress();refresh();return;}
    scanning=true;scanned=0;total=missing.length;scanFailures=0;
    progress();refresh();
    const batches=[];
    for(let i=0;i<missing.length;i+=80)batches.push(missing.slice(i,i+80));
    let next=0;
    const worker=async()=>{
      while(next<batches.length){
        const batch=batches[next++];
        try{
          const response=await fetch('https://api.postcodes.io/postcodes',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({postcodes:batch}),signal:AbortSignal.timeout(15000)
          });
          if(!response.ok)throw Error('Postcode lookup temporarily unavailable');
          const data=await response.json();
          for(const result of data.result||[]){
            const pc=pcKey(result.query),v=result.result;
            adminCache[pc]=v?{
              postcode:v.postcode||pc,
              district:v.admin_district||'',
              ward:v.admin_ward||'',
              parish:v.parish||'',
              region:v.region||'',
              e:Number(v.eastings),n:Number(v.northings)
            }:null;
          }
          scanned+=batch.length;persistCache();progress();refresh();
        }catch(error){scanFailures++;console.warn('Postcode verification batch failed',error);scanned+=batch.length;progress();}
      }
    };
    await Promise.all(Array.from({length:Math.min(3,batches.length)},()=>worker()));
    scanning=false;progress();refresh();
  };
  const londonBoroughs=('Barking and Dagenham|Barnet|Bexley|Brent|Bromley|Camden|Croydon|Ealing|Enfield|Greenwich|Hackney|Hammersmith and Fulham|Haringey|Harrow|Havering|Hillingdon|Hounslow|Islington|Kensington and Chelsea|Kingston upon Thames|Lambeth|Lewisham|Merton|Newham|Redbridge|Richmond upon Thames|Southwark|Sutton|Tower Hamlets|Waltham Forest|Wandsworth|Westminster|City of London').split('|');
  const uniqueSuggestions=list=>[...new Map(list.map(o=>[o.id,o])).values()].slice(0,9);
  const suggestionsFromResponse=(query,items)=>{
    const list=[];
    for(const b of londonBoroughs)if(clean(b).includes(clean(query))){
      list.push({id:'district:london:'+clean(b),kind:'district',district:b,region:'London',
        label:b+', London, UK',subtitle:'London borough · exact postcode boundary'});
    }
    for(const raw of items||[]){
      if(!raw||!raw.name_1)continue;
      const type=raw.local_type||'Place',region=raw.region||raw.county_unitary||raw.country||'UK';
      const bounds=[raw.min_eastings,raw.min_northings,raw.max_eastings,raw.max_northings].map(Number);
      if(!bounds.every(Number.isFinite))continue;
      // A place is not necessarily the whole local authority; keep its OS extent.
      list.push({id:'os:'+raw.code,kind:'settlement',name:raw.name_1,bounds,
        label:raw.name_1+', '+region+', UK',subtitle:type+' · approximate mapped extent'});
    }
    return uniqueSuggestions(list);
  };
  const searchTimers={like:null,exclude:null},searchRequests={like:0,exclude:0},selected={like:null,exclude:null};
  const searchLocations=async(query,mode='exclude')=>{
    const like=mode==='like',input=byId(like?'geoLikeSearch':'geoAreaSearch'),list=byId(like?'geoLikeSuggestions':'geoAreaSuggestions'),add=byId(like?'geoAddLike':'geoAddArea');
    if(!input||!list||!add)return;
    const num=++searchRequests[mode];
    list.replaceChildren();selected[mode]=null;add.disabled=true;
    let raw=query.trim();
    if(raw.length<2)return;
    raw=raw.replace(/,\s*(UK|United Kingdom|England|London)\s*$/i,'').trim();
    let result=[];
    try{
      const resp=await fetch('https://api.postcodes.io/places?q='+encodeURIComponent(raw)+'&limit=20',{signal:AbortSignal.timeout(9000)});
      if(resp.ok){const data=await resp.json();result=data.result||[];}
    }catch(error){console.warn('Location suggestions temporarily unavailable',error);}
    if(num!==searchRequests[mode]||input.value.trim()!==query.trim())return;
    const suggestions=suggestionsFromResponse(raw,result);
    list.replaceChildren();
    if(!suggestions.length){const empty=document.createElement('div');empty.className='geoSuggestionEmpty';empty.textContent='No matching place found. Try a different area name.';list.append(empty);}
    for(const item of suggestions){
      const button=document.createElement('button');button.type='button';button.className='geoSuggestion';
      const a=document.createElement('strong');a.textContent=item.label;
      const b=document.createElement('small');b.textContent=item.subtitle;
      button.append(a,b);
      button.onclick=()=>{selected[mode]=item;input.value=item.label;list.replaceChildren();add.disabled=false;const status=byId(like?'geoLikeStatus':'geoBlacklistStatus');if(status)status.textContent='Selected '+item.label+'. Choose “'+(like?'Add area':'Exclude area')+'” to save it.';};
      list.append(button);
    }
  };
  const saveNewArea=(mode='exclude')=>{
    const like=mode==='like',item=selected[mode];if(!item||!prefs())return;
    const current=like?likedAreas():areas();
    if(current.some(a=>a.id===item.id)){const status=byId(like?'geoLikeStatus':'geoBlacklistStatus');if(status)status.textContent='This area is already saved.';return;}
    const entry={...item,createdAt:new Date().toISOString()};
    if(like)prefs().locationLikes=[...likedAreas(),entry];
    else{prefs().locationBlacklist=[...areas(),entry];prefs().locationAllowed={};}
    save();const status=byId(like?'geoLikeStatus':'geoBlacklistStatus');if(status)status.textContent=like?'Added '+entry.label+'. Match scores will update.':'Added '+entry.label+' to exclusions. Only verified matches are hidden.';selected[mode]=null;
    const input=byId(like?'geoLikeSearch':'geoAreaSearch'),add=byId(like?'geoAddLike':'geoAddArea'),list=byId(like?'geoLikeSuggestions':'geoAreaSuggestions');
    if(input)input.value='';if(add)add.disabled=true;if(list)list.replaceChildren();
    progress();refresh();scan();
  };
  const removeArea=id=>{
    if(!prefs())return;
    prefs().locationBlacklist=areas().filter(a=>a.id!==id);
    prefs().locationAllowed={};save();progress();refresh();scan();
  };
  const removeLikeArea=id=>{
    if(!prefs())return;
    prefs().locationLikes=likedAreas().filter(a=>a.id!==id);
    if(!prefs().locationLikes.length)prefs().preferredAreasOnly=false;
    save();refresh();scan();
  };
  const removeLegacyLike=label=>{
    if(!prefs())return;
    prefs().likes=legacyLikes().filter(value=>clean(value)!==clean(label)).join(', ');
    save();refresh();
  };
  const allowProgramme=p=>{
    if(!prefs())return;
    prefs().locationAllowed={...allowed(),[p.id]:activeIds()};
    save();refresh();
  };
  const renderLikeChips=()=>{
    const host=byId('geoLikeChips');if(!host)return;
    host.replaceChildren();
    for(const area of likedAreas()){
      const chip=document.createElement('span');chip.className='geoLikeChip';
      const label=document.createElement('span');label.textContent=area.label;
      const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Remove '+area.label+' from preferred areas';close.setAttribute('aria-label','Remove '+area.label+' from preferred areas');
      close.onclick=()=>removeLikeArea(area.id);chip.append(label,close);host.append(chip);
    }
    legacyLikes().forEach(value=>{
      const chip=document.createElement('span');chip.className='geoLikeChip geoLikeChipLegacy';
      const label=document.createElement('span');label.textContent=value+' · saved preference';
      const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Remove '+value+' from legacy preferred areas';close.setAttribute('aria-label','Remove '+value+' from preferred areas');
      close.onclick=()=>removeLegacyLike(value);chip.append(label,close);host.append(chip);
    });
    const focus=byId('geoPreferredOnly');if(focus){focus.checked=!!prefs()?.preferredAreasOnly;focus.disabled=!likedAreas().length;}
  };
  const renderChips=()=>{
    renderLikeChips();
    const host=byId('geoAreaChips');if(!host)return;
    host.replaceChildren();
    for(const a of areas()){
      const chip=document.createElement('span');chip.className='geoAreaChip';
      const label=document.createElement('span');label.textContent=a.label;
      const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Remove '+a.label+' from excluded areas';close.setAttribute('aria-label','Remove '+a.label);
      close.onclick=()=>removeArea(a.id);
      chip.append(label,close);host.append(chip);
    }
    progress();
  };
  const renderSummary=()=>{
    const results=getExcluded(),blocked=results.filter(x=>x.assessment.kind==='blocked').length,pending=results.length-blocked;
    document.querySelectorAll('[data-geo-count]').forEach(el=>el.textContent=areas().length?blocked+' excluded · '+pending+' need review':'0 excluded');
    for(const el of document.querySelectorAll('[data-geo-open]'))el.disabled=!areas().length;
  };
  const overlay=()=>byId('geoBlacklistOverlay');
  const openModal=()=>{
    if(!overlay())return;
    overlay().hidden=false;document.body.classList.add('geoDialogOpen');renderModal();
    byId('geoClose')?.focus();
  };
  const closeModal=()=>{if(!overlay())return;overlay().hidden=true;document.body.classList.remove('geoDialogOpen');};
  let descending=false,showOnly='all';
  const renderModal=()=>{
    const body=byId('geoExcludedList');if(!body||overlay()?.hidden)return;
    const all=getExcluded().sort((a,b)=>{
      const dateA=Math.max(...a.assessment.reasons.map(x=>new Date(x.area.createdAt||0).getTime()),0);
      const dateB=Math.max(...b.assessment.reasons.map(x=>new Date(x.area.createdAt||0).getTime()),0);
      return (descending?dateB-dateA:dateA-dateB)||String(a.p.title).localeCompare(String(b.p.title));
    });
    const filtered=all.filter(x=>showOnly==='all'||x.assessment.kind===showOnly);
    const search=(byId('geoExcludedSearch')?.value||'').trim().toLowerCase();
    const visible=filtered.filter(x=>!search||[x.p.title,x.p.employer,x.p.id,...x.p.postcodes].join(' ').toLowerCase().includes(search));
    byId('geoModalCount').textContent=visible.length+' programme'+(visible.length===1?'':'s');
    const sort=byId('geoSort');if(sort)sort.textContent=descending?'Newest areas first ↓':'Oldest areas first ↑';
    body.replaceChildren();
    if(!visible.length){const empty=document.createElement('p');empty.className='geoEmpty';empty.textContent='No programmes in this group.';body.append(empty);return;}
    const frag=document.createDocumentFragment();
    visible.forEach(({p,assessment},i)=>{
      const card=document.createElement('li');card.className='geoExcludedItem';
      const num=document.createElement('span');num.className='geoExcludedNum';num.textContent=String(i+1).padStart(2,'0');
      const detail=document.createElement('div');detail.className='geoExcludedDetails';
      const title=document.createElement('strong');title.textContent=safeText(p.title||p.employer);
      const sub=document.createElement('small');sub.textContent=[p.employer,'Programme '+p.id,(p.postcodes||[]).join(' · ')].filter(Boolean).join(' · ');
      const reason=document.createElement('p');reason.className='geoReason';
      if(assessment.kind==='blocked'){
        reason.append(document.createTextNode('Why excluded → '));
        assessment.reasons.forEach((r,j)=>{
          if(j)reason.append(document.createTextNode(', '));
          const red=document.createElement('b');red.className='geoReasonRed';red.textContent=r.area.label.split(',')[0];
          red.title='Matched listed training postcode '+r.site;
          reason.append(red);
        });
      }else{
        const warn=document.createElement('b');warn.className='geoReviewLabel';warn.textContent='Needs location review';
        reason.append(warn,document.createTextNode(' · '+assessment.uncertain.join(' · ')));
      }
      const allow=document.createElement('button');allow.type='button';allow.className='btn geoAllow';allow.textContent=assessment.kind==='blocked'?'Restore to Explore':'Mark reviewed · keep visible';
      allow.onclick=()=>{
        allowProgramme(p);closeModal();
        if(typeof switchTab==='function')switchTab('explore');
        const filters=['sector','region','hours','salary','visa'];
        for(const id of filters){const el=byId(id);if(el)el.value='';}
        const d=byId('decision');if(d)d.value='all';
        const hide=byId('hideExcluded');if(hide)hide.checked=false;
        const h=byId('hideShortlisted');if(h)h.checked=false;
        const outer=byId('hideOuterLondon');if(outer)outer.checked=false;
        const specialist=byId('specialistView');if(specialist)specialist.value='all';
        for(const id of ['hideJustice','hideMental','hideOtherSpecialist']){const el=byId(id);if(el)el.checked=false;}
        if(typeof quick!=='undefined')quick.clear();
        document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.remove('on'));
        byId('search').value=p.id;
        window.OrielSaveFilters?.();
        if(typeof explore==='function')explore();
        window.scrollTo({top:byId('uxExploreToolbar')?.getBoundingClientRect().top+window.scrollY-80||0,behavior:'smooth'});
      };
      detail.append(title,sub,reason,allow);card.append(num,detail);frag.append(card);
    });
    body.append(frag);
  };
  const mount=()=>{
    const textarea=byId('avoids'),saveBtn=byId('savePrefs'),legacyLike=byId('likes')?.closest('label');
    if(!textarea||!saveBtn||byId('geoAreaSearch'))return;
    const original=textarea.closest('label');original?.classList.add('geoLegacyAvoid');legacyLike?.classList.add('geoLegacyLike');
    const likesPane=document.createElement('section');likesPane.className='geoLikesPane';
    likesPane.innerHTML='<label class="geoSearchLabel" for="geoLikeSearch">Preferred areas</label>'+
      '<div class="geoSearchHolder"><div class="geoInputRow"><input id="geoLikeSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Search a borough, town or area…" aria-label="Search UK locations to prefer"><button class="btn" id="geoAddLike" type="button" disabled>Add area</button></div><div id="geoLikeSuggestions" class="geoSuggestions" role="group" aria-label="Preferred location suggestions"></div></div>'+
      '<p id="geoLikeStatus" class="geoBlacklistStatus" role="status">Add areas to improve match scores.</p>'+
      '<label class="geoPreferredOnly"><input id="geoPreferredOnly" type="checkbox"> <span>Only show programmes in these preferred areas</span></label>'+
      '<div id="geoLikeChips" class="geoLikeChips" aria-label="Saved preferred areas"></div>';
    const pane=document.createElement('section');pane.className='geoBlacklistPane';
    pane.innerHTML='<label class="geoSearchLabel" for="geoAreaSearch">Areas to exclude</label>'+
      '<div class="geoSearchHolder"><div class="geoInputRow"><input id="geoAreaSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Search a town, borough or area…" aria-label="Search UK locations to exclude"><button class="btn primary" id="geoAddArea" type="button" disabled>Exclude area</button></div><div id="geoAreaSuggestions" class="geoSuggestions" role="group" aria-label="Location suggestions"></div></div>'+
      '<p id="geoBlacklistStatus" class="geoBlacklistStatus" role="status"></p>'+
      '<div class="geoChipRow"><div id="geoAreaChips" class="geoAreaChips" aria-label="Saved excluded areas"></div><button class="btn geoViewExcluded" type="button" data-geo-open>View excluded <span data-geo-count></span></button></div>'+
      '<p class="geoAccuracyNote">Only exact, verified training-site postcode matches are excluded. Unverified locations remain visible.</p>'+
      '<button type="button" class="geoRetry" id="geoRetry">Retry verification</button>';
    legacyLike?.after(likesPane);original?.after(pane);saveBtn.hidden=true;saveBtn.setAttribute('aria-hidden','true');
    const bindLocationSearch=(mode)=>{
      const like=mode==='like',input=byId(like?'geoLikeSearch':'geoAreaSearch'),list=byId(like?'geoLikeSuggestions':'geoAreaSuggestions'),add=byId(like?'geoAddLike':'geoAddArea');
      input?.addEventListener('input',()=>{clearTimeout(searchTimers[mode]);list.replaceChildren();selected[mode]=null;add.disabled=true;searchTimers[mode]=setTimeout(()=>searchLocations(input.value,mode),260);});
      input?.addEventListener('keydown',event=>{if(event.key==='Enter'){const first=list.querySelector('button.geoSuggestion');if(first){event.preventDefault();first.click();}}if(event.key==='Escape')list.replaceChildren();});
      add?.addEventListener('click',()=>saveNewArea(mode));
    };
    bindLocationSearch('like');bindLocationSearch('exclude');
    byId('geoPreferredOnly')?.addEventListener('change',()=>{if(!prefs())return;prefs().preferredAreasOnly=byId('geoPreferredOnly').checked;save();refresh();scan();});
    byId('geoRetry').onclick=()=>scan();
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-geo-open]'))openModal();
      if(!e.target.closest('.geoSearchHolder')){byId('geoAreaSuggestions')?.replaceChildren();byId('geoLikeSuggestions')?.replaceChildren();}
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay()?.hidden)closeModal();});
    const modal=document.createElement('div');modal.className='geoOverlay';modal.id='geoBlacklistOverlay';modal.hidden=true;
    modal.innerHTML='<section class="geoModal" role="dialog" aria-modal="true" aria-labelledby="geoModalTitle"><div class="geoModalHead"><div><small>YOUR LOCATION EXCLUSIONS</small><h2 id="geoModalTitle">Excluded &amp; needs review</h2><p>Only exact verified postcode or borough matches are hidden. Unverified and approximate matches remain visible in Explore until reviewed. Any verified matching training site excludes the entire programme.</p></div><button id="geoClose" type="button" class="geoClose" aria-label="Close location review">×</button></div><div class="geoModalTools"><button type="button" id="geoSort" class="btn">Oldest areas first ↑</button><select id="geoShow" aria-label="Filter excluded programmes"><option value="all">Excluded + Needs review</option><option value="blocked">Verified excluded</option><option value="unverified">Needs review</option></select><input type="search" id="geoExcludedSearch" placeholder="Search excluded programmes…" aria-label="Search excluded programmes"><span id="geoModalCount"></span></div><ol id="geoExcludedList" class="geoExcludedList"></ol></section>';
    document.body.append(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    byId('geoClose').onclick=closeModal;
    byId('geoSort').onclick=()=>{descending=!descending;renderModal();};
    byId('geoShow').onchange=e=>{showOnly=e.target.value;renderModal();};
    byId('geoExcludedSearch').oninput=renderModal;
    const top=byId('uxExploreToolbar')||byId('results');
    const b=document.createElement('button');b.type='button';b.className='btn geoOpenExplore';b.dataset.geoOpen='';b.innerHTML='Exclusions <span data-geo-count></span>';
    if(top)top.insertAdjacentElement('beforebegin',b);
    const forYou=document.querySelector('#foryou .uxRecommendationsTools');
    if(forYou){const copy=b.cloneNode(true);copy.className='btn geoOpenForYou';forYou.append(copy);}
    renderChips();renderSummary();
  };
  const ready=()=>{mount();renderChips();renderSummary();scan();};
  document.addEventListener('desk:cards-ready',ready);
  document.addEventListener('desk:dataset',()=>{refresh();scan();});
  document.addEventListener('desk:after-navigation',()=>{renderChips();renderSummary();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  window.OrielGeoBlacklist={assess,shouldHide,getExcluded,matchArea,matchesPreferred,scan,refresh};
})();