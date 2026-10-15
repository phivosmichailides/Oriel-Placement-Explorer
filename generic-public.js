'use strict';
(()=>{
  const KEY='phivos-desk-v2';
  const DATAKEY='phivos-desk-csv-v2';
  const DONE_KEY='phivos-onboarding-v1';
  const PROFILE_KEY='phivos-onboarding-profile-v1';
  const OLD_LIKES='London Bridge, Southwark, Borough, Waterloo, Holborn, Bloomsbury, Clerkenwell, Angel, Islington, Shoreditch, Camden, Fitzrovia, Westminster, Vauxhall, Battersea, Kensington, Chelsea, Hammersmith, Fulham, Ealing, Wembley';
  const OLD_AVOIDS='Croydon, Barnet, Wood Green, Morden, New Addington, Romford, Dagenham, Enfield, Lewisham';

  const readJSON=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  const has=(k)=>{try{return !!localStorage.getItem(k)}catch{return false}};

  const ready=()=>{
    try{return typeof state!=='undefined'&&typeof placements!=='undefined'&&placements.length&&typeof renderAll==='function'&&document.getElementById('decision')&&document.getElementById('region');}catch{return false;}
  };

  const install=()=>{
    if(!ready()||window.__genericPublicInstalled)return false;
    window.__genericPublicInstalled=true;

    const profile=readJSON(PROFILE_KEY);
    const onboardingDone=has(DONE_KEY);
    const uploaded=has(DATAKEY);
    const wasFresh=window.__placementDeskWasFresh===true;
    const looksLikeOldPersonalDefaults=state?.prefs?.likes===OLD_LIKES&&state?.prefs?.avoids===OLD_AVOIDS;

    // Migrate the old public build away from Phivos-specific defaults without touching
    // a visitor who has already personalised the desk or uploaded their own Oriel data.
    if((wasFresh||(!onboardingDone&&!uploaded&&looksLikeOldPersonalDefaults))&&!profile){
      state.prefs.likes='';
      state.prefs.avoids='';
      state.prefs.weights={money:3,hospital:3,gp:3,lifestyle:3,location:3,progression:3,independence:3,communityPenalty:2};
      state.marks={};
      state.compare=[];
      // Mark the old embedded snapshot as handled so app-base does not re-import it next visit.
      try{if(typeof ORIEL_SNAPSHOT!=='undefined')state.orielSnapshot=ORIEL_SNAPSHOT.version}catch{}
      try{save()}catch{}
      // Seed neutral answers so the first-time questionnaire itself is not London-biased.
      try{localStorage.setItem(PROFILE_KEY,JSON.stringify({region:'',environment:'unsure',priorities:[],salary:'',hours:'',community:'some'}))}catch{}
    }

    // Public identity: authored by Phivos, but designed for any applicant.
    document.title='Oriel Placement Desk';
    const title=document.querySelector('header.top h1');
    if(title)title.textContent='Oriel Placement Desk';
    const topEyebrow=document.querySelector('header.top .brand .eyebrow');
    if(topEyebrow)topEyebrow.textContent='ORIEL 2027/28 · PERSONALISED';
    const topSub=document.querySelector('header.top .brand p');
    if(topSub)topSub.textContent='Explore every included England & Wales programme. Then make the desk yours.';

    // Remove remnants of the creator's own 13 Oct Oriel snapshot from the public UI.
    document.querySelector('#decision option[value="orielNoPreference"]')?.remove();
    const restore=document.getElementById('restoreOrielOrder');
    if(restore)restore.closest('.notice')?.remove();

    // Keep programme IDs useful without showing Phivos's personal saved-Oriel labels.
    const baseCard=card;
    card=(p,compact=false)=>{
      let html=baseCard(p,compact)
        .replace(/ · Saved in Oriel #\d+/g,'')
        .replace(/ · Oriel: No Preference/g,'');
      if(p.orielRank){
        const code=String(p.id).split('/').pop();
        html=html.replace(`Programme ${esc(code)}</span>`,`Programme ${esc(code)} · Your uploaded Oriel rank ${esc(p.orielRank)}</span>`);
      }
      return html;
    };

    // A neutral visit starts broad. Returning users who completed onboarding get their
    // own saved starting region/limits instead of Phivos's.
    quick.clear();
    document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.remove('on'));
    const region=document.getElementById('region');
    const decision=document.getElementById('decision');
    const salary=document.getElementById('salary');
    const hours=document.getElementById('hours');
    const hideAvoid=document.getElementById('hideAvoid');
    const visa=document.getElementById('visa');
    if(region)region.value=profile?.region||'';
    if(decision)decision.value='all';
    if(salary)salary.value=profile?.salary||'';
    if(hours)hours.value=profile?.hours||'';
    if(hideAvoid)hideAvoid.checked=false;
    if(visa)visa.value='';

    const allBtn=document.getElementById('allRegionsBtn');
    if(allBtn)allBtn.classList.toggle('on',!region?.value);

    // Copy should describe the product, not the creator's personal London search.
    const notice=document.querySelector('.notice');
    if(notice)notice.innerHTML='<b>🧭 Start broad, then make it yours.</b><br>You can explore every programme in the England & Wales dataset, or narrow the map by region, setting, pay, hours and your own preferences. Nothing is hidden just because it would not suit the creator.';

    const principles=[...document.querySelectorAll('.productPrinciples>div')];
    if(principles[2])principles[2].innerHTML='<span>03</span><b>Personalise without limiting</b><small>Start with the full dataset, then let each applicant decide what matters to them.</small>';

    const context=document.querySelector('.contextStrip>span:first-child');
    if(context)context.innerHTML='<b>Designed for a cleaner decision:</b> start across all included programmes or choose a region, then compare options using your own criteria, pros/cons, map and ranking tools.';

    document.querySelectorAll('#prefs .settingsCard').forEach(card=>{
      const eye=card.querySelector('.eyebrow');
      if(eye?.textContent.trim()==='LONDON')eye.textContent='LOCATION';
    });

    // Reset should mean "show me the whole product", not "restore Phivos's London view".
    const reset=document.getElementById('resetBtn');
    if(reset)reset.onclick=()=>{
      document.getElementById('decision').value='all';
      document.getElementById('visa').value='';
      document.getElementById('hideAvoid').checked=false;
      document.getElementById('search').value='';
      document.getElementById('sector').value='';
      document.getElementById('region').value='';
      document.getElementById('hours').value='';
      document.getElementById('salary').value='';
      document.getElementById('sort').value='fit';
      pageLimit=40;
      quick.clear();
      document.querySelectorAll('.chip[data-q]').forEach(x=>x.classList.remove('on'));
      document.getElementById('allRegionsBtn')?.classList.add('on');
      try{renderAll()}catch{try{explore();stats();reco()}catch{}}
      setTimeout(()=>{try{locateMissing()}catch{}},120);
    };

    // Keep the All regions chip visually and functionally meaningful.
    allBtn?.addEventListener('click',()=>{
      allBtn.classList.add('on');
      setTimeout(()=>{try{locateMissing()}catch{}},120);
    });
    region?.addEventListener('change',()=>allBtn?.classList.toggle('on',!region.value));
    document.querySelector('[data-q="london"]')?.addEventListener('click',()=>allBtn?.classList.remove('on'));

    try{renderAll()}catch{}

    // On an unpersonalised broad visit, build the England & Wales map in the background.
    // Coordinates are cached locally afterwards, so this is primarily a first-visit cost.
    if(!region?.value){
      const mapStatus=document.getElementById('mapStatus');
      if(mapStatus)mapStatus.textContent='Preparing the England & Wales programme map…';
      setTimeout(()=>{try{locateMissing()}catch{}},450);
    }

    return true;
  };

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>150)clearInterval(timer);
  },80);
})();
