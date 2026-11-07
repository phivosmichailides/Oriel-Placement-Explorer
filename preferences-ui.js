'use strict';
/* Progressive enhancement: preserve the existing 0–5 weight inputs and the
   app's original input/change listeners, persistence, and score calculations. */
(()=>{
  const host=document.getElementById('weights');
  if(!host)return;
  const meanings=['Off','Very low','Low','Moderate','High','Maximum'];
  const enhance=()=>{
    if(!host.querySelector('.weightGuide')&&host.querySelector('.weight')){
      const guide=document.createElement('p');
      guide.className='weightGuide';
      guide.textContent='0 = off   ·   5 = strongest influence';
      host.prepend(guide);
    }
    for(const row of host.querySelectorAll('.weight')){
      if(row.classList.contains('weightModern'))continue;
      const input=row.querySelector('input[data-weight]');
      if(!input)continue;
      const label=row.querySelector('b')?.textContent?.trim()||'Preference';
      const group=document.createElement('div');
      group.className='weightScale';
      const bubble=document.createElement('span');
      bubble.className='weightSelectionBubble';
      bubble.setAttribute('aria-hidden','true');
      group.append(bubble);
      group.setAttribute('role','group');
      group.setAttribute('aria-label',label+': weight from 0 (off) to 5 (strongest)');
      const min=Number(input.min),max=Number(input.max);
      for(let level=min;level<=max;level++){
        const button=document.createElement('button');
        button.type='button';
        button.className='weightStep';
        button.dataset.weightLevel=String(level);
        button.textContent=String(level);
        button.setAttribute('aria-label',label+': '+level+' of '+max+', '+(meanings[level]||''));
        button.setAttribute('aria-pressed',String(Number(input.value)===level));
        group.append(button);
      }
      input.before(group);
      input.classList.add('weightNative');
      input.tabIndex=-1;
      input.setAttribute('aria-hidden','true');
      if(input.nextElementSibling?.tagName==='SPAN')
        input.nextElementSibling.classList.add('weightLegacyValue');
      row.classList.add('weightModern');
      requestAnimationFrame(()=>placeBubble(row,false));
    }
  };
  const placeBubble=(row,animate=true)=>{
    const scale=row?.querySelector('.weightScale');
    const bubble=scale?.querySelector('.weightSelectionBubble');
    const active=scale?.querySelector('.weightStep[aria-pressed="true"]');
    if(!bubble||!active)return;
    bubble.style.width=active.offsetWidth+'px';
    if(!animate)bubble.style.transition='none';
    bubble.style.transform='translate3d('+active.offsetLeft+'px,0,0)';
    if(!animate)requestAnimationFrame(()=>bubble.style.removeProperty('transition'));
  };
  host.addEventListener('click',event=>{
    const button=event.target.closest('button.weightStep');
    if(!button||!host.contains(button))return;
    const row=button.closest('.weight');
    const input=row?.querySelector('input[data-weight]');
    if(!input)return;
    const chosen=button.dataset.weightLevel;
    if(input.value!==chosen){
      input.value=chosen;
      // Reuse existing app logic for saving and recalculating recommendations.
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    row.querySelectorAll('button.weightStep').forEach(step=>{
      step.setAttribute('aria-pressed',String(step===button));
    });
    placeBubble(row);
  });
  // prefs() regenerates the rows when users revisit Preferences.
  // Observe just the container's direct children to avoid observer loops.
  new MutationObserver(enhance).observe(host,{childList:true});
  window.addEventListener('resize',()=>host.querySelectorAll('.weightModern').forEach(row=>placeBubble(row,false)),{passive:true});
  enhance();
})();
