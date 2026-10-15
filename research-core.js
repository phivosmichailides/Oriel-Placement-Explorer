/* Pure study logic, shared by the browser and node:test. No network or app state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeskResearchCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const EXPERIMENT='shortlist-cta-v1',WINDOW=30*60*1000;
  const EVENTS=new Set(['session_started','onboarding_started','onboarding_skipped','onboarding_step_completed','onboarding_completed','matches_viewed','programme_opened','experiment_exposed','shortlist_added','shortlist_removed','comparison_viewed','shortlist_exported','feedback']);
  function create(id,variant,cohort,mode,now){return{schema:1,experiment:EXPERIMENT,id,variant,cohort,mode,startedAt:now,events:[],truncated:false};}
  function record(study,name,props={},now=Date.now(),session='session'){
    if(!study||!EVENTS.has(name))return false;
    if(study.events.length>=5000){study.truncated=true;return false;}
    const event={name,at:Math.max(now,study.startedAt),session};
    if(name==='onboarding_step_completed'&&Number.isInteger(props.step)&&props.step>=1&&props.step<=5)event.step=props.step;
    if(name==='feedback'){
      if(!Number.isInteger(props.ease)||props.ease<1||props.ease>5||!['yes','partly','no'].includes(props.outcome))return false;
      event.ease=props.ease;event.outcome=props.outcome;
    }
    study.events.push(event);return true;
  }
  function validate(input){
    if(!input||input.schema!==1||input.experiment!==EXPERIMENT||!/^[-a-zA-Z0-9]{8,80}$/.test(input.id)||!['control','clear'].includes(input.variant)||!['new','returning'].includes(input.cohort)||!['study','qa'].includes(input.mode)||!Number.isFinite(input.startedAt)||!Number.isFinite(input.exportedAt)||input.exportedAt<input.startedAt||!Array.isArray(input.events)||input.events.length>5000)throw Error('Not a supported Placement Desk study export.');
    const clean=create(input.id,input.variant,input.cohort,input.mode,input.startedAt);clean.exportedAt=input.exportedAt;clean.truncated=input.truncated===true;
    for(const event of input.events){
      if(!event||!EVENTS.has(event.name)||!Number.isFinite(event.at)||event.at<input.startedAt||event.at>input.exportedAt||typeof event.session!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(event.session))throw Error('Invalid study event.');
      if(!record(clean,event.name,event,event.at,event.session))throw Error('Invalid study answer.');
    }
    return clean;
  }
  function summary(s,now=s.exportedAt||Date.now()){
    const first=name=>s.events.filter(e=>e.name===name).sort((a,b)=>a.at-b.at)[0];
    const saved=first('shortlist_added'),activated=!!saved&&saved.at-s.startedAt<=WINDOW;
    const later=s.events.some(e=>e.name==='session_started'&&e.at-s.startedAt>=7*86400000&&e.at-s.startedAt<14*86400000);
    return{activated,pending:!activated&&now-s.startedAt<WINDOW,seconds:activated?Math.round((saved.at-s.startedAt)/1000):null,exposed:!!first('experiment_exposed'),onboarded:!!first('onboarding_completed'),compared:!!first('comparison_viewed'),exported:!!first('shortlist_exported'),returnEligible:now-s.startedAt>=14*86400000,returned:later,feedback:s.events.filter(e=>e.name==='feedback').at(-1)||null};
  }
  function aggregate(inputs){
    const unique=new Map();for(const input of inputs){const s=validate(input),old=unique.get(s.id);if(!old||s.exportedAt>old.exportedAt)unique.set(s.id,s);}
    const all=[...unique.values()],eligible=all.filter(s=>s.mode==='study'&&s.cohort==='new'&&!s.truncated);
    const arms=['control','clear'].map(variant=>{
      const rows=eligible.filter(s=>s.variant===variant).map(s=>summary(s)),completed=rows.filter(s=>!s.pending),times=rows.filter(s=>s.activated).map(s=>s.seconds).sort((a,b)=>a-b),n=times.length;
      return{variant,enrolled:rows.length,pending:rows.length-completed.length,assessable:completed.length,activated:rows.filter(s=>s.activated).length,exposed:rows.filter(s=>s.exposed).length,medianSeconds:n?(times[Math.floor((n-1)/2)]+times[Math.floor(n/2)])/2:null,returnEligible:rows.filter(s=>s.returnEligible).length,returned:rows.filter(s=>s.returnEligible&&s.returned).length};
    });
    return{unique:all.length,excluded:all.length-eligible.length,arms};
  }
  return{EXPERIMENT,WINDOW,create,record,validate,summary,aggregate};
});
