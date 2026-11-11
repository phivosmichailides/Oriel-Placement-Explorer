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
  .onboardField input{width:100%;border:1px solid #dfe5e0;background:#fbfcfb;border-radius:13px;padding:12px;color:#29332d}.onboardHomeBase{margin:15px 0 4px;padding:14px 15px;border:1px solid #dce7df;background:#f7faf7;border-radius:16px}.onboardHomeBase>p{font-size:11px;line-height:1.5;color:#647169;margin:8px 2px 0}.onboardHomeBase .onboardError{margin-top:5px}
  .onboardActions{display:flex;align-items:center;gap:8px;margin-top:22px}.onboardActions .spacer{flex:1}.onboardFine{font-size:11px;color:#7a817d;margin-top:9px}.onboardError{font-size:12px;color:#9a3e3e;margin-top:9px;min-height:17px}.onboardFinal{padding:10px 0 3px}.onboardSummary{display:flex;flex-wrap:wrap;gap:7px;margin:17px 0}.onboardSummary span{background:#eff5f1;border:1px solid #dce8df;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:700;color:#46554c}
  .personaliseAgain{margin-top:13px}.phivosSignature{margin-top:14px;display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-family:"Plus Jakarta Sans",Inter,ui-sans-serif,system-ui,sans-serif;font-size:10px;line-height:1.5;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--mut)}.phivosSignature i{width:4px;height:4px;border-radius:50%;background:var(--ux-accent);display:inline-block}

  /* Palette and brightness choices follow the same six app themes. */
  .onboardCard{background:var(--panel);color:var(--ink);border-color:var(--line)}
  .onboardCard h2,.onboardCard h3{color:var(--ink)}
  .onboardLead,.onboardFine{color:var(--mut)}
  .onboardChoice,.onboardField input,.onboardField select,.onboardHomeBase,.onboardReassure{
    background:var(--soft);color:var(--ink);border-color:var(--line)
  }
  .onboardChoice small,.onboardHomeBase>p{color:var(--mut)}
  .onboardChoice.selected{border-color:var(--ux-accent);background:var(--ux-accent-soft);box-shadow:inset 0 0 0 1px var(--ux-accent)}
  .onboardClose{background:var(--soft);color:var(--ink)}
  .onboardProgress{background:var(--soft)}
  .onboardProgress>span{background:var(--ux-accent)}
  .onboardLookLabel{font-size:12px;font-weight:850;margin:20px 0 9px;color:var(--ink)}
  .onboardPaletteChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
  .onboardPaletteChoice,.onboardModeChoices button{
    min-height:64px;display:flex;align-items:center;justify-content:center;gap:9px;
    padding:10px;border:1px solid var(--line);border-radius:14px;
    background:var(--soft);color:var(--ink);font-size:13px;cursor:pointer
  }
  .onboardPaletteChoice[aria-pressed="true"],.onboardModeChoices button[aria-pressed="true"]{
    border:2px solid var(--ux-accent);background:var(--ux-accent-soft);
  }
  .onboardPaletteSwatch{width:23px;height:23px;border-radius:50%;background:var(--ob-swatch);flex:none}
  .onboardModeChoices{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .onboardSyncOverlay{position:fixed;inset:0;z-index:5100;display:grid;place-items:center;padding:18px;background:#10121ac0}
  .onboardSyncDialog{display:grid;gap:12px;width:min(420px,100%);border-radius:22px;padding:25px;background:var(--panel);color:var(--ink);border:1px solid var(--line);box-shadow:0 25px 70px #0003}
  .onboardSyncDialog h2{margin:0;font-size:24px;line-height:1.2}
  .onboardSyncDialog p{color:var(--mut);font-size:14px;line-height:1.6;margin:0}
  .onboardSyncDialog .textbtn{justify-self:center;color:var(--mut)}
  @media(max-width:520px){.onboardPaletteChoices{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @keyframes obFade{from{opacity:0}to{opacity:1}}
  @media(max-width:600px){.onboardCard{padding:21px 17px;border-radius:22px}.onboardCard h2{font-size:27px}.onboardChoices,.onboardFields{grid-template-columns:1fr}.onboardChoice.wide{grid-column:auto}.onboardActions{flex-wrap:wrap}.onboardActions .spacer{display:none}.onboardActions .btn{flex:1}.onboardActions .textbtn{flex-basis:100%;order:3}}
  /* Compact, no-scroll quiz layout. Single-choice steps advance immediately;
     only the multi-select and practical-details steps expose Continue. */
  .onboardCard{width:min(680px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:hidden;padding:clamp(16px,2.4vh,24px);display:flex;flex-direction:column}
  .onboardCard h3{font-size:clamp(18px,2.15vh,23px);line-height:1.2;margin:5px 42px 7px 0}
  .onboardLead{font-size:13px;line-height:1.45;margin:0 0 10px}
  .onboardProgress{margin:4px 0 12px}
  .onboardChoices{gap:7px;margin:10px 0}
  .onboardChoice{min-height:48px;padding:9px 11px;border-radius:12px}
  .onboardChoice small{font-size:10px;line-height:1.35}
  .onboardHomeBase{margin:10px 0 2px;padding:10px 12px}
  .onboardHomeBase>p{font-size:10px;line-height:1.4}
  .onboardActions{margin-top:auto;padding-top:10px}
  @media(max-width:600px){.onboardCard{padding:16px 14px}.onboardChoices{grid-template-columns:repeat(2,minmax(0,1fr))}.onboardChoice.wide{grid-column:1/-1}.onboardFields{grid-template-columns:1fr 1fr}.onboardActions .btn{flex:1}}
  @media(max-height:720px){.onboardCard{padding:13px}.onboardCard h3{font-size:18px}.onboardLead{font-size:12px}.onboardChoice{min-height:42px;padding:7px 9px}.onboardChoices{gap:6px;margin:7px 0}.onboardHomeBase{margin:7px 0 0;padding:8px 10px}.onboardProgress{margin:3px 0 8px}}
  `;

  const ready=()=>{
    try{return typeof state!=='undefined'&&typeof placements!=='undefined'&&placements.length&&typeof save==='function'&&document.getElementById('region');}catch{return false;}
  };

  const install=()=>{
    if(!ready()||window.__onboardingInstalled)return false;
    window.__onboardingInstalled=true;
    const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

    const footer=document.querySelector('.app-footer');
    if(footer&&!footer.querySelector('.phivosSignature'))footer.insertAdjacentHTML('beforeend','<div class="phivosSignature"><span>Designed &amp; built by Phivos Michailides</span><i aria-hidden="true"></i><span>London, UK</span></div>');

    const prefsCard=document.querySelector('#prefs .settingsCard');
    if(prefsCard&&!document.getElementById('personaliseAgain')){
      const wrap=document.createElement('div');wrap.className='personaliseAgain';
      wrap.innerHTML='<button class="btn" id="personaliseAgain">Retake setup</button>';
      prefsCard.appendChild(wrap);
    }
    const introActions=document.querySelector('.introActions');


    const loadAnswers=()=>{
      try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')||null}catch{return null}
    };

    const paletteValues=['forest','copper','mauve','amber','cocoa','mono'];
    const getAppearance=()=>({
      palette:localStorage.getItem('oriel-desk-palette-v1')||document.documentElement.getAttribute('data-palette')||'mono',
      theme:document.documentElement.getAttribute('data-theme')||'light'
    });
    const defaultAnswers=()=>({region:'',environment:'',priorities:[],salary:'',hours:'',community:'',homePostcode:window.OrielCommuteProfile?.read?.()||'',...getAppearance()});
    const renderAppliedProfile=profile=>{
      const panel=document.getElementById('uxProfileApplied'),target=document.getElementById('uxProfileAppliedChips');
      if(!panel||!target)return;
      const p=profile||{},items=[];
      const environments={hospital:'Hospital-led',gp:'GP-focused',mixed:'Mixed / split settings',industry:'Industry / research',community:'Community',unsure:'Broad exploration'};
      const priorities={money:'Pay',lifestyle:'Work-life balance',progression:'Career progression',location:'Location',independence:'Independence',clinical:'Clinical variety'};
      if(p.region)items.push('Region · '+p.region);
      if(p.environment&&p.environment!=='unsure')items.push('Setting · '+(environments[p.environment]||p.environment));
      (Array.isArray(p.priorities)?p.priorities:[]).forEach(x=>{if(priorities[x])items.push('Priority · '+priorities[x])});
      if(p.salary)items.push('Minimum salary · £'+Number(p.salary).toLocaleString('en-GB'));
      if(p.hours)items.push('Hours · ≤'+p.hours+'h');
      if(p.community&&p.community!=='some')items.push('Community · '+({happy:'Welcome',less:'Prefer less',avoid:'Avoid community-heavy'}[p.community]||'Some'));
      const postcode=p.homePostcode||window.OrielCommuteProfile?.read?.()||'';
      if(postcode){const area=window.OrielCommuteProfile?.areaLabel?.(postcode)||postcode;items.push('Commute base · '+(area===postcode?area:area+' ('+postcode+')'));}
      target.replaceChildren();
      items.forEach(label=>{const chip=document.createElement('span');chip.className='uxProfileChip';chip.textContent='✓ '+label;target.append(chip)});
      panel.hidden=!items.length;
    };

    const openSetup=(force=false)=>{
      if(document.querySelector('.onboardOverlay'))return;
      document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'onboarding_started'}}));
      const previousFocus=document.activeElement;
      const startingAppearance=getAppearance();
      let appearanceSaved=false;
      let answers={...defaultAnswers()};
      answers.palette=paletteValues.includes(answers.palette)?answers.palette:startingAppearance.palette;
      answers.theme=['light','dark'].includes(answers.theme)?answers.theme:startingAppearance.theme;
      const applyAppearance=()=>{
        const root=document.documentElement;
        root.setAttribute('data-palette',answers.palette);
        try{localStorage.setItem('oriel-desk-palette-v1',answers.palette)}catch{}
        document.querySelectorAll('[data-ux-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.uxPalette===answers.palette)));
        const current=root.getAttribute('data-theme')||'light';
        if(current!==answers.theme)document.getElementById('themeToggle')?.click();
        document.dispatchEvent(new CustomEvent('desk:palette'));
      };
      if(!answers.homePostcode)answers.homePostcode=window.OrielCommuteProfile?.read?.()||'';
      answers.priorities=Array.isArray(answers.priorities)?answers.priorities:[];
      let step=-1;
      const overlay=document.createElement('div');overlay.className='onboardOverlay';overlay.setAttribute('role','presentation');
      const card=document.createElement('div');card.className='onboardCard';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Personalise Placement Atlas');overlay.appendChild(card);document.body.appendChild(overlay);
      const close=()=>{
        if(!appearanceSaved){
          answers.palette=startingAppearance.palette;answers.theme=startingAppearance.theme;
          applyAppearance();
        }
        document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'onboarding_skipped'}}));
        overlay.remove();previousFocus?.focus();try{localStorage.setItem(DONE_KEY,'1');sessionStorage.setItem(SESSION_SKIP,'1')}catch{}
      };
      overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
      overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const controls=[...card.querySelectorAll('button,select,input')].filter(x=>!x.disabled);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});

      const regions=[...new Set(placements.map(p=>p.region).filter(Boolean))].sort((a,b)=>a==='London'?-1:b==='London'?1:a.localeCompare(b));
      const regionNames={'east midlands':'East Midlands','east of england':'East of England','kent, surrey and sussex':'Kent, Surrey and Sussex','north east':'North East','north west':'North West','south west':'South West','thames valley':'Thames Valley','wales':'Wales','wessex':'Wessex','west midlands':'West Midlands','yorkshire and the humber':'Yorkshire and the Humber','london':'London'};
      const formatRegion=value=>regionNames[String(value||'').trim().toLowerCase()]||String(value||'').replace(/\b[a-z]/g,c=>c.toUpperCase());
      const choice=(value,_symbol,title,desc,selected,wide=false)=>`<button type="button" class="onboardChoice ${selected?'selected':''} ${wide?'wide':''}" data-value="${esc(value)}" aria-pressed="${selected}"><span><b>${title}</b>${desc?`<small>${desc}</small>`:''}</span></button>`;
      const progress=()=>step<0?0:Math.min(100,(step+1)/6*100);

      const render=()=>{
        card.dataset.palette=answers.palette;
        card.dataset.theme=answers.theme;
        queueMicrotask(()=>card.querySelector('.onboardChoice.selected, .onboardChoice, #obSalary, #obFinish, #obNext, #obStart, #obBack, .onboardClose')?.focus());
        if(step===-1){
          card.innerHTML=`<button class="onboardClose" aria-label="Close">×</button><div class="onboardStepLabel">PERSONALISE YOUR SEARCH</div><h2>What matters to you?</h2><p class="onboardLead">A few quick answers help prioritise programmes, locations and training settings that suit you.</p><div class="onboardReassure"><span><b>You stay in control.</b> Change your answers anytime in Preferences.</span></div><div class="onboardActions"><button class="btn primary" id="obStart">Set my preferences</button><span class="spacer"></span><button class="textbtn" id="obLater">Not now</button></div><div class="onboardFine">About 30 seconds. You can retake this setup later.</div>`;
          card.querySelector('.onboardClose').onclick=close;card.querySelector('#obLater').onclick=close;card.querySelector('#obStart').onclick=()=>{step=0;render()};return;
        }

        let body='';
        if(step===0){
          body=`<div class="onboardStepLabel">1 of 5 · Location</div><h3>Where are you looking?</h3><p class="onboardLead">Choose a region. You can broaden or change this later in Preferences.</p><div class="onboardChoices">${regions.map(r=>choice(r,'',formatRegion(r),'',answers.region===r)).join('')}${choice('','','Show me all regions','Start broad and narrow it down later.',false,true)}</div>`;
        }else if(step===1){
          const opts=[['hospital','','Hospital','Clinical exposure, wards and specialist services.'],['gp','','General Practice','Primary care, medicines optimisation and more independent work.'],['mixed','','A good mix','I want meaningful exposure across more than one setting.'],['industry','','Industry / research / data','Transferable experience, research, digital or industry exposure.'],['community','','Community','Patient-facing community pharmacy is genuinely my thing.'],['unsure','','I’m not sure yet','Keep the recommendations broad while I figure it out.']];
          body=`<div class="onboardStepLabel">2 of 5 · Pharmacy</div><h3> What kind of environment sounds most like you?</h3><p class="onboardLead">This changes the weighting — it won’t completely hide the other options.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.environment===x[0])).join('')}</div>`;
        }else if(step===2){
          const opts=[['money','','Pay','I want strong salary/value.'],['lifestyle','','Work-life balance','Hours and day-to-day quality matter a lot.'],['progression','','Career value','I want experience that opens doors afterwards.'],['location','','Location','Where I live/work matters to my quality of life.'],['independence','','Independence','I prefer autonomy, quieter work or desk-friendly tasks.'],['clinical','','Clinical variety','I want broad, interesting clinical exposure.']];
          body=`<div class="onboardStepLabel">3 of 5 · Priorities</div><h3> What matters most to you?</h3><p class="onboardLead">Pick up to three. These get extra weight in your fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.priorities.includes(x[0]))).join('')}</div><div class="onboardError" id="obError"></div>`;
        }else if(step===3){
          body=`<div class="onboardStepLabel">4 of 5 · Practical details</div><h3>Any practical limits?</h3><p class="onboardLead">Set a salary or hours preference, or leave either one flexible.</p><div class="onboardFields"><label class="onboardField"><span>Minimum salary</span><select id="obSalary"><option value="">No minimum</option><option value="26000">£26k+</option><option value="28000">£28k+</option><option value="30000">£30k+</option><option value="32000">£32k+</option><option value="36000">£36k+</option></select></label><label class="onboardField"><span>Maximum weekly hours</span><select id="obHours"><option value="">Flexible</option><option value="35">≤35h</option><option value="37.5">≤37.5h</option><option value="40">≤40h</option><option value="42.5">≤42.5h</option></select></label></div><div class="onboardHomeBase"><label class="onboardField"><span>Home area (optional)</span><input id="obHomePostcode" type="text" placeholder="e.g. E16 1RB or Canning Town" autocomplete="postal-code" maxlength="60"></label><p>Used only to estimate journeys from your home area to training sites. Saved in this browser; shared with TfL only when you request a journey estimate.</p><div class="onboardError" id="obHomePostcodeError"></div></div>`;
        }else if(step===4){
          const opts=[['happy','','Happy with community','I’m comfortable with a community-heavy programme.'],['some','','Some is fine','I’m happy to have it as part of a mixed programme.'],['less','','Prefer less community','I’d rather hospital/GP/other settings take the lead.'],['avoid','','Avoid community-heavy','Strongly push community-heavy programmes down my recommendations.']];
          body=`<div class="onboardStepLabel">5 of 5 · One last thing</div><h3> How do you feel about community pharmacy exposure?</h3><p class="onboardLead">This changes how strongly community-heavy programmes are penalised in your personal fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.community===x[0])).join('')}</div>`;
        }else{
          const colours=[['forest','Forest','#274333'],['copper','Copper','#3f6589'],['mauve','Mauve','#805e78'],
            ['amber','Amber','#c49348'],['cocoa','Cocoa','#695443'],['mono','Monochrome','#55575a']];
          body=`<div class="onboardStepLabel">6 of 6 · Make it yours</div>
            <h3>Choose your Placement Atlas look</h3>
            <p class="onboardLead">Choose your colour palette and light or dark appearance. The whole website, including this quiz, previews your choices instantly.</p>
            <div class="onboardLookLabel">Your colour theme</div>
            <div class="onboardPaletteChoices" role="group" aria-label="Choose colour palette">
             ${colours.map(([id,label,colour])=>`<button type="button" class="onboardPaletteChoice" data-ob-palette="${id}" aria-pressed="${answers.palette===id}">
               <span class="onboardPaletteSwatch" style="--ob-swatch:${colour}"></span><b>${label}</b>${answers.palette===id?'<span aria-hidden="true">✓</span>':''}
             </button>`).join('')}</div>
            <div class="onboardLookLabel">Appearance</div>
            <div class="onboardModeChoices" role="group" aria-label="Choose light or dark mode">
             <button type="button" data-ob-mode="light" aria-pressed="${answers.theme==='light'}"> Light</button>
             <button type="button" data-ob-mode="dark" aria-pressed="${answers.theme==='dark'}">Dark</button>
            </div><p class="onboardFine">You can change both later in Preferences.</p>`;
        }

        const final=step===5;
        card.innerHTML=`<button class="onboardClose" aria-label="Close">×</button><div class="onboardProgress"><span style="width:${progress()}%"></span></div>${body}<div class="onboardActions">${step>0?'<button class="btn" id="obBack">← Back</button>':''}${step===0?'<button class="btn" id="obBackIntro">← Back</button>':''}<span class="spacer"></span>${step===2||step===3?'<button class="btn primary" id="obNext">Continue →</button>':''}${final?'<button class="btn primary" id="obFinish">Done</button>':''}</div><div class="onboardFine">You can change all of this later under Preferences.</div>`;
        card.querySelector('.onboardClose').onclick=close;

        if(step===0){
          card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.region=b.dataset.value;step=1;render()});
          card.querySelector('#obBackIntro').onclick=()=>{step=-1;render()};
        }
        if(step===1){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.environment=b.dataset.value;step=2;render()});}
        if(step===2){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{const v=b.dataset.value;const i=answers.priorities.indexOf(v);if(i>=0)answers.priorities.splice(i,1);else if(answers.priorities.length<3)answers.priorities.push(v);else{const er=card.querySelector('#obError');if(er)er.textContent='Choose up to three priorities.';return;}render()});}
        if(step===3){
          const sal=card.querySelector('#obSalary'),hrs=card.querySelector('#obHours'),home=card.querySelector('#obHomePostcode');
          sal.value=answers.salary;hrs.value=answers.hours;
          sal.onchange=()=>answers.salary=sal.value;hrs.onchange=()=>answers.hours=hrs.value;
          if(home){home.value=answers.homePostcode||'';home.addEventListener('input',()=>{answers.homePostcode=home.value;const error=card.querySelector('#obHomePostcodeError');if(error)error.textContent='';});}
        }
        if(step===4){card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{answers.community=b.dataset.value;step=5;render()});}
        if(step===5){
          card.querySelectorAll('[data-ob-palette]').forEach(button=>button.addEventListener('click',()=>{
            answers.palette=button.dataset.obPalette;applyAppearance();render();
          }));
          card.querySelectorAll('[data-ob-mode]').forEach(button=>button.addEventListener('click',()=>{
            answers.theme=button.dataset.obMode;applyAppearance();render();
          }));
          card.querySelector('#obFinish').disabled=!paletteValues.includes(answers.palette)||!['light','dark'].includes(answers.theme);
        }
        if(card.querySelector('#obBack'))card.querySelector('#obBack').onclick=()=>{step--;render()};
        if(card.querySelector('#obNext'))card.querySelector('#obNext').onclick=()=>{
          if(step===2&&answers.priorities.length<1){
            const error=card.querySelector('#obError');if(error)error.textContent='Choose at least one priority (up to three) to continue.';return;
          }
          if(step===3&&String(answers.homePostcode||'').trim()&&!window.OrielCommuteProfile?.isValid?.(answers.homePostcode)){
            const error=card.querySelector('#obHomePostcodeError');if(error)error.textContent='Enter a UK postcode or area/station name, or leave it blank.';return;
          }
          if(step===3&&answers.homePostcode)answers.homePostcode=window.OrielCommuteProfile?.normalise?.(answers.homePostcode)||answers.homePostcode.trim();
          document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'onboarding_step_completed',step:step+1}}));step++;render();
        };
        if(final)card.querySelector('#obFinish').onclick=()=>finish();
      };

      const finish=()=>{
        if(!paletteValues.includes(answers.palette)||!['light','dark'].includes(answers.theme))return;
        appearanceSaved=true;
        applyAppearance();
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
        answers.homePostcode=window.OrielCommuteProfile?.normalise?.(answers.homePostcode||'')||'';
        state.prefs.onboarding={...answers};
        save();
        try{localStorage.setItem(PROFILE_KEY,JSON.stringify(answers));localStorage.setItem(DONE_KEY,'1');sessionStorage.removeItem(SESSION_SKIP)}catch{}
        window.OrielCommuteProfile?.save?.(answers.homePostcode,{silent:true});
        renderAppliedProfile(answers);

        try{renderAll()}catch{}
        setTimeout(()=>{
          try{
            const profileQuickKey='oriel-onboarding-applied-quick-v1';
            let previousProfileQuick=[];
            try{previousProfileQuick=JSON.parse(localStorage.getItem(profileQuickKey)||'[]')}catch{}
            if(Array.isArray(previousProfileQuick))previousProfileQuick.forEach(key=>quick.delete(key));
            quick.delete('london');
            const nextProfileQuick=[];
            const environmentFilter={hospital:'hospital',gp:'gp',mixed:'split',industry:'industry',community:'community'}[answers.environment];
            if(environmentFilter)nextProfileQuick.push(environmentFilter);
            if(['less','avoid'].includes(answers.community)&&answers.environment!=='community')nextProfileQuick.push('lowcommunity');
            nextProfileQuick.forEach(key=>quick.add(key));
            try{localStorage.setItem(profileQuickKey,JSON.stringify(nextProfileQuick))}catch{}
            document.querySelectorAll('.chip[data-q]').forEach(button=>button.classList.toggle('on',quick.has(button.dataset.q)));
            const r=$('region'),sal=$('salary'),hrs=$('hours');
            if(r)r.value=answers.region||'';
            if(sal)sal.value=answers.salary||'';
            if(hrs)hrs.value=answers.hours||'';
            if($('sort'))$('sort').value='fit';
            pageLimit=40;
            if(r)r.dispatchEvent(new Event('change'));
            else {explore();stats();reco();drawMap(placements.filter(matches));}
            document.querySelector('[data-tab="foryou"]')?.click();
          }catch{}
        },0);
        overlay.remove();
        // Reuse the existing real Supabase Google/email authentication flow.
        // A separate optional prompt leaves saved local preferences intact.
        if(window.OrielCloud?.signIn){
          const prompt=document.createElement('div');
          prompt.className='onboardSyncOverlay';
          prompt.innerHTML='<section class="onboardSyncDialog" role="dialog" aria-modal="true" aria-labelledby="obSyncTitle">'+
            '<div class="onboardStepLabel">Keep your progress</div><h2 id="obSyncTitle">Save your preferences across devices</h2>'+
            '<p>Sign in with Google or email to sync your shortlist, your personalised choices and your progress between devices.</p>'+
            '<button type="button" class="btn primary" data-ob-sync>Continue with Google or email</button>'+
            '<button type="button" class="textbtn" data-ob-later>Maybe later</button></section>';
          document.body.append(prompt);
          const dismiss=()=>prompt.remove();
          prompt.querySelector('[data-ob-later]').onclick=dismiss;
          prompt.querySelector('[data-ob-sync]').onclick=()=>{dismiss();window.OrielCloud?.signIn?.()};
          prompt.addEventListener('click',e=>{if(e.target===prompt)dismiss()});
          prompt.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});
          prompt.querySelector('[data-ob-sync]').focus();
        }
        document.body.classList.add('deskPersonalised');document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'onboarding_completed'}}));document.querySelector('[data-tab="foryou"]')?.focus();toast('Your Placement Atlas is personalised ');
      };

      render();card.querySelector('button')?.focus();
    };

    renderAppliedProfile(loadAnswers()||{homePostcode:window.OrielCommuteProfile?.read?.()||''});
    document.addEventListener('desk:personalisation-removed',()=>renderAppliedProfile({}));
    document.addEventListener('desk:commute-origin-changed',()=>{const profile=loadAnswers()||{};profile.homePostcode=window.OrielCommuteProfile?.read?.()||'';renderAppliedProfile(profile)});
    window.openOrielPersonalisation=()=>openSetup(true);
    document.getElementById('personaliseAgain')?.addEventListener('click',()=>openSetup(true));
    document.getElementById('personaliseTop')?.addEventListener('click',()=>openSetup(true));
    let done=false,skipped=false,returning=false;
    try{
      done=localStorage.getItem(DONE_KEY)==='1';
      skipped=sessionStorage.getItem(SESSION_SKIP)==='1';
      returning=Boolean(localStorage.getItem('phivos-desk-v2')||
        localStorage.getItem('phivos-desk-csv-v2')||
        localStorage.getItem('oriel-desk-palette-v1')||
        localStorage.getItem('oriel-desk-layout-v1')||
        localStorage.getItem(PROFILE_KEY)||
        localStorage.getItem('placement-atlas-visited-v1'));
      if(!done&&returning){localStorage.setItem(DONE_KEY,'1');done=true}
      localStorage.setItem('placement-atlas-visited-v1','1');
    }catch{}
    if(done)document.body.classList.add('deskPersonalised');
    // Only first-time visitors see the setup automatically. Returning visitors
    // can reopen it from Preferences or Personal Fit whenever they choose.
    if(!done&&!skipped&&!returning&&!new URLSearchParams(location.search).has('study'))setTimeout(()=>openSetup(false),350);
    return true;
  };

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
})();
