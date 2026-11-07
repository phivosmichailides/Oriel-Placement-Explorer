'use strict';
/* Optional personal UI additions. Never writes to the Placement Desk state or Oriel. */
(()=>{
  const THEME_KEY='oriel-desk-theme-v1';
  const OUTCOME_KEY='oriel-desk-outcome-v1';
  const $=id=>document.getElementById(id);
  const themeButton=$('themeToggle');
  const root=document.documentElement;
  const appearance=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  const storedTheme=()=>{try{return localStorage.getItem(THEME_KEY)}catch{return null}};
  const applyTheme=theme=>{
    root.setAttribute('data-theme',theme);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='dark'?'#1b171b':'#f7f6f2');
    if(themeButton){
      const next=theme==='dark'?'light':'dark';
      themeButton.setAttribute('aria-label','Switch to '+next+' mode');
      themeButton.setAttribute('aria-pressed',String(theme==='dark'));
      // The two accessible, icon-only SVG states are selected via CSS.
      // No visible Light/Dark mode text is needed in the header.
    }
  };
  applyTheme(root.getAttribute('data-theme')==='dark'?'dark':'light');
  themeButton?.addEventListener('click',()=>{
    const next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    try{localStorage.setItem(THEME_KEY,next)}catch{}
    applyTheme(next);
  });
  if(appearance){
    const systemChanged=e=>{if(!['light','dark'].includes(storedTheme()))applyTheme(e.matches?'dark':'light')};
    if(appearance.addEventListener)appearance.addEventListener('change',systemChanged);
    else if(appearance.addListener)appearance.addListener(systemChanged);
  }

  const STATUSES=new Set(['awaiting','received','holding','accepted','upgrades','unmatched','declined']);
  const empty=()=>({status:'awaiting',programmeId:'',receivedDate:'',responseDeadline:'',notes:'',savedAt:''});
  const safeString=(v,max=2000)=>typeof v==='string'?v.slice(0,max):'';
  const normalise=v=>{
    if(!v||typeof v!=='object'||Array.isArray(v))return empty();
    const dates=v.receivedDate||'';
    const deadline=v.responseDeadline||'';
    return {
      status:STATUSES.has(v.status)?v.status:'awaiting',
      programmeId:safeString(v.programmeId,50).trim(),
      receivedDate:/^\d{4}-\d{2}-\d{2}$/.test(dates)?dates:'',
      responseDeadline:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadline)?deadline:'',
      notes:safeString(v.notes,5000),
      savedAt:safeString(v.savedAt,40)
    };
  };
  const load=()=>{
    try{
      const s=localStorage.getItem(OUTCOME_KEY);
      if(!s)return null;
      const v=JSON.parse(s);
      if(v&&v.version===1&&v.record)return normalise(v.record);
      return normalise(v);
    }catch{return null}
  };
  let persisted=load();
  const form=$('outcomeForm');
  if(!form)return;
  const fieldIds=['outcomeStatus','outcomeProgrammeId','outcomeReceivedDate','outcomeResponseDeadline','outcomeNotes'];
  const readForm=()=>normalise({
    status:$('outcomeStatus').value,
    programmeId:$('outcomeProgrammeId').value,
    receivedDate:$('outcomeReceivedDate').value,
    responseDeadline:$('outcomeResponseDeadline').value,
    notes:$('outcomeNotes').value
  });
  const fill=r=>{
    $('outcomeStatus').value=r.status;
    $('outcomeProgrammeId').value=r.programmeId;
    $('outcomeReceivedDate').value=r.receivedDate;
    $('outcomeResponseDeadline').value=r.responseDeadline;
    $('outcomeNotes').value=r.notes;
  };
  const notify=message=>{$('outcomeSavedStatus').textContent=message};
  fill(persisted||empty());
  notify(persisted?'Saved locally'+(persisted.savedAt?' · '+new Date(persisted.savedAt).toLocaleString('en-GB'):'')+'. Remember to export a separate outcome backup.':'Not saved yet. Enter a status and select Save my outcome.');

  const getPlacements=()=>{try{return typeof placements!=='undefined'&&Array.isArray(placements)?placements:[]}catch{return []}};
  const getRanked=()=>{try{return typeof ranked==='function'?ranked():[]}catch{return []}};
  const findProgramme=()=>{
    const query=$('outcomeProgrammeId').value.trim().replace(/^#/,'');
    if(!query)return null;
    return getPlacements().find(p=>String(p.id).trim()===query||String(p.id).split('/').pop().trim()===query)||null;
  };
  const el=(tag,text,cls)=>{
    const node=document.createElement(tag);
    if(text!==undefined&&text!==null)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  };
  const cash=x=>x?'£'+Number(x).toLocaleString('en-GB'):'Not stated';
  const rotations=p=>(p.settings||[]).map(x=>x[0]+' · '+x[1]+' weeks').join(' / ')||'Not stated';
  const places=p=>(p.postcodes||[]).filter(Boolean).join(' · ')||p.area||'Not stated';

  const showProgramme=()=>{
    const container=$('outcomeProgrammeDetails');
    container.replaceChildren();
    const code=$('outcomeProgrammeId').value.trim();
    if(!code){
      container.append(el('p','Enter an Oriel programme code to preview its advertised salary, locations and rotations.','muted'));
      return;
    }
    const ps=getPlacements();
    if(!ps.length){
      container.append(el('p','Programme dataset is still loading. Your saved outcome remains available.','muted'));
      return;
    }
    const p=findProgramme();
    if(!p){
      container.append(el('p','Programme not found in your current dataset. Check the code or upload the latest programme CSV.','muted'));
      return;
    }
    container.append(el('div',p.title||p.employer,'outcomeProgrammeTitle'));
    const grid=el('div',null,'outcomeDetailGrid');
    [['Salary (advertised)',cash(p.salary)],['Est. take-home / month',window.OrielPay?.estimate(p.salary)?window.OrielPay.money(window.OrielPay.estimate(p.salary).monthly):'Not available'],['Hours/week',p.hours?p.hours+'h':'Not stated'],['Region',p.region||'Not stated'],['Programme code',p.id]].forEach(([label,value])=>{
      const cell=el('div');cell.append(el('span',label),el('b',value));grid.append(cell);
    });
    container.append(grid);
    container.append(el('p','Rotations: '+rotations(p),'outcomeRotations'));
    container.append(el('p','Postcodes: '+places(p),'outcomeRotations'));
    container.append(el('p','This information is from your locally loaded Oriel programme data, not a live offer or vacancy verification.','outcomeNotice'));
  };

  const showComparison=()=>{
    const container=$('outcomeCompareResults');
    container.replaceChildren();
    if(!getPlacements().length){
      container.append(el('p','Placement data is loading…','muted'));return;
    }
    const selected=findProgramme();
    const candidates=getRanked().slice(0,5);
    if(!candidates.length&&!selected){
      container.append(el('p','Choose an offer programme or shortlist preferences to start comparing.','muted'));return;
    }
    const rows=[];
    if(selected)rows.push({p:selected,flag:'Your entered offer'});
    candidates.forEach((p,i)=>{if(!rows.some(x=>x.p.id===p.id))rows.push({p,flag:'Shortlist #'+(i+1)})});
    const wrap=el('div',null,'outcomeTableWrap'), table=el('table',null,'outcomeTable');
    const thead=el('thead'), header=el('tr');
    ['Position','Programme','Advertised pay','Est. take-home/mo','Weekly hours','Rotations'].forEach(x=>header.append(el('th',x)));
    thead.append(header);table.append(thead);
    const body=el('tbody');
    rows.forEach(({p,flag})=>{
      const tr=el('tr');
      if(flag==='Your entered offer')tr.className='isOffer';
      [flag,p.title||p.employer,cash(p.salary),window.OrielPay?.estimate(p.salary)?window.OrielPay.money(window.OrielPay.estimate(p.salary).monthly):'—',p.hours?p.hours+'h':'—',rotations(p)].forEach(x=>tr.append(el('td',x)));
      body.append(tr);
    });
    table.append(body);wrap.append(table);container.append(wrap);
  };

  const refresh=()=>{showProgramme();showComparison()};
  fieldIds.forEach(id=>$(id)?.addEventListener('input',refresh));
  $('outcomeStatus').addEventListener('change',refresh);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const current=readForm();
    current.savedAt=new Date().toISOString();
    try{
      localStorage.setItem(OUTCOME_KEY,JSON.stringify({version:1,record:current}));
      persisted=current;
      notify('Saved in this browser. Export your outcome to keep a backup; official Oriel has not been changed.');
    }catch{notify('Browser storage is unavailable. Export a copy instead.')}
    refresh();
  });

  const download=(name,contents)=>{
    const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  $('outcomeExportBtn').addEventListener('click',()=>{
    const record=persisted||readForm();
    download('oriel-my-outcome-backup.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),record},null,2));
    notify(persisted?'Exported a copy of your saved outcome.':'Exported your current draft. Select Save my outcome to retain it in this browser.');
  });
  $('outcomeImportBtn').addEventListener('click',()=>$('outcomeImportInput').click());
  $('outcomeImportInput').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>512000)throw Error('This backup is too large.');
      const data=JSON.parse(await file.text());
      if(!data||data.version!==1||!data.record||typeof data.record!=='object')throw Error('Not a compatible outcome backup.');
      const next=normalise(data.record);
      fill(next);refresh();
      localStorage.setItem(OUTCOME_KEY,JSON.stringify({version:1,record:next}));
      persisted=next;
      notify('Outcome backup imported locally. Your Placement Desk shortlist was not changed.');
    }catch(err){notify('Could not import outcome: '+(err.message||'invalid file'))}
    event.target.value='';
  });
  $('outcomeClearBtn').addEventListener('click',()=>{
    if(!window.confirm('Clear your locally saved outcome? This does not affect Oriel or your shortlist.'))return;
    try{localStorage.removeItem(OUTCOME_KEY)}catch{}
    persisted=null;fill(empty());refresh();notify('Outcome cleared on this browser. Your shortlist is unchanged.');
  });

  // The Placement Desk dataset loads asynchronously; read its existing globals only.
  let checkCount=0;
  const timer=setInterval(()=>{
    checkCount++;
    if(getPlacements().length){
      const list=$('outcomeProgrammeOptions');
      const fragment=document.createDocumentFragment();
      getPlacements().forEach(p=>{const option=document.createElement('option');option.value=String(p.id).split('/').pop().trim();option.label=p.title||p.employer||'';fragment.append(option)});
      list.replaceChildren(fragment);
      refresh();
      clearInterval(timer);
    }else if(checkCount>=150){clearInterval(timer);refresh()}
  },400);
  document.addEventListener('desk:action',()=>{if(getPlacements().length)showComparison()});
  document.addEventListener('desk:pay-settings',refresh);
  refresh();
  // Shortlist viewing order is a presentation preference only.
  // Reorder rendered rows, never modify the desk's saved ranks or localStorage state.
  const shortlistOrderKey='oriel-shortlist-view-order-v1';
  const shortlistSelect=$('shortlistViewOrder');
  const shortlistList=$('shortlistList');
  if(shortlistSelect&&shortlistList){
    let displayOrder='asc';
    try{if(localStorage.getItem(shortlistOrderKey)==='desc')displayOrder='desc'}catch{}
    shortlistSelect.value=displayOrder;
    const priorityNumber=row=>{
      const label=row.querySelector('.rank-controls strong');
      const value=Number((label?.textContent||'').replace(/[^0-9]/g,''));
      return Number.isFinite(value)?value:0;
    };
    const arrangeShortlist=()=>{
      const rows=[...shortlistList.children].filter(row=>row.classList.contains('rank-row'));
      if(!rows.length)return;
      const direction=displayOrder==='desc'?-1:1;
      const sorted=[...rows].sort((a,b)=>direction*(priorityNumber(a)-priorityNumber(b)));
      if(rows.some((row,i)=>row!==sorted[i])){
        // Rows keep their rank numbers, notes and controls: only the visual sequence changes.
        shortlistList.replaceChildren(...sorted);
      }
      sorted.forEach(row=>{
        const higher=row.querySelector('[data-move="up"]');
        const lower=row.querySelector('[data-move="down"]');
        if(higher){
          higher.textContent=displayOrder==='desc'?'↓':'↑';
          higher.setAttribute('aria-label','Move to higher priority, closer to #1');
          higher.title='Move to higher priority, closer to #1';
        }
        if(lower){
          lower.textContent=displayOrder==='desc'?'↑':'↓';
          lower.setAttribute('aria-label','Move to lower priority, farther from #1');
          lower.title='Move to lower priority, farther from #1';
        }
      });
    };
    shortlistSelect.addEventListener('change',()=>{
      displayOrder=shortlistSelect.value==='desc'?'desc':'asc';
      try{localStorage.setItem(shortlistOrderKey,displayOrder)}catch{}
      arrangeShortlist();
    });
    const observer=new MutationObserver(arrangeShortlist);
    observer.observe(shortlistList,{childList:true});
    arrangeShortlist();
  }

})();
