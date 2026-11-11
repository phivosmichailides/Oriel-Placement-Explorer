'use strict';
/* In-page, keyboard-accessible programme summary for Simulation and Shortlist.
   Reads the existing placement dataset. No navigation, ranking change or
   additional user data storage occurs when a summary is opened. */
(()=>{
  const getProgramme=id=>{
    try{return typeof placements==='undefined'?null:placements.find(p=>String(p.id)===String(id))}catch{return null}
  };
  const money=n=>Number.isFinite(Number(n))&&Number(n)>0?'£'+Math.round(Number(n)).toLocaleString('en-GB'):'Not stated';
  const el=(tag,cls,txt)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(txt!==undefined)node.textContent=String(txt);
    return node;
  };
  const regionNames={'east midlands':'East Midlands','east of england':'East of England','kent, surrey and sussex':'Kent, Surrey and Sussex','north east':'North East','north west':'North West','south west':'South West','thames valley':'Thames Valley','wales':'Wales','wessex':'Wessex','west midlands':'West Midlands','yorkshire and the humber':'Yorkshire and the Humber','london':'London'};
  const formatRegion=value=>regionNames[String(value||'').trim().toLowerCase()]||String(value||'Region not stated').replace(/\b[a-z]/g,c=>c.toUpperCase());
  const readableTitle=p=>window.AtlasPrototypeCleanTitle?.(p.title||p.employer||'Programme',p)||p.title||p.employer||'Programme';
  let overlay=null,previousFocus=null;
  const dismiss=()=>{
    if(!overlay)return;
    const old=overlay;overlay=null;old.remove();
    previousFocus?.focus?.();
    previousFocus=null;
  };
  const kv=(container,key,value)=>{
    const field=el('div','progPeekStat');
    field.append(el('span','progPeekLabel',key),el('strong','progPeekValue',value));
    container.append(field);
  };
  const open=id=>{
    const p=getProgramme(id);
    if(!p)return false;
    dismiss();
    previousFocus=document.activeElement;
    overlay=el('div','progPeekOverlay');
    const dialog=el('section','progPeekDialog');
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','progPeekTitle');
    dialog.setAttribute('tabindex','-1');
    const close=el('button','progPeekClose','×');
    close.type='button';close.setAttribute('aria-label','Close programme preview');
    close.addEventListener('click',dismiss);
    dialog.append(close,el('div','progPeekEyebrow','PROGRAMME AT A GLANCE'));
    const title=el('h2','progPeekTitle',readableTitle(p));
    title.id='progPeekTitle';dialog.append(title);
    const sub=el('div','progPeekSub',[formatRegion(p.region),p.area,p.employer].filter(Boolean).join(' · '));
    dialog.append(sub);
    const stats=el('div','progPeekGrid');
    const gross=Number(p.salary)||0,est=window.OrielPay?.estimate?.(gross);
    kv(stats,'Gross · yearly',money(gross));
    kv(stats,'Gross · monthly',money(gross/12));
    kv(stats,'Estimated take-home · yearly',est?money(est.annual):'Not available');
    kv(stats,'Estimated take-home · monthly',est?money(est.monthly):'Not available');
    kv(stats,'Hours per week',p.hours?Number(p.hours)+' hours':'Not stated');
    kv(stats,'Training region',formatRegion(p.region));
    dialog.append(stats);
    const settings=Array.isArray(p.settings)?p.settings:[];
    const block=el('section','progPeekSection');
    block.append(el('h3',null,'Training setting and split'));
    if(settings.length){
      const list=el('div','progPeekSettings');
      for(const [name,weeks] of settings){
        list.append(el('div','progPeekSetting',name+(Number(weeks)>0?' · '+weeks+' weeks':'')));
      }
      block.append(list);
    }else block.append(el('p','progPeekMuted',p.type||'Setting not specified in the programme data'));
    const pcs=[...new Set((p.postcodes||[]).filter(Boolean))];
    block.append(el('h3',null,pcs.length>1?'Training sites · '+pcs.length+' postcodes':'Training site'));
    if(pcs.length){
      const sites=el('div','progPeekSites');
      pcs.forEach((pc,i)=>{
        const row=el('div','progPeekSite');
        row.append(el('span',null,(pcs.length>1?'Site '+(i+1)+' · ':'')+pc));
        const link=el('a',null,'Google Maps ↗');
        link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(pc+', UK');
        link.target='_blank';link.rel='noopener noreferrer';row.append(link);sites.append(row);
      });
      block.append(sites);
    }else block.append(el('p','progPeekMuted','Training site postcode not stated'));
    dialog.append(block);
    const fullName=el('details','progPeekFullName');
    fullName.append(el('summary',null,'Full Oriel programme name'),el('p',null,p.title||p.employer||'Not supplied'));
    dialog.append(fullName);
    const insights=el('section','progPeekSection');
    insights.append(el('h3',null,'Public experiences & reviews'));
    const researchLinks=el('div','progPeekResearchLinks');
    const researchBase=(p.employer||readableTitle(p))+' '+(p.region||'')+' foundation pharmacist training';
    for(const [label,url] of [
      ['Google reviews','https://www.google.com/search?q='+encodeURIComponent((p.employer||readableTitle(p))+' '+(p.region||'')+' reviews')],
      ['Reddit discussions','https://www.reddit.com/search/?q='+encodeURIComponent(researchBase)],
      ['Search trainee experiences','https://www.google.com/search?q='+encodeURIComponent(researchBase+' trainee experience')]
    ]){
      const link=el('a',null,label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';researchLinks.append(link);
    }
    insights.append(researchLinks,el('p','progPeekMuted','Public reviews may describe patient or customer service rather than training quality. Check the date, exact site and context; individual comments are not representative evidence.'));
    dialog.append(insights);
    if(est){
      const note=el('p','progPeekFoot','Take-home is an illustrative estimate using your pension and student-loan settings; actual pay depends on payroll circumstances. '+(window.OrielPay?.descriptor?.()||''));
      dialog.append(note);
    }
    overlay.append(dialog);
    overlay.addEventListener('mousedown',event=>{if(event.target===overlay)dismiss()});
    document.body.append(overlay);
    dialog.focus({preventScroll:true});
    return true;
  };
  document.addEventListener('keydown',event=>{
    if(overlay){
      if(event.key==='Escape'){event.preventDefault();dismiss();return}
      if(event.key==='Tab'){
        const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href]')];
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
    }
    const title=event.target.closest?.('#shortlistList .placement .placementTop h3, #uxDrawerItems .uxDrawerItem b');
    if(title&&(event.key==='Enter'||event.key===' ')){
      const card=title.closest?.('[data-id]');
      const id=card?.dataset.id||title.closest('.rank-row')?.querySelector('[data-id]')?.dataset.id;
      if(id){event.preventDefault();event.stopImmediatePropagation();open(id)}
    }
  },true);
  document.addEventListener('click',event=>{
    const title=event.target.closest?.('#shortlistList .placement .placementTop h3');
    if(!title)return;
    const id=title.closest('[data-id]')?.dataset.id;
    if(id){event.preventDefault();event.stopImmediatePropagation();open(id)}
  },true);
  window.OrielProgrammePreview={open,close:dismiss};
})();
