'use strict';
/* The user's pre-registration-year base postcode. Stored locally; sent to TfL only when a journey is calculated. */
(()=> {
  const KEY='oriel-desk-home-postcode-v1';
  const PROFILE_KEY='phivos-onboarding-profile-v1';
  const $=id=>document.getElementById(id);
  const normalise=value=>{
    const compact=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(compact==='GIR0AA')return 'GIR 0AA';
    const match=compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
    return match?match[1]+' '+match[2]:String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  };
  const isValid=value=>{
    const pc=normalise(value);
    return /^(?:GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})$/.test(pc);
  };
  const read=()=>{
    let value='';
    const postcodeInput=$('uxHomePostcode');if(postcodeInput)postcodeInput.value=pc;
    try{
      const profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
      if(profile&&typeof profile==='object'&&Object.prototype.hasOwnProperty.call(profile,'homePostcode'))return normalise(profile.homePostcode||'');
    }catch{}
    try{value=localStorage.getItem(KEY)||''}catch{}
    if(!value){
      try{value=state?.prefs?.onboarding?.homePostcode||''}catch{}
    }
    return normalise(value);
  };
  const areaLabel=postcode=>{
    try{return window.OrielLocationGuide?.describePostcode(postcode)?.headline||postcode}catch{return postcode}
  };
  const setStatus=(message,isError=false)=>{
    const status=$('uxHomePostcodeStatus');
    if(status){status.textContent=message;status.classList.toggle('is-error',isError)}
  };
  const save=(value,options={})=>{
    const pc=normalise(value);
    if(pc&&!isValid(pc))return {ok:false,message:'Enter a complete UK postcode, for example E16 1RB.'};
    try{if(pc)localStorage.setItem(KEY,pc);else localStorage.removeItem(KEY)}catch{return {ok:false,message:'This browser could not save the commute postcode.'}}
    try{
      const profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
      if(profile&&typeof profile==='object'&&!Array.isArray(profile)){
        profile.homePostcode=pc;
        localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
      }
    }catch{}
    try{
      if(typeof state!=='undefined'&&state?.prefs?.onboarding){
        state.prefs.onboarding={...state.prefs.onboarding,homePostcode:pc};
        if(typeof window.save==='function')window.save();
      }
    }catch{}
    if(pc)setStatus('Saved · '+areaLabel(pc)+' ('+pc+'). Commute checks use a typical weekday 08:00 journey; programme map pins stay unchanged.');
    else setStatus('No commute starting point saved. Add a postcode to personalise each training-site journey.');
    document.dispatchEvent(new CustomEvent('desk:commute-origin-changed',{detail:{postcode:pc}}));
    if(!options.silent&&typeof toast==='function')toast(pc?'Commute starting point saved.':'Commute starting point cleared.');
    return {ok:true,postcode:pc};
  };
  window.OrielCommuteProfile={read,save,isValid,normalise,areaLabel};
  const bind=()=>{
    const input=$('uxHomePostcode'),button=$('uxSaveHomePostcode');
    if(!input||!button)return false;
    if(input.dataset.commuteBound==='1')return true;
    input.dataset.commuteBound='1';
    const current=read();
    input.value=current;
    if(current)setStatus('Saved · '+areaLabel(current)+' ('+current+'). Commute checks use a typical weekday 08:00 journey; programme map pins stay unchanged.');
    else setStatus('No commute starting point saved. Add a postcode to personalise each training-site journey.');
    const commit=()=>{
      const result=save(input.value);
      if(!result.ok){setStatus(result.message,true);input.focus();return}
      input.value=result.postcode;
    };
    button.addEventListener('click',commit);
    input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit()}});
    return true;
  };
  if(!bind()){
    let tries=0;
    const timer=setInterval(()=>{if(bind()||++tries>80)clearInterval(timer)},100);
  }
})();