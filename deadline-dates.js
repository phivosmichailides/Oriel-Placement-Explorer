'use strict';
(()=>{
  const DEADLINE=new Date('2026-10-22T12:00:00+01:00');

  const escLocal=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const parseOrielDate=value=>{
    const s=String(value||'').trim();
    if(!s)return null;
    const uk=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(uk)return new Date(Date.UTC(+uk[3],+uk[2]-1,+uk[1],12));
    const iso=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(iso)return new Date(Date.UTC(+iso[1],+iso[2]-1,+iso[3],12));
    const d=new Date(s);
    return Number.isNaN(d.getTime())?null:d;
  };

  const fmtDate=d=>d?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d):'';

  const durationWeeks=p=>{
    const n=(p.settings||[]).reduce((sum,x)=>sum+(Number(x?.[1])||0),0);
    return n>0&&n<=80?n:52;
  };

  const dateRow=p=>{
    const start=parseOrielDate(p.start);
    if(!start)return '<div class="programmeDates"><span>📅 Start date not stated</span></div>';
    const weeks=durationWeeks(p);
    const end=new Date(start.getTime()+weeks*7*86400000);
    return `<div class="programmeDates"><span><b>Starts</b> ${escLocal(fmtDate(start))}</span><span class="dateDivider">→</span><span><b>Est. finish</b> ~${escLocal(fmtDate(end))}</span><span class="dateBasis">${weeks} weeks · end date estimated from listed training duration</span></div>`;
  };

  const installDates=()=>{
    if(window.__programmeDatesInstalled||typeof card!=='function')return false;
    window.__programmeDatesInstalled=true;
    const baseCard=card;
    card=(p,compact=false)=>{
      const html=baseCard(p,compact);
      const row=dateRow(p);
      return html.replace('<div class="fit fitExpanded">',`${row}<div class="fit fitExpanded">`);
    };
    try{renderAll();}catch{
      try{explore();reco();shortlist();}catch{}
    }
    return true;
  };

  const installCountdown=()=>{
    if(document.getElementById('orielDeadline'))return;
    const actions=document.querySelector('header.top .actions');
    if(!actions)return;
    const box=document.createElement('div');
    box.id='orielDeadline';
    box.className='deadlineBox';
    box.innerHTML='<div class="deadlineLabel">ORIEL SELECTION DEADLINE</div><div class="deadlineValue" id="deadlineValue">Calculating…</div><div class="deadlineExact">22 Oct 2026 · 12:00 UK</div>';
    actions.prepend(box);

    const tick=()=>{
      const out=document.getElementById('deadlineValue');
      if(!out)return;
      let ms=DEADLINE.getTime()-Date.now();
      if(ms<=0){out.textContent='Selection window closed';box.classList.add('deadlineClosed');return;}
      box.classList.remove('deadlineClosed');
      const d=Math.floor(ms/86400000);ms%=86400000;
      const h=Math.floor(ms/3600000);ms%=3600000;
      const m=Math.floor(ms/60000);ms%=60000;
      const s=Math.floor(ms/1000);
      out.textContent=`${d}d ${h}h ${m}m ${s}s`;
      box.classList.toggle('deadlineSoon',d<2);
    };
    tick();
    setInterval(tick,1000);
  };

  const installStyles=()=>{
    if(document.getElementById('deadlineDateStyles'))return;
    const st=document.createElement('style');
    st.id='deadlineDateStyles';
    st.textContent=`
      .programmeDates{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;margin:9px 0 2px;padding:8px 10px;border:1px solid #e4e7e4;background:#fafbf9;border-radius:11px;font-size:11px;color:#555b57}.programmeDates b{color:#252927}.dateDivider{color:#9aa09b}.dateBasis{margin-left:auto;color:var(--mut);font-size:10px}
      .deadlineBox{min-width:190px;padding:8px 11px;border:1px solid #d9e5dc;background:#f5faf7;border-radius:12px;text-align:right;box-shadow:0 4px 14px rgba(25,60,42,.05)}.deadlineLabel{font-size:9px;letter-spacing:.09em;font-weight:850;color:#567064}.deadlineValue{font-size:17px;line-height:1.15;font-weight:900;letter-spacing:-.02em;color:#164d3d;margin:2px 0}.deadlineExact{font-size:10px;color:var(--mut)}.deadlineBox.deadlineSoon{background:#fff7e8;border-color:#ead5a9}.deadlineBox.deadlineSoon .deadlineValue{color:#9a5b0d}.deadlineBox.deadlineClosed{background:#fff0f0;border-color:#e7caca}.deadlineBox.deadlineClosed .deadlineValue{font-size:13px;color:#9b3838}
      @media(max-width:720px){.deadlineBox{width:100%;text-align:left;order:-1}.dateBasis{flex-basis:100%;margin-left:0}}
    `;
    document.head.appendChild(st);
  };

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    installStyles();
    installCountdown();
    const dates=installDates();
    if((dates||window.__programmeDatesInstalled)&&document.getElementById('orielDeadline'))clearInterval(timer);
    if(tries>120)clearInterval(timer);
  },100);
})();
