'use strict';
(()=>{
  const C=window.DeskResearchCore,KEY='oriel-research-v1';
  if(!C)return;
  let study=null,panel;
  try{const raw=localStorage.getItem(KEY);if(raw)study=C.validate(JSON.parse(raw));}catch{}
  const persist=()=>{if(!study)return;study.exportedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(study))}catch{if(panel)panel.querySelector('[role=status]').textContent='Study storage is unavailable. Keep this page open and export your results before leaving.';}};
  function updateSummary(){
    if(!panel)return;
    const active=!!study;panel.querySelector('#studyJoin').hidden=true;panel.querySelector('#studyActive').hidden=!active;
    if(!active)return;
    const s=C.summary(study,Date.now());
    panel.querySelector('#studySummary').textContent=`${study.truncated?'Event limit reached; this log is excluded from experiment analysis. ':''}${study.mode==='qa'?'QA only · ':''}${study.cohort==='new'?'New-visitor':'Returning-visitor'} study · ${s.activated?'First shortlist saved after '+s.seconds+' seconds':s.pending?'30-minute activation window still open':'No shortlist saved within 30 minutes'} · ${s.compared?'Comparison viewed':'Comparison not yet viewed'}. Results describe this browser only.`;
  }
  function applyVariant(){
    document.querySelectorAll('[data-action="prefer"]').forEach(button=>{
      const selected=button.classList.contains('selected');
      button.textContent=selected?'Remove from shortlist':'Add to shortlist';
      button.classList.toggle('primary',!selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  function install(){
    if(panel||!window.__genericPublicInstalled||!document.querySelector('#prefs'))return;
    panel=document.createElement('details');panel.className='researchPanel card';panel.id='research';
    panel.innerHTML=`<summary>Help improve this desk</summary>
      <p>The shortlist-button experiment is paused following usability feedback. Everyone now sees “Add to shortlist”. No new study activity is recorded. You can still export or delete previous results, or review previously exported sessions below.</p>
      <div id="studyJoin" hidden><input type="checkbox" id="studyConsent" hidden></div>
      <div id="studyActive" hidden><p id="studySummary"></p><div class="researchActions"><button class="btn primary" id="studyExport">Export previous study results</button><button class="btn danger" id="studyStop">Delete previous study results</button></div></div>
      <div role="status" aria-live="polite"></div>
      <details><summary>Researcher: review exported sessions</summary><p>Import results shared voluntarily by testers. Files are read locally and are not uploaded or saved here. Keep the latest export for each tester. Repeat exports with the same browser ID are deduplicated. QA, returning visitors and truncated logs are excluded from the experiment table.</p><label class="field"><span>Study JSON files (up to 100, 2 MB each)</span><input id="studyImport" type="file" accept=".json,application/json" multiple></label><div id="studyReport" aria-live="polite">No study results imported. No outcome or uplift has been established.</div></details>`;
    document.querySelector('#prefs').appendChild(panel);
    const footer=document.querySelector('.app-footer');
    const button=document.createElement('button');button.className='textbtn';button.textContent='Help improve this desk';button.onclick=()=>{switchTab('prefs');panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('summary').focus()};footer?.appendChild(button);
    const status=message=>panel.querySelector('[role=status]').textContent=message;
    panel.querySelector('#studyExport').onclick=()=>{if(!study)return;persist();download(`oriel-study-${study.id}.json`,JSON.stringify(study,null,2),'application/json');status('Results exported. Share the file with your researcher only if you choose.');};
    panel.querySelector('#studyStop').onclick=()=>{
      if(!confirm('Delete this browser’s study results and stop recording? Your shortlist and preferences will stay.'))return;
      study=null;localStorage.removeItem(KEY);applyVariant();updateSummary();panel.querySelector('#studyConsent').checked=false;status('Study recording stopped and local study results deleted.');
    };
    panel.querySelector('#studyImport').onchange=async e=>{
      const output=panel.querySelector('#studyReport');try{
        const files=[...e.target.files];if(files.length>100||files.some(f=>f.size>2*1024*1024))throw Error('Choose up to 100 files, each smaller than 2 MB.');
        const data=files.length?C.aggregate(await Promise.all(files.map(async f=>JSON.parse(await f.text())))):null;
        if(!data){output.textContent='No results imported.';return;}
        output.innerHTML=`<p>${data.unique} distinct browser IDs · ${data.excluded} excluded. Descriptive results only; no winner declared. Pending participants have not completed their 30-minute observation window.</p><div class="researchTableWrap"><table class="researchTable"><caption>New-visitor activation · shortlist saved within 30 minutes of enrolment</caption><thead><tr><th>Button</th><th>Enrolled</th><th>Exposed</th><th>Pending</th><th>Activated / assessable</th><th>Median seconds among activated</th><th>Returned in days 7–13 / eligible</th></tr></thead><tbody>${data.arms.map(a=>`<tr><th>${a.variant==='clear'?'Save to shortlist':'Prefer'}</th><td>${a.enrolled}</td><td>${a.exposed}</td><td>${a.pending}</td><td>${a.activated} / ${a.assessable}</td><td>${a.medianSeconds??'—'}</td><td>${a.returned} / ${a.returnEligible}</td></tr>`).join('')}</tbody></table></div><p>Export selection can bias these figures. Compare against your recruitment log; never treat missing files as successes. Return-use figures require a fresh export at least 14 days after enrolment.</p>`;
      }catch(error){output.textContent=`Could not import results: ${error.message}`;}finally{e.target.value='';}
    };
    const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))applyVariant();});
    ['results','shortlistList','mapSelection'].forEach(id=>observer.observe(document.getElementById(id),{childList:true,subtree:true}));
    updateSummary();applyVariant();
    if(new URLSearchParams(location.search).has('study')){switchTab('prefs');panel.open=true;panel.scrollIntoView({block:'start'});}
  }
  document.addEventListener('desk:ready',()=>setTimeout(install,250));
  let attempts=0;const timer=setInterval(()=>{install();if(panel||++attempts>150)clearInterval(timer);},100);
})();
