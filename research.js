'use strict';
(()=>{
  const C=window.DeskResearchCore,KEY='oriel-research-v1';
  if(!C)return;
  let study=null,session=crypto.randomUUID(),panel,exposureObserver;
  try{session=sessionStorage.getItem('oriel-study-session')||session;sessionStorage.setItem('oriel-study-session',session);const raw=localStorage.getItem(KEY);if(raw)study=C.validate(JSON.parse(raw));}catch{}
  const persist=()=>{if(!study)return;study.exportedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(study))}catch{if(panel)panel.querySelector('[role=status]').textContent='Study storage is unavailable. Keep this page open and export your results before leaving.';}};
  function renewSession(){session=crypto.randomUUID();try{sessionStorage.setItem('oriel-study-session',session)}catch{}}
  function track(name,props){
    if(!study)return;
    const now=Date.now(),last=study.events.at(-1);
    if(name!=='session_started'&&last&&now-last.at>=C.WINDOW){renewSession();C.record(study,'session_started',{},now,session);}
    if(C.record(study,name,props,now,session)||study.truncated){persist();updateSummary();}
  }
  document.addEventListener('desk:action',e=>track(e.detail.name,e.detail));
  if(study?.events.length&&Date.now()-study.events.at(-1).at>=C.WINDOW)renewSession();
  if(study&&!study.events.some(e=>e.name==='session_started'&&e.session===session))track('session_started');
  function updateSummary(){
    if(!panel)return;
    const active=!!study;panel.querySelector('#studyJoin').hidden=active;panel.querySelector('#studyActive').hidden=!active;
    if(!active)return;
    const s=C.summary(study,Date.now());
    panel.querySelector('#studySummary').textContent=`${study.truncated?'Event limit reached; this log is excluded from experiment analysis. ':''}${study.mode==='qa'?'QA only · ':''}${study.cohort==='new'?'New-visitor':'Returning-visitor'} study · ${s.activated?'First shortlist saved after '+s.seconds+' seconds':s.pending?'30-minute activation window still open':'No shortlist saved within 30 minutes'} · ${s.compared?'Comparison viewed':'Comparison not yet viewed'}. Results describe this browser only.`;
  }
  function applyVariant(){
    const clear=study?.variant==='clear';
    document.querySelectorAll('[data-action="prefer"]').forEach(button=>{
      const selected=button.classList.contains('selected');
      button.textContent=clear?(selected?'✓ Saved · undo':'Save to shortlist'):(selected?'✓ Preferred':'♡ Prefer');
      button.classList.toggle('primary',!!clear&&!selected);
      if(study?.events.length&&Date.now()-study.events.at(-1).at>=C.WINDOW)renewSession();
  if(study&&!study.events.some(e=>e.name==='experiment_exposed'))exposureObserver?.observe(button);
    });
  }
  function install(){
    if(panel||!window.__genericPublicInstalled||!document.querySelector('#prefs'))return;
    panel=document.createElement('details');panel.className='researchPanel card';panel.id='research';
    panel.innerHTML=`<summary>Help improve this desk</summary>
      <p>Can you find a programme you would seriously consider? Join an optional usability study, try the desk, then export a small results file to share with the researcher yourself.</p>
      <div id="studyJoin"><p>The study records action names, timestamps, a random browser ID, button version and your two feedback answers. It does <b>not</b> record programme IDs, searches, postcodes, preferences, notes or uploaded files. Nothing is automatically sent to the researcher. Results stay in this browser until you choose to export and share them.</p>
      <p>You will be randomly shown one of two shortlist buttons. Assignment stays the same on return visits. Stopping deletes local study results, but cannot delete files you already shared.</p>
      <label class="researchConsent"><input type="checkbox" id="studyConsent"> I agree to this local study recording and understand the button experiment.</label>
      <button class="btn primary" id="studyStart">Join study and personalise</button></div>
      <div id="studyActive" hidden><p id="studySummary"></p><p>Task: set your priorities, find a programme worth considering, save it, compare two options, and export your shortlist. Stop wherever you get stuck; an incomplete task is useful feedback too.</p>
      <label class="field"><span>How easy was it to find an option worth considering?</span><select id="studyEase"><option value="">Choose an answer</option><option value="1">1 — Very difficult</option><option value="2">2 — Difficult</option><option value="3">3 — Neither</option><option value="4">4 — Easy</option><option value="5">5 — Very easy</option></select></label>
      <label class="field"><span>Did you find an option you would seriously consider?</span><select id="studyOutcome"><option value="">Choose an answer</option><option value="yes">Yes</option><option value="partly">Partly / unsure</option><option value="no">No</option></select></label>
      <div class="researchActions"><button class="btn" id="studyFeedback">Save feedback</button><button class="btn primary" id="studyExport">Export my study results</button><button class="btn danger" id="studyStop">Stop study and delete results</button></div>
      <p class="smallnote">Export even if you could not finish. If possible, return and export again after 14 days to help measure return use. Reloads do not create new participants. This is a recruited study, not analytics for all visitors.</p></div>
      <div role="status" aria-live="polite"></div>
      <details><summary>Researcher: review exported sessions</summary><p>Import results shared voluntarily by testers. Files are read locally and are not uploaded or saved here. Keep the latest export for each tester. Repeat exports with the same browser ID are deduplicated. QA, returning visitors and truncated logs are excluded from the experiment table.</p><label class="field"><span>Study JSON files (up to 100, 2 MB each)</span><input id="studyImport" type="file" accept=".json,application/json" multiple></label><div id="studyReport" aria-live="polite">No study results imported. No outcome or uplift has been established.</div></details>`;
    document.querySelector('#prefs').appendChild(panel);
    const footer=document.querySelector('.app-footer');
    const button=document.createElement('button');button.className='textbtn';button.textContent='Help improve this desk';button.onclick=()=>{switchTab('prefs');panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('summary').focus()};footer?.appendChild(button);
    const status=message=>panel.querySelector('[role=status]').textContent=message;
    panel.querySelector('#studyStart').onclick=()=>{
      if(!panel.querySelector('#studyConsent').checked){status('Please tick the consent box before joining. You can use the desk without joining.');return;}
      const variant=crypto.getRandomValues(new Uint32Array(1))[0]<2147483648?'control':'clear';
      const cohort=state.prefs.onboarding&&localStorage.getItem('phivos-onboarding-v1')==='1'||Object.values(state.marks).some(m=>SHORT.has(m.status))?'returning':'new';
      study=C.create(crypto.randomUUID(),variant,cohort,new URLSearchParams(location.search).get('study')==='qa'?'qa':'study',Date.now());
      track('session_started');applyVariant();status('Study started. You can return here through Preferences.');document.getElementById('personaliseAgain')?.click();
    };
    panel.querySelector('#studyFeedback').onclick=()=>{
      const ease=Number(panel.querySelector('#studyEase').value),outcome=panel.querySelector('#studyOutcome').value;
      if(!ease||!outcome){status('Choose both answers before saving feedback.');return;}
      track('feedback',{ease,outcome});status('Feedback saved locally. Export your results when you are ready to share them.');
    };
    panel.querySelector('#studyExport').onclick=()=>{if(!study)return;persist();download(`oriel-study-${study.id}.json`,JSON.stringify(study,null,2),'application/json');status('Results exported. Share the file with your researcher only if you choose.');};
    panel.querySelector('#studyStop').onclick=()=>{
      if(!confirm('Delete this browser’s study results and stop recording? Your shortlist and preferences will stay.'))return;
      study=null;localStorage.removeItem(KEY);exposureObserver?.disconnect();applyVariant();updateSummary();panel.querySelector('#studyConsent').checked=false;status('Study recording stopped and local study results deleted.');
    };
    panel.querySelector('#studyImport').onchange=async e=>{
      const output=panel.querySelector('#studyReport');try{
        const files=[...e.target.files];if(files.length>100||files.some(f=>f.size>2*1024*1024))throw Error('Choose up to 100 files, each smaller than 2 MB.');
        const data=files.length?C.aggregate(await Promise.all(files.map(async f=>JSON.parse(await f.text())))):null;
        if(!data){output.textContent='No results imported.';return;}
        output.innerHTML=`<p>${data.unique} distinct browser IDs · ${data.excluded} excluded. Descriptive results only; no winner declared. Pending participants have not completed their 30-minute observation window.</p><div class="researchTableWrap"><table class="researchTable"><caption>New-visitor activation · shortlist saved within 30 minutes of enrolment</caption><thead><tr><th>Button</th><th>Enrolled</th><th>Exposed</th><th>Pending</th><th>Activated / assessable</th><th>Median seconds among activated</th><th>Returned in days 7–13 / eligible</th></tr></thead><tbody>${data.arms.map(a=>`<tr><th>${a.variant==='clear'?'Save to shortlist':'Prefer'}</th><td>${a.enrolled}</td><td>${a.exposed}</td><td>${a.pending}</td><td>${a.activated} / ${a.assessable}</td><td>${a.medianSeconds??'—'}</td><td>${a.returned} / ${a.returnEligible}</td></tr>`).join('')}</tbody></table></div><p>Export selection can bias these figures. Compare against your recruitment log; never treat missing files as successes. Return-use figures require a fresh export at least 14 days after enrolment.</p>`;
      }catch(error){output.textContent=`Could not import results: ${error.message}`;}finally{e.target.value='';}
    };
    if('IntersectionObserver' in window)exposureObserver=new IntersectionObserver(entries=>{if(study&&entries.some(e=>e.isIntersecting)){track('experiment_exposed');exposureObserver.disconnect();}},{threshold:0.5});
    const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))applyVariant();});
    ['results','shortlistList','mapSelection'].forEach(id=>observer.observe(document.getElementById(id),{childList:true,subtree:true}));
    updateSummary();applyVariant();
    if(new URLSearchParams(location.search).has('study')){switchTab('prefs');panel.open=true;panel.scrollIntoView({block:'start'});}
  }
  document.addEventListener('desk:ready',()=>setTimeout(install,250));
  let attempts=0;const timer=setInterval(()=>{install();if(panel||++attempts>150)clearInterval(timer);},100);
})();
