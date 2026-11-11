'use strict';
/* Preference weights refine the answers from the initial setup. The original
   hidden inputs remain the source of truth for scoring and persistence. */
(()=>{
 const host=document.getElementById('weights');
 if(!host)return;
 const meanings=['Off','Very low','Low','Moderate','High','Maximum'];
 const enhance=()=>{
   if(!host.querySelector('.weightGuide')&&host.querySelector('.weight')){
     const guide=document.createElement('p');
     guide.className='weightGuide';
     guide.textContent='Fine-tune how strongly each factor affects your matches.';
     host.prepend(guide);
   }
   for(const row of host.querySelectorAll('.weight')){
     if(row.classList.contains('weightModern'))continue;
     const source=row.querySelector('input[data-weight]');
     if(!source)continue;
     const label=row.querySelector('b')?.textContent?.trim()||'Preference';
     const min=Number(source.min)||0,max=Number(source.max)||5;
     const wrap=document.createElement('div');wrap.className='weightSliderWrap';
     const line=document.createElement('div');line.className='weightSliderLine';
     const slider=document.createElement('input');
     slider.type='range';slider.className='weightSlider';
     slider.min=String(min);slider.max=String(max);slider.step=source.step||'1';
     slider.value=source.value;slider.setAttribute('aria-label',label);
     const value=document.createElement('output');value.className='weightSliderValue';
     value.setAttribute('aria-live','off');
     line.append(slider,value);
     const ends=document.createElement('div');ends.className='weightSliderEnds';
     ends.innerHTML='<span>Off</span><span>Strongest</span>';
     wrap.append(line,ends);
     const update=()=>{
       const n=Number(slider.value),ratio=max===min?0:(n-min)/(max-min)*100;
       value.textContent=String(n);
       slider.style.setProperty('--weight-fill',ratio+'%');
       slider.setAttribute('aria-valuetext',n+' of '+max+' · '+(meanings[n]||''));
       source.value=String(n);
     };
     slider.addEventListener('input',update);
     slider.addEventListener('change',()=>{
       source.value=slider.value;
       source.dispatchEvent(new Event('input',{bubbles:true}));
       source.dispatchEvent(new Event('change',{bubbles:true}));
       requestAnimationFrame(()=>{
         if(typeof explore==='function')explore();
         if(typeof reco==='function')reco();
         if(typeof shortlist==='function')shortlist();
         if(typeof compare==='function')compare();
       });
     });
     source.before(wrap);
     source.classList.add('weightNative');source.tabIndex=-1;source.setAttribute('aria-hidden','true');
     if(source.nextElementSibling?.tagName==='SPAN')source.nextElementSibling.classList.add('weightLegacyValue');
     row.classList.add('weightModern');
     update();
   }
 };
 new MutationObserver(enhance).observe(host,{childList:true});
 window.addEventListener('resize',()=>host.querySelectorAll('.weightSlider').forEach(slider=>slider.style.setProperty('--weight-fill',((Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min)||1))*100+'%')),{passive:true});
 enhance();
})();
