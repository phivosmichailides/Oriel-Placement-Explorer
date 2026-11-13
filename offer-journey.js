'use strict';
/* Offer & outcome journey. Reuses the existing local outcome record and form.
   Nothing here submits to Oriel or predicts an allocation. */
(()=>{
 const $=id=>document.getElementById(id);
 const KEY='oriel-desk-outcome-v1';
 const OFFER_START=new Date('2026-10-22T12:00:00+01:00').getTime();
 const CELEBRATION_DAYS=14;
 const CELEBRATION_KEY='atlas-offer-celebration-v1';
 const celebrationStart=record=>{
   const good=record&&['accepted','upgrades'].includes(record.status);
   let track=null;
   try{track=JSON.parse(localStorage.getItem(CELEBRATION_KEY)||'null')}catch{}
   if(!good){
     if(track){try{localStorage.removeItem(CELEBRATION_KEY)}catch{}}
     return null;
   }
   if(track?.acceptedAt&&Number.isFinite(Date.parse(track.acceptedAt))){
     return Date.parse(track.acceptedAt);
   }
   const initial=record.savedAt&&Number.isFinite(Date.parse(record.savedAt))?record.savedAt:new Date().toISOString();
   try{localStorage.setItem(CELEBRATION_KEY,JSON.stringify({acceptedAt:initial}))}catch{}
   return Date.parse(initial);
 };

 let overlay=null,advice=null,previousFocus=null,oldOverflow='';
 const read=()=>{
   try{
     const value=JSON.parse(localStorage.getItem(KEY)||'null');
     const record=value?.record||value;
     return record&&typeof record==='object'&&typeof record.status==='string'?record:null;
   }catch{return null}
 };
 const action=(label,fn,cls='btn')=>{
   const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;
   b.addEventListener('click',fn);return b;
 };
 const addParagraph=(host,text)=>{
   const p=document.createElement('p');p.textContent=text;host.append(p);
 };
 const moveToSimulation=()=>{
   close();
   document.querySelector('nav.tabs [data-tab="simulator"]')?.click();
   $('simulator')?.scrollIntoView({block:'start',behavior:'smooth'});
 };
 const personalisedAdvice=()=>{
   const el=document.createElement('div');el.className='atlasOfferPersonalised';
   let preferred=[];
   try{if(typeof ranked==='function')preferred=ranked();}catch{}
   if(!preferred.length){
     addParagraph(el,'Your saved preference list is empty here. Build a shortlist and inspect the programme details before the next recruitment opportunity.');
     el.append(action('Explore programmes',()=>{close();document.querySelector('nav.tabs [data-tab="explore"]')?.click()},'btn primary'));
     return el;
   }
   let gp=0,hospital=0,community=0;
   for(const p of preferred){
     const fields=(p.settings||[]).map(s=>String(Array.isArray(s)?s[0]:s).toLowerCase()).join(' ');
     if(/general practice|\bgp\b/.test(fields))gp++;
     if(/hospital/.test(fields))hospital++;
     if(/community/.test(fields))community++;
   }
   const places=[...new Set(preferred.map(p=>p.region).filter(Boolean))];
   const pieces=['You have '+preferred.length+' saved preferred programmes across '+places.length+' region'+(places.length===1?'':'s')+'.'];
   if(gp===0&&preferred.length>=3)pieces.push('None of your preferred programmes lists a GP setting. If GP work would suit you, adding a few could widen the range of programmes you are willing to accept.');
   else if(hospital===0&&preferred.length>=3)pieces.push('None of your preferred programmes lists hospital experience. Consider whether a hospital or mixed programme could be a worthwhile option for you.');
   else if(community===0&&preferred.length>=3)pieces.push('Your preferences exclude community settings. That may be deliberate; consider mixed programmes only if their actual working conditions would still suit you.');
   if(places.length===1&&preferred.length>=3)pieces.push('Your list is concentrated in '+places[0]+'. You could compare an additional region that works from your actual commute base.');
   pieces.forEach(p=>addParagraph(el,p));
   addParagraph(el,'These are suggestions to broaden acceptable choices, not promises of a higher offer chance. An unwanted programme is not automatically a better choice just because it is available.');
   el.append(action('Review my simulated preferences',moveToSimulation,'btn primary'));
   return el;
 };
 function guidance(){
   if(!advice)return;
   const record=read()||{status:'awaiting'};
   advice.replaceChildren();
   const label=document.createElement('strong');advice.append(label);
   if(record.status==='unmatched'){
     label.textContent='No offer yet? Your next decisions.';
     addParagraph(advice,'Check official Oriel first: offer cascades, eligibility and response rules determine what happens next. A missing offer is not proof that your ranking was wrong.');
     advice.append(personalisedAdvice());
   }else if(record.status==='accepted'||record.status==='upgrades'){
     label.textContent='You have accepted an offer.';
     addParagraph(advice,record.status==='upgrades'?
       'Your acceptance is recorded here with upgrades enabled. Keep checking official Oriel: an awarded upgrade can replace your existing offer.':
       'Your accepted programme is recorded here. Review its training sites and practical arrangements with the employer.');
     advice.append(action('Review preference order',moveToSimulation,'btn'));
   }else if(record.status==='received'||record.status==='holding'){
     label.textContent='An offer needs your attention.';
     addParagraph(advice,'Check the deadline and permitted actions in your Oriel account. The official offers guidance states that the response window is normally 48 hours, excluding weekends and bank holidays.');
     advice.append(action('Open Oriel',()=>window.open('https://www.oriel.nhs.uk/','_blank','noopener'),'btn primary'));
   }else if(record.status==='declined'){
     label.textContent='An offer was declined.';
     addParagraph(advice,'The official recruitment guidance says declining an offer normally removes an applicant from the process. Confirm your actual status directly in Oriel.');
   }else{
     label.textContent='Keep an eye on the offer process.';
     addParagraph(advice,'Official Oriel is the source of truth for offer cascades and deadlines. You can record a status here when there is news.');
   }
 }
 function close(){
   if(!overlay||overlay.hidden)return;
   overlay.hidden=true;document.body.style.overflow=oldOverflow;
   if(previousFocus?.isConnected)previousFocus.focus();
 }
 const open=()=>{
   if(!overlay)return;
   previousFocus=document.activeElement;oldOverflow=document.body.style.overflow;
   guidance();overlay.hidden=false;document.body.style.overflow='hidden';
   overlay.querySelector('.atlasOfferClose')?.focus();
 };
 const createModal=()=>{
   const old=$('paOutcomeDetails'),body=old?.querySelector('.paOutcomeBody');
   if(!body)return false;
   overlay=document.createElement('div');overlay.className='atlasOfferOverlay';overlay.id='atlasOfferOverlay';overlay.hidden=true;
   overlay.innerHTML='<section class="atlasOfferDialog" role="dialog" aria-modal="true" aria-labelledby="atlasOfferTitle">'+
     '<div class="atlasOfferHead"><div><span class="eyebrow">YOUR ORIEL APPLICATION</span><h2 id="atlasOfferTitle">Offer & outcome</h2><p>Track the decision privately, and see what to consider next. Your official Oriel account is unchanged.</p></div><button type="button" class="atlasOfferClose" aria-label="Close offer tracker">×</button></div>'+
     '<div class="atlasOfferGuidance" id="atlasOfferGuidance" aria-live="polite"></div><div class="atlasOfferContent" id="atlasOfferContent"></div></section>';
   advice=overlay.querySelector('#atlasOfferGuidance');
   overlay.querySelector('#atlasOfferContent').append(body);
   old.remove();document.body.append(overlay);
   overlay.querySelector('.atlasOfferClose').addEventListener('click',close);
   overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
   overlay.addEventListener('keydown',e=>{
     if(e.key==='Escape'){e.preventDefault();close();return}
     if(e.key!=='Tab')return;
     const controls=[...overlay.querySelectorAll('button,a,input,select,textarea,summary')].filter(x=>x.getClientRects().length&&!x.disabled);
     const first=controls[0],last=controls[controls.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
   });
   new MutationObserver(()=>{guidance();renderStatus()}).observe($('outcomeSavedStatus'),{childList:true,characterData:true,subtree:true});
   guidance();
   return true;
 };
 const ensureButtons=()=>{
   if(!overlay)return;
   const sim=$('simulator');
   if(sim&&!$('atlasOfferSimButton')){
     const btn=action('Offer & outcome',open,'btn atlasOfferSimButton');btn.id='atlasOfferSimButton';
     const host=sim.querySelector('.simHeroActions')||sim.querySelector('.simHero');
     host?.append(btn);
   }
   const deadline=$('orielDeadline');
   if(deadline&&!$('atlasOfferDeadlineButton')&&Date.now()>=OFFER_START&&$('deadlineLabel')?.textContent.includes('2027/28')){
     const btn=action('View offer & outcome',open,'atlasOfferDeadlineButton');btn.id='atlasOfferDeadlineButton';
     deadline.append(btn);
   }
 };
 const renderStatus=()=>{
   if(!overlay)return;
   const existing=$('atlasOfferCongrats');
   const record=read();
   const start=celebrationStart(record);
   const age=start===null?Infinity:Date.now()-start;
   const show=Number.isFinite(age)&&age>=0&&age<CELEBRATION_DAYS*86400000;
   if(!show){existing?.remove();return}
   const anchor=$('atlasDeadlineRow')||document.querySelector('.productIntro');
   if(!anchor)return;
   let banner=existing;
   if(!banner){
     banner=document.createElement('section');banner.id='atlasOfferCongrats';banner.className='atlasOfferCongrats';
     banner.innerHTML='<div class="atlasOfferCelebrationIcon" aria-hidden="true">✓</div><div><div class="eyebrow">YOUR FOUNDATION YEAR</div><h2>Congratulations on your offer.</h2><p>Your next chapter is taking shape. Review the details and plan your next steps.</p></div>';
     banner.append(action('View your offer',open,'btn atlasCongratsAction'));
   }
   anchor.insertAdjacentElement('afterend',banner);
 };
 let counter=0;
 const timer=setInterval(()=>{
   counter++;
   if(!overlay)createModal();
   ensureButtons();renderStatus();
   if(counter>130||(overlay&&$('atlasOfferSimButton')&&$('atlasOfferDeadlineButton')))clearInterval(timer);
 },180);
 document.addEventListener('desk:after-navigation',ensureButtons);
 window.addEventListener('storage',event=>{if(event.key===KEY){guidance();renderStatus()}});
})();