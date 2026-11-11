'use strict';
(()=>{
  const DONE_KEY='phivos-onboarding-v1';
  const PROFILE_KEY='phivos-onboarding-profile-v1';
  const SESSION_SKIP='phivos-onboarding-skip-session';

  const css=`
  .onboardOverlay{position:fixed;inset:0;z-index:5000;background:rgba(12,16,18,.58);backdrop-filter:blur(8px);display:grid;place-items:center;padding:14px;animation:obFade .18s ease-out}
  .onboardCard{width:min(760px,100%);max-height:calc(100dvh - 28px);overflow:hidden;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:20px;box-shadow:0 24px 72px rgba(0,0,0,.24);padding:22px 24px;position:relative}
  .onboardSkip{position:absolute;right:22px;top:17px;border:0;background:transparent;color:var(--mut);font-size:12px;font-weight:650;padding:5px 2px;cursor:pointer}
  .onboardSkip:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
  .onboardProgress{height:3px;background:var(--soft);border-radius:999px;overflow:hidden;margin:7px 66px 15px 0}
  .onboardProgress>span{display:block;height:100%;background:var(--ux-accent);border-radius:999px;transition:width .2s ease}
  .onboardStepLabel{font-size:10px;font-weight:800;letter-spacing:.11em;color:var(--mut);text-transform:uppercase;margin:0 0 5px}
  .onboardCard h2{font-size:27px;line-height:1.13;letter-spacing:-.035em;margin:5px 50px 8px 0;color:var(--ink)}
  .onboardCard h3{font-size:21px;line-height:1.2;letter-spacing:-.025em;margin:3px 0 6px;color:var(--ink)}
  .onboardLead{font-size:13px;line-height:1.5;color:var(--mut);max-width:650px;margin:0 0 12px}
  .onboardChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0 4px}
  .onboardChoice{appearance:none;min-width:0;min-height:44px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:10px;padding:9px 11px;text-align:left;transition:border-color .14s ease,background .14s ease;display:flex;align-items:center;gap:8px}
  .onboardChoice:hover{border-color:var(--ux-accent-border);background:var(--soft)}
  .onboardChoice.selected{border-color:var(--ux-accent);background:var(--ux-accent-soft);box-shadow:inset 0 0 0 1px var(--ux-accent)}
  .onboardChoice .emoji{display:none}
  .onboardChoice b{display:block;font-size:12.5px;font-weight:700;line-height:1.25}
  .onboardChoice small{display:block;color:var(--mut);font-size:10px;line-height:1.3;margin-top:3px}
  .onboardChoice.wide{grid-column:1/-1}
  .onboardChoiceCount{font-size:11px;color:var(--mut);margin:7px 1px 0}
  .onboardFields{display:grid;grid-template-columns:1fr 1fr;gap:11px 13px;margin:14px 0 4px}
  .onboardField{display:block;min-width:0}
  .onboardField span{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:0 0 5px 2px}
  .onboardField select,.onboardField input{width:100%;min-height:42px;border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:10px;padding:9px 11px;outline:none}
  .onboardField select:focus,.onboardField input:focus{border-color:var(--ux-accent);outline:2px solid color-mix(in srgb,var(--ux-accent) 20%,transparent);outline-offset:1px}
  .onboardHomeBase{grid-column:1/-1;margin:0;padding:0;border:0;background:transparent}
  .onboardFieldHint{font-size:10px;line-height:1.4;color:var(--mut);margin:5px 2px 0}
  .onboardError{font-size:11px;color:#bd6464;margin-top:5px;min-height:0}
  .onboardActions{display:flex;align-items:center;gap:9px;margin-top:16px}
  .onboardActions .spacer{flex:1}
  .onboardActions .btn{min-height:40px;padding:9px 16px}
  .onboardActions .btn:disabled{opacity:.4;cursor:not-allowed}
  .onboardActions .textbtn{font-size:12px;color:var(--mut)}
  .onboardFine{font-size:10px;line-height:1.4;color:var(--mut);margin-top:8px}
  .onboardFinal{padding:6px 0 0}
  .onboardLookLabel{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;margin:13px 0 7px;color:var(--mut)}
  .onboardPaletteChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .onboardPaletteChoice,.onboardModeChoices button{min-width:0;min-height:46px;display:flex;align-items:center;justify-content:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font-size:12px;cursor:pointer}
  .onboardPaletteChoice[aria-pressed="true"],.onboardModeChoices button[aria-pressed="true"]{border-color:var(--ux-accent);background:var(--ux-accent-soft);box-shadow:inset 0 0 0 1px var(--ux-accent)}
  .onboardPaletteSwatch{width:20px;height:20px;border-radius:50%;background:var(--ob-swatch);flex:none}
  .onboardModeChoices{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .onboardModeChoices button{justify-content:center;min-height:39px}
  .onboardSyncOverlay{position:fixed;inset:0;z-index:5100;display:grid;place-items:center;padding:18px;background:#10121ac0}
  .onboardSyncDialog{display:grid;gap:12px;width:min(420px,100%);border-radius:18px;padding:22px;background:var(--panel);color:var(--ink);border:1px solid var(--line);box-shadow:0 25px 70px #0003}
  .onboardSyncDialog h2{margin:0;font-size:22px;line-height:1.2}
  .onboardSyncDialog p{color:var(--mut);font-size:13px;line-height:1.5;margin:0}
  .onboardSyncDialog .textbtn{justify-self:center;color:var(--mut)}
  @media(max-width:620px){.onboardCard{padding:18px 15px;border-radius:16px}.onboardCard h2{font-size:23px}.onboardCard h3{font-size:19px}.onboardChoices{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.onboardChoice{min-height:42px;padding:8px}.onboardChoice b{font-size:11.5px}.onboardChoice small{font-size:9.5px}.onboardPaletteChoices{grid-template-columns:repeat(3,minmax(0,1fr))}.onboardPaletteChoice{padding:7px;font-size:11px}.onboardPaletteSwatch{width:17px;height:17px}.onboardActions .btn{min-height:38px}}
  @media(max-height:720px){.onboardCard{padding-top:15px;padding-bottom:15px}.onboardProgress{margin-bottom:10px}.onboardLead{margin-bottom:8px;font-size:12px}.onboardChoices{margin-top:8px;gap:5px}.onboardChoice{min-height:38px;padding:7px}.onboardFields{margin-top:9px;gap:8px}.onboardActions{margin-top:10px}.onboardLookLabel{margin-top:9px}.onboardPaletteChoices{gap:5px}.onboardPaletteChoice{min-height:40px}.onboardModeChoices button{min-height:34px}}
  @media(prefers-reduced-motion:reduce){.onboardOverlay,.onboardProgress>span{animation:none;transition:none}}
  @keyframes obFade{from{opacity:0}to{opacity:1}}
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
      wrap.innerHTML='<button class="btn" id="personaliseAgain"> Personalise my desk again</button><div class="smallnote" style="margin-top:6px">Retake the quick setup whenever your priorities change.</div>';
      prefsCard.appendChild(wrap);
    }
    const introActions=document.querySelector('.introActions');


    const loadAnswers=()=>{
      try{if(localStorage.getItem(DONE_KEY)!=='1')return null;return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')||null}catch{return null}
    };

    const paletteValues=['forest','copper','mauve','amber','cocoa','mono'];
    const getAppearance=()=>({
      palette:localStorage.getItem('oriel-desk-palette-v1')||'forest',
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
      let answers={...defaultAnswers(),...(loadAnswers()||{})};
      // Re-taking the quiz starts the preference choices fresh; only appearance
      // and practical fields remain prefilled. The final appearance step is intentional.
      answers.region='';answers.environment='';answers.priorities=[];answers.community='';
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
      let step=-1,regionChosen=false;
      const overlay=document.createElement('div');overlay.className='onboardOverlay';overlay.setAttribute('role','presentation');
      const card=document.createElement('div');card.className='onboardCard';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Personalise Placement Atlas');overlay.appendChild(card);document.body.appendChild(overlay);
      const close=()=>{
        if(!appearanceSaved){
          answers.palette=startingAppearance.palette;answers.theme=startingAppearance.theme;
          applyAppearance();
        }
        document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'onboarding_skipped'}}));
        overlay.remove();previousFocus?.focus();try{sessionStorage.setItem(SESSION_SKIP,'1')}catch{}
      };
      overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
      overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const controls=[...card.querySelectorAll('button,select,input')].filter(x=>!x.disabled);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});

      const regions=[...new Set(placements.map(p=>p.region).filter(Boolean))].sort((a,b)=>a==='London'?-1:b==='London'?1:a.localeCompare(b));
      const choice=(value,emoji,title,desc,selected,wide=false)=>`<button type="button" class="onboardChoice ${selected?'selected':''} ${wide?'wide':''}" data-value="${esc(value)}" aria-pressed="${selected}"><span class="emoji" aria-hidden="true">${emoji}</span><span><b>${title}</b>${desc?`<small>${desc}</small>`:''}</span></button>`;
      const progress=()=>step<0?0:Math.min(100,(step+1)/6*100);

      const render=()=>{
        card.dataset.palette=answers.palette;
        card.dataset.theme=answers.theme;
        queueMicrotask(()=>card.querySelector('.onboardChoice[aria-pressed="true"], [data-value], #obNext, #obFinish, #obStart, button')?.focus({preventScroll:true}));
        if(step===-1){
          card.innerHTML=`<div class="onboardStepLabel">PERSONALISE YOUR SEARCH</div><h2>Make Placement Atlas yours.</h2><p class="onboardLead">A few quick choices help tailor programme matches, fit scores and map results. You can change them whenever you like.</p><div class="onboardActions"><button class="btn primary" id="obStart">Get started</button><span class="spacer"></span><button class="textbtn" id="obLater">Maybe later</button></div><div class="onboardFine">Your answers stay in this browser. A home area is shared with TfL only when you request a journey estimate.</div>`;
          card.querySelector('#obLater').onclick=close;card.querySelector('#obStart').onclick=()=>{step=0;render()};return;
        }

        let body='';
        if(step===0){
          body=`<div class="onboardStepLabel">1 / 6 · Location</div><h3>Where are you looking?</h3><p class="onboardLead">Choose one region, or explore them all.</p><div class="onboardChoices">${regions.map(r=>choice(r,'',r,'',regionChosen&&answers.region===r)).join('')}${choice('','','All regions','',regionChosen&&answers.region==='',true)}</div>`;
        }else if(step===1){
          const opts=[['hospital','','Hospital',''],['gp','','General practice',''],['mixed','','A good mix',''],['industry','','Industry, research or data',''],['community','','Community pharmacy',''],['unsure','','Not sure yet','']];
          body=`<div class="onboardStepLabel">2 / 6 · Setting</div><h3>Which environment appeals to you?</h3><p class="onboardLead">This guides recommendations without hiding other settings.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.environment===x[0])).join('')}</div>`;
        }else if(step===2){
          const opts=[['money','','Pay',''],['lifestyle','','Work-life balance',''],['progression','','Career progression',''],['location','','Location',''],['independence','','Independence',''],['clinical','','Clinical variety','']];
          body=`<div class="onboardStepLabel">3 / 6 · Priorities</div><h3>What matters most?</h3><p class="onboardLead">Choose 1–3 priorities. They receive extra weight in your fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.priorities.includes(x[0]))).join('')}</div><div class="onboardChoiceCount" id="obPriorityCount" aria-live="polite">Choose 1–3</div><div class="onboardError" id="obError"></div>`;
        }else if(step===3){
          body=`<div class="onboardStepLabel">4 / 6 · Practical</div><h3>Set your limits</h3><p class="onboardLead">All optional. Leave anything blank if it does not matter to you.</p><div class="onboardFields"><label class="onboardField"><span>Minimum salary</span><select id="obSalary"><option value="">No minimum</option><option value="26000">£26k+</option><option value="28000">£28k+</option><option value="30000">£30k+</option><option value="32000">£32k+</option><option value="36000">£36k+</option></select></label><label class="onboardField"><span>Maximum weekly hours</span><select id="obHours"><option value="">No limit</option><option value="35">35 hours</option><option value="37.5">37.5 hours</option><option value="40">40 hours</option><option value="42.5">42.5 hours</option></select></label><div class="onboardHomeBase"><label class="onboardField"><span>Home area (optional)</span><input id="obHomePostcode" type="text" placeholder="Postcode, area or station" autocomplete="postal-code" maxlength="60"></label><p class="onboardFieldHint">Used to estimate journeys to each training site.</p><div class="onboardError" id="obHomePostcodeError"></div></div></div>`;
        }else if(step===4){
          const opts=[['happy','','Happy with it',''],['some','','Some is fine',''],['less','','Prefer less',''],['avoid','','Avoid community-heavy','']];
          body=`<div class="onboardStepLabel">5 / 6 · Community</div><h3>How much community pharmacy would you like?</h3><p class="onboardLead">This changes how community-heavy programmes affect your fit score.</p><div class="onboardChoices">${opts.map(x=>choice(x[0],x[1],x[2],x[3],answers.community===x[0])).join('')}</div>`;
        }else{
          const colours=[['forest','Forest','#274333'],['copper','Copper','#3f6589'],['mauve','Mauve','#805e78'],
            ['amber','Amber','#c49348'],['cocoa','Cocoa','#695443'],['mono','Monochrome','#55575a']];
          body=`<div class="onboardStepLabel">6 / 6 · Appearance</div>
            <h3>Choose your look</h3>
            <p class="onboardLead">Preview your palette and light or dark mode as you choose.</p>
            <div class="onboardLookLabel">Colour palette</div>
            <div class="onboardPaletteChoices" role="group" aria-label="Choose colour palette">
             ${colours.map(([id,label,colour])=>`<button type="button" class="onboardPaletteChoice" data-ob-palette="${id}" aria-pressed="${answers.palette===id}">
               <span class="onboardPaletteSwatch" style="--ob-swatch:${colour}"></span><b>${label}</b>${answers.palette===id?'<span aria-hidden="true">✓</span>':''}
             </button>`).join('')}</div>
            <div class="onboardLookLabel">Appearance</div>
            <div class="onboardModeChoices" role="group" aria-label="Choose light or dark mode">
             <button type="button" data-ob-mode="light" aria-pressed="${answers.theme==='light'}">☀ Light</button>
             <button type="button" data-ob-mode="dark" aria-pressed="${answers.theme==='dark'}">☾ Dark</button>
            </div>`;
        }

        const final=step===5;
        card.innerHTML=`<button type="button" class="onboardSkip" id="obSkip">Skip setup</button><div class="onboardProgress"><span style="width:${progress()}%"></span></div>${body}<div class="onboardActions">${step>0?'<button class="btn" id="obBack">← Back</button>':''}${step===0?'<button class="btn" id="obBackIntro">← Back</button>':''}<span class="spacer"></span>${step===2||step===3?'<button class="btn primary" id="obNext">Continue →</button>':''}${final?'<button class="btn primary" id="obFinish">Done</button>':''}</div>`;
        card.querySelector('#obSkip').onclick=close;

        if(step===0){
          card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{
            answers.region=b.dataset.value;regionChosen=true;step++;render();
          });
          card.querySelector('#obBackIntro').onclick=()=>{step=-1;render()};
        }
        if(step===1){
          card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{
            answers.environment=b.dataset.value;step++;render();
          });
        }
        if(step===2){
          const count=card.querySelector('#obPriorityCount'),next=card.querySelector('#obNext'),error=card.querySelector('#obError');
          const sync=()=>{
            card.querySelectorAll('.onboardChoice').forEach(button=>{
              const selected=answers.priorities.includes(button.dataset.value);
              button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
            });
            if(count)count.textContent=answers.priorities.length+' of 3 selected';
            if(next)next.disabled=answers.priorities.length===0;
            if(error)error.textContent='';
          };
          card.querySelectorAll('.onboardChoice').forEach(button=>button.onclick=()=>{
            const value=button.dataset.value,index=answers.priorities.indexOf(value);
            if(index>=0)answers.priorities.splice(index,1);
            else if(answers.priorities.length<3)answers.priorities.push(value);
            else{if(error)error.textContent='You can choose up to three.';return;}
            sync();
          });
          sync();
        }
        if(step===3){
          const sal=card.querySelector('#obSalary'),hrs=card.querySelector('#obHours'),home=card.querySelector('#obHomePostcode');
          if(sal){sal.value=answers.salary;sal.onchange=()=>answers.salary=sal.value;}
          if(hrs){hrs.value=answers.hours;hrs.onchange=()=>answers.hours=hrs.value;}
          if(home){home.value=answers.homePostcode||'';home.addEventListener('input',()=>{
            answers.homePostcode=home.value;const error=card.querySelector('#obHomePostcodeError');if(error)error.textContent='';
          });}
        }
        if(step===4){
          card.querySelectorAll('.onboardChoice').forEach(b=>b.onclick=()=>{
            answers.community=b.dataset.value;step++;render();
          });
        }
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
          if(step===2&&!answers.priorities.length){const error=card.querySelector('#obError');if(error)error.textContent='Choose at least one priority to continue.';return;}
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
    let done=false,skipped=false;try{done=localStorage.getItem(DONE_KEY)==='1';skipped=sessionStorage.getItem(SESSION_SKIP)==='1'}catch{}
    if(done)document.body.classList.add('deskPersonalised');
    if(!done&&!skipped&&!new URLSearchParams(location.search).has('study'))setTimeout(()=>openSetup(false),350);
    return true;
  };

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
})();
