'use strict';
/* Small, non-blocking feedback for real user changes. No state or filtering
   logic is duplicated here: the original controls remain the source of truth. */
(()=>{
  const sidebar=document.getElementById('uxFilterSidebar');
  if(!sidebar)return;
  const pill=document.createElement('div');
  pill.className='atlasFilterNotice';
  pill.setAttribute('role','status');
  pill.setAttribute('aria-live','polite');
  pill.hidden=true;
  const anchor=sidebar.querySelector('.quick');
  if(anchor)anchor.before(pill);
  else sidebar.prepend(pill);
  let expiry=null,serial=0;
  const show=(message)=>{
    if(!message)return;
    const id=++serial;
    clearTimeout(expiry);
    pill.textContent=message;
    pill.hidden=false;
    // Ensure fast successive clicks restart the gentle reveal animation.
    pill.classList.remove('atlasIsVisible');
    requestAnimationFrame(()=>{if(serial===id)pill.classList.add('atlasIsVisible')});
    expiry=setTimeout(()=>{
      if(serial!==id)return;
      pill.classList.remove('atlasIsVisible');
      setTimeout(()=>{if(serial===id)pill.hidden=true;},240);
    },1500);
  };
  const labelFor=el=>{
    if(!el)return 'Preference';
    const label=el.closest('label');
    const span=label?.querySelector(':scope > span');
    const output=span?.textContent?.trim()||label?.textContent?.trim()||el.getAttribute('aria-label')||el.id||'Preference';
    return output.replace(/\s+/g,' ').slice(0,48);
  };
  // Avoid banners during app boot, import, cloud recovery and programmatic
  // filter updates. Native user changes automatically keep their handlers.
  document.addEventListener('change',event=>{
    if(!event.isTrusted)return;
    const target=event.target;
    if(!(target instanceof HTMLElement))return;
    if(target.matches('select')){
      const field=labelFor(target);
      const option=target.selectedOptions?.[0];
      const choice=option?.textContent?.trim().replace(/\s+/g,' ')||'Any';
      if(target.closest('#uxFilterSidebar'))show(field+' · '+choice.slice(0,42));
      else if(target.id==='uxResultsSort')show('Results sorted · '+choice.slice(0,42));
      return;
    }
    if(target.matches('input[type="checkbox"]')&&target.closest('#uxFilterSidebar')){
      show((target.checked?'On · ':'Off · ')+labelFor(target));
    }
  });
  // Chips are already wired in the app. Only animate/report their actual
  // new state; never change the filtering choice ourselves.
  document.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const chip=event.target.closest('#quick .chip');
    if(!chip)return;
    setTimeout(()=>{
      if(!chip.isConnected)return;
      const title=chip.textContent.trim().replace(/\s+/g,' ').slice(0,40);
      if(chip.id==='allRegionsBtn')show('Showing all regions');
      else show((chip.classList.contains('on')?'Selected · ':'Removed · ')+title);
    },0);
  });
  // Main shortlist changes already dispatch desk:action. Give them a short,
  // theme-aware confirmation; suppress duplicate messages inside Tinder Mode,
  // where there is already richer green/red card feedback.
  document.addEventListener('desk:action',event=>{
    if(document.getElementById('tinderMode')?.classList.contains('active'))return;
    const action=event.detail?.name;
    if(action==='shortlist_added'||action==='shortlist_removed'){
      if(typeof toast==='function')toast(action==='shortlist_added'?'Added to your shortlist':'Removed from your shortlist');
    }
  });
  document.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const remove=event.target.closest('.geoAreaChip button');
    if(remove&&typeof toast==='function'){
      // Click handler removes the saved chip synchronously.
      setTimeout(()=>toast('Excluded location removed'),0);
    }
  });
  // Simulator already reports drag and drop changes in its own status region.
  // Ensure successful moves receive a small explicit confirmation.
  document.addEventListener('drop',event=>{
    const col=event.target.closest?.('#simulator [data-sim-col]');
    if(!col)return;
    let id='';
    try{id=event.dataTransfer?.getData('text/plain')||''}catch{}
    if(!id)return;
    setTimeout(()=>{
      const item=[...document.querySelectorAll('#simulator .simItem')].find(el=>el.dataset.simId===id);
      const zone=item?.closest('[data-sim-col]')?.dataset.simCol;
      if(!zone)return;
      const status=document.getElementById('simToast');
      if(status)status.textContent='✦ Moved to '+({preferred:'Preference',neutral:'No Preference',unwanted:'Not Wanted'}[zone]||zone);
    },60);
  });
})();
