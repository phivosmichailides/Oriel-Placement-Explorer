'use strict';
(()=>{
  const DONE_KEY='phivos-onboarding-v1';
  const PROFILE_KEY='phivos-onboarding-profile-v1';
  const SESSION_SKIP='phivos-onboarding-skip-session';

  const css=`
  .onboardOverlay{position:fixed;inset:0;z-index:5000;background:rgba(20,27,23,.48);backdrop-filter:blur(9px);display:grid;place-items:center;padding:18px;animation:obFade .18s ease-out}
  .onboardCard{width:min(680px,100%);max-height:min(760px,92vh);overflow:auto;background:#fff;border:1px solid #dfe7e1;border-radius:26px;box-shadow:0 30px 90px rgba(18,32,24,.22);padding:26px;position:relative}
  .onboardClose{position:absolute;right:16px;top:14px;border:0;background:#f1f4f1;width:35px;height:35px;border-radius:50%;font-size:18px;color:#626963}
  .onboardSpark{font-size:34px;margin-bottom:8px}.onboardCard h2{font-size:31px;line-height:1.08;letter-spacing:-.035em;margin:4px 42px 10px 0}.onboardCard h3{font-size:23px;letter-spacing:-.025em;margin:8px 0}.onboardLead{font-size:15px;line-height:1.65;color:#56605a;max-width:570px;margin:0 0 18px}.onboardReassure{display:flex;gap:8px;align-items:flex-start;background:#f3f8f5;border:1px solid #dceae1;color:#405148;padding:11px 13px;border-radius:14px;font-size:12px;line-height:1.5;margin:15px 0}
  .onboardProgress{height:6px;background:#edf1ed;border-radius:999px;overflow:hidden;margin:4px 0 22px}.onboardProgress>span{display:block;height:100%;background:#164d3d;border-radius:999px;transition:width .2s ease}.onboardStepLabel{font-size:10px;font-weight:850;letter-spacing:.1em;color:#778078;text-transform:uppercase}
  .onboardChoices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0}.onboardChoice{border:1px solid #dfe5e0;background:#fbfcfb;border-radius:15px;padding:13px;text-align:left;min-height:66px;transition:.15s;display:flex;gap:10px;align-items:flex-start}.onboardChoice:hover{border-color:#9db8a8;background:#f6faf7}.onboardChoice.selected{border-color:#164d3d;background:#edf6f1;box-shadow:inset 0 0 0 1px #164d3d}.onboardChoice .emoji{font-size:21px;line-height:1.2}.onboardChoice b{display:block;font-size:13px}.onboardChoice small{display:block;color:#6c746f;font-size:11px;line-height:1.4;margin-top:3px}.onboardChoice.wide{grid-column:1/-1}
  .onboardFields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.onboardField{display:block}.onboardField span{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#69716c;margin:0 0 6px 2px}.onboardField select{width:100%;border:1px solid #dfe5e0;background:#fbfcfb;border-radius:13px;padding:12px}
  .onboardActions{display:flex;align-items:center;gap:8px;margin-top:22px}.onboardActions .spacer{flex:1}.onboardFine{font-size:11px;color:#7a817d;margin-top:9px}.onboardError{font-size:12px;color:#9a3e3e;margin-top:9px;min-height:17px}.onboardFinal{padding:10px 0 3px}.onboardSummary{display:flex;flex-wrap:wrap;gap:7px;margin:17px 0}.onboardSummary span{background:#eff5f1;border:1px solid #dce8df;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:700;color:#46554c}
  .personaliseAgain{margin-top:13px}.phivosSignature{margin-top:14px;font-family:"Snell Roundhand","Segoe Script","Brush Script MT",cursive;font-size:24px;letter-spacing:.02em;color:#52655b}.phivosSignature .heart{font-family:Georgia,serif;font-size:14px;vertical-align:4px;margin-left:3px;color:#8eaa99}
  @keyframes obFade{from{opacity:0}to{opacity:1}}
  @media(max-width:600px){.onboardCard{padding:21px 17px;border-radius:22px}.onboardCard h2{font-size:27px}.onboardChoices,.onboardFields{grid-template-columns:1fr}.onboardChoice.wide{grid-column:auto}.onboardActions{flex-wrap:wrap}.onboardActions .spacer{display:none}.onboardActions .btn{flex:1}.onboardActions .textbtn{flex-basis:100%;order:3}}
  `;

  const ready=()=>{
    try{return typeof state!=='undefined'&&typeof placements!=='undefined'&&placements.length&&typeof save==='function'&&document.getElementById('region');}catch{return false;}
  };

  const install=()=>{
    if(!ready()||window.__onboardingInstalled)return false;
    window.__onboardingInstalled=true;
    const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

    const footer=document.querySelector('.app-footer');
    if(footer&&!footer.querySelector('.phivosSignature'))footer.insertAdjacentHTML('beforeend','<div class="phivosSignature">made by Phivos <span class="heart">♡</span></div>');

    const prefsCard=document.querySelector('#prefs .settingsCard');
    if(prefsCard&&!document.getElementById('personaliseAgain')){
      const wrap=document.createElement('div');wrap.className='personaliseAgain';
      wrap.innerHTML='<button class="btn" id="personaliseAgain">✨ Personalise my desk again</button><div class="smallnote" style="margin-top:6px">Retake the quick setup whenever your priorities change.</div>';
      prefsCard.appendChild(wrap);
    }
    const introActions=document.querySelector('.introActions');
    if(introActions&&!document.getElementById('personaliseTop'))introActions.insertAdjacentHTML('beforeend','<button class="btn" id="personaliseTop">✨ Personalise for me</button>');

    const loadAnswers=()=>{
      try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')||null}catch{return null}
    };

    const defaultAnswers=()=>({region:'London',environment:'mixed',priorities:[],salary:'',hours:'40',community:'less'});

    const openSetup=(force=false)=>{
      if(document.querySelector('.onboardOverlay'))return;
      let answers={...defaultAnswers(),...(loadAnswers()||{})};
      answers.priorities=Array.isArray(answers.priorities)?answers.priorities:[];
      let step=-1;
      const overlay=document.createElement('div');overlay.className='onboardOverlay';overlay.setAttribute('role','presentation');
      const card=document.createElement('div');card.className='onboardCard';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Personalise your Placement Desk');overlay.appendChild(card);document.body.appendChild(overlay);
      const close=()=>{overlay.remove();try{sessionStorage.setItem(SESSION_SKIP,'1')}catch{}};
      overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
      document.addEventListener('keydown',function escClose(e){if(e.key==='Escape'&&document.body.contains(overlay)){close();document.removeEventListener('keydown',escClose)}});

      const regions=[...new Set(placements.map(p=>p.region).filter(Boolean))].sort((a,b)=>a==='London'?-1:b==='London'?1:a.localeCompare(b));
      const choice=(value,emoji,title,desc,selected,wide=false)=>`<button type="button" class="onboardChoice ${selected?'selected':''} ${wide?'wide':''}" data-value="${esc(value)}"><span class="emoji">${emoji}</span><span><b>${title}</b>${desc?`<small>${desc}</small>`:''}</span></button>`;
      const progress=()=>step<0?0:Math.min(100,(step+1)/5*100);

      const render=()=>{
        if(step===-1){
          card.innerHTML=`<button class="onboardClose" aria-label="Close">×</button><div class="onboardSpark">✨</div><div class="onboardStepLabel">A tiny setup before we start</div><h2>Let’s learn a bit more about you!</h2><p class="onboardLead">There are thousands of Oriel programmes, so instead of making you stare at all of them equally, I can use a few quick answers to make the map, recommendations and fit scores feel much more like <i>your</i> search.</p><div class="onboardReassure"><span>♡</span><span><b>Nothing here is permanent.</b> You can change every answer later in Preferences, retake this setup, or ignore the recommendations completely.</span></div><div class="onboardActions"><button class="btn primary" id="obStart">Okay, personalise it ✨</button><span class="spacer"></span><button class="textbtn" id="obLater">Maybe later</button></div><div class="onboardFine">About 30 seconds. No account or extra data is sent anywhere — your choices stay in this browser.</div>`;
          card.querySelector('.onboardClose').onclick=close;card.querySelector('#obLater').onclick=close;card.querySelector('#obStart').onclick=()=>{step=0;render()};return;
        }

        let body='';
        if(step===0){
          body=`<div class="onboardStepLabel">1 of 5 · Location</div><h3>Where are you actually looking?</h3><p class="onboardLead">This becomes your starting region, but you can still explore anywhere in the England & Wales dataset.</p><div class="onboardChoices">${regions.map(r=>choice(r,'📍',r,'',answers.region===r)).join('')}${choice('','🌍','Show me all regions','Start broad and narrow it down later.',answers.region==='',true)}</div>`;
        }else if(step===1){
          const opts=[['hospital','🏥','Hospital','Clinical exposure, wards and specialist services.'],['gp','🩺','General Practice','Primary care, medicines optimisation and more independent work.'],['mixed','🔀','A good mix','I want meaningful exposure across more than one setting.'],['industry','🧪','Industry / research / data','Transferable experience, research, digital or industry exposure.'],['community','💊','Community','Patient-facing community pharmacy is genuinely my thing.'],['unsure','🤷','I’m not sure yet','Keep the recommendations broad while I figure it out.']];
          body=`<div class="onboardStepLabel">2 of 5 · Pharmacy</div><h3>What kind of environment sounds most like you?</h3><p class="onboardLead">This changes the weighting — it won’t completely hide the other options.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.environment===x[0])).join('')}</div>`;
        }else if(step===2){
          const opts=[['money','💷','Pay','I want strong salary/value.'],['lifestyle','🧘','Work-life balance','Hours and day-to-day quality matter a lot.'],['progression','🚀','Career value','I want experience that opens doors afterwards.'],['location','📍','Location','Where I live/work matters to my quality of life.'],['independence','🎧','Independence','I prefer autonomy, quieter work or desk-friendly tasks.'],['clinical','🧠','Clinical variety','I want broad, interesting clinical exposure.']];
          body=`<div class="onboardStepLabel">3 of 5 · Priorities</div><h3>What matters most to you?</h3><p class="onboardLead">Pick up to three. These get extra weight in your fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.priorities.includes(x[0]))).join('')}</div><div class="onboardError" id="obError"></div>`;
        }else if(step===3){
          body=`<div class="onboardStepLabel">4 of 5 · Practical stuff</div><h3>Any hard-ish limits?</h3><p class="onboardLead">These are filters, not personality traits — leave either one broad if you don’t want it restricting your results.</p><div class="onboardFields"><label class="onboardField"><span>Minimum salary</span><select id="obSalary"><option value="">No minimum</option><option value="26000">£26k+</option><option value="28000">£28k+</option><option value="30000">£30k+</option><option value="32000">£32k+</option><option value="36000">£36k+</option></select></label><label class="onboardField"><span>Maximum weekly hours</span><select id="obHours"><option value="">I’m flexible</option><option value="35">≤35h</option><option value="37.5">≤37.5h</option><option value="40">≤40h</option><option value="42.5">≤42.5h</option></select></label></div><div class="onboardReassure"><span>↺</span><span>You can loosen these later if the results become too narrow.</span></div>`;
        }else if(step===4){
          const opts=[['happy','💊','Happy with community','I’m comfortable with a community-heavy programme.'],['some','🙂','Some is fine','I’m happy to have it as part of a mixed programme.'],['less','🌿','Prefer less community','I’d rather hospital/GP/other settings take the lead.'],['avoid','🙅','Avoid community-heavy','Strongly push community-heavy programmes down my recommendations.']];
          body=`<div class="onboardStepLabel">5 of 5 · One last thing</div><h3>How do you feel about community pharmacy exposure?</h3><p class="onboardLead">This changes how strongly community-heavy programmes are penalised in your personal fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.community===x[0])).join('')}</div>`;
        }else{
          const labels={hospital:'Hospital',gp:'GP',mixed:'Mixed settings',industry:'Industry / research',community:'Community',unsure:'Still exploring',happy:'Community welcome',some:'Some community',less:'Less community',avoid:'Avoid community-heavy'};
          body=`<div class="onboardFinal"><div class="onboardSpark">💚</div><div class="onboardStepLabel">You’re ready</div><h2>Perfect — I’ve got you.</h2><p class="onboardLead">I’ll use this as a starting point for your fit scores and recommendations. It’s guidance, not a final ranking, and you can change your mind whenever you want.</p><div class="onboardSummary"><span>📍 ${esc(answers.region||'All regions')}</span><span>💊 ${esc(labels[answers.environment]||answers.environment)}</span>${answers.priorities.map(x=>`<span>✨ ${esc(x)}</span>`).join('')}${answers.salary?`<span>💷 £${Number(answers.salary).toLocaleString()}+</span>`:''}${answers.hours?`<span>⏱️ ≤${esc(answers.hours)}h</span>`:''}<span>🛍️ ${esc(labels[answers.community]||answers.community)}</span></div></div>`;
        }

        const final=step===5;
        card.innerHTML=`<button class="onboardClose" aria-label="Close">×</button><div class="onboardProgress"><span style="width:${progress()}%"></span></div>${body}<div class="onboardActions">${step>0&&!final?'<button class="btn" id="obBack">← Back</button>':''}${step===0?'<button class="btn" id="obBackIntro">← Back</button>':''}<span class="spacer"></span>${!final?'<button class="btn primary" id="obNext">Continue →</button>':'<button class="btn primary" id="obFinish">Show my matches ✨</button>'}</div><div class="onboardFine">You can change all of this later under Preferences.</div>`;
        card.querySelector('.onboardClose').onclick=close;

        if(step===0){
          card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.region=b.dataset.value;render()});
          card.querySelector('#obBackIntro').onclick=()=>{step=-1;render()};
        }
        if(step===1){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.environment=b.dataset.value;render()});}
        if(step===2){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{const v=b.dataset.value;const i=answers.priorities.indexOf(v);if(i>=0)answers.priorities.splice(i,1);else if(answers.priorities.length<3)answers.priorities.push(v);else{const er=card.querySelector('#obError');if(er)er.textContent='Pick up to three — you can still adjust every weight later.';return;}render()});}
        if(step===3){const sal=card.querySelector('#obSalary'),hrs=card.querySelector('#obHours');sal.value=answers.salary;hrs.value=answers.hours;sal.onchange=()=>answers.salary=sal.value;hrs.onchange=()=>answers.hours=hrs.value;}
        if(step===4){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.community=b.dataset.value;render()});}
        if(card.querySelector('#obBack'))card.querySelector('#obBack').onclick=()=>{step--;render()};
        if(card.querySelector('#obNext'))card.querySelector('#obNext').onclick=()=>{step++;render()};
        if(final)card.querySelector('#obFinish').onclick=()=>finish();
      };

      const finish=()=>{
        const weights={money:3,hospital:2,gp:2,lifestyle:3,location:3,progression:3,independence:3,communityPenalty:3};
        if(answers.environment==='hospital'){weights.hospital=5;weights.gp=2;weights.progression=4;weights.communityPenalty=4;}
        else if(answers.environment==='gp'){weights.gp=5;weights.hospital=2;weights.independence=4;weights.communityPenalty=3;}
        else if(answers.environment==='mixed'){weights.hospital=4;weights.gp=4;weights.progression=4;weights.communityPenalty=2;}
        else if(answers.environment==='industry'){weights.hospital=1;weights.gp=1;weights.progression=5;weights.independence=5;weights.communityPenalty=3;}
        else if(answers.environment==='community'){weights.hospital=1;weights.gp=1;weights.lifestyle=4;weights.communityPenalty=0;}
        else {weights.hospital=3;weights.gp=3;weights.progression=4;weights.communityPenalty=2;}

        answers.priorities.forEach(p=>{
          if(p==='money')weights.money=5;
          if(p==='lifestyle')weights.lifestyle=5;
          if(p==='progression')weights.progression=5;
          if(p==='location')weights.location=5;
          if(p==='independence')weights.independence=5;
          if(p==='clinical'){weights.hospital=Math.max(weights.hospital,4);weights.gp=Math.max(weights.gp,4);}
        });
        weights.communityPenalty={happy:0,some:2,less:4,avoid:5}[answers.community]??3;
        state.prefs.weights={...state.prefs.weights,...weights};
        state.prefs.onboarding={...answers};
        save();
        try{localStorage.setItem(PROFILE_KEY,JSON.stringify(answers));localStorage.setItem(DONE_KEY,'1');sessionStorage.removeItem(SESSION_SKIP)}catch{}

        try{renderAll()}catch{}
        setTimeout(()=>{
          try{
            quick.delete('london');
            document.querySelector('[data-q="london"]')?.classList.remove('on');
            const r=$('region'),sal=$('salary'),hrs=$('hours');
            if(r)r.value=answers.region||'';
            if(sal)sal.value=answers.salary||'';
            if(hrs)hrs.value=answers.hours||'';
            pageLimit=40;
            if(r)r.dispatchEvent(new Event('change'));
            else {explore();stats();reco();drawMap(placements.filter(matches));}
            document.querySelector('[data-tab="foryou"]')?.click();
          }catch{}
        },0);
        overlay.remove();toast('Your Placement Desk is personalised ✨');
      };

      render();
    };

    document.getElementById('personaliseAgain')?.addEventListener('click',()=>openSetup(true));
    document.getElementById('personaliseTop')?.addEventListener('click',()=>openSetup(true));
    let done=false,skipped=false;try{done=localStorage.getItem(DONE_KEY)==='1';skipped=sessionStorage.getItem(SESSION_SKIP)==='1'}catch{}
    if(!done&&!skipped)setTimeout(()=>openSetup(false),350);
    return true;
  };

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
})();
