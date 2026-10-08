function markFor(p){ return state.marks[p.id] || {status:'',rating:0,note:''}; }
function setMark(p, patch){ state.marks[p.id]={...markFor(p),...patch}; if(!state.marks[p.id].status&&!state.marks[p.id].rating&&!state.marks[p.id].note) delete state.marks[p.id]; saveState(); renderAll(); }
function toggleCompare(p){ const a=state.compare||[]; const i=a.indexOf(p.id); if(i>=0)a.splice(i,1); else { if(a.length>=5){toast('Compare up to 5 placements.');return;} a.push(p.id); } state.compare=a; saveState(); renderAll(); }

function filtersMatch(p){
  const q=$('searchInput').value.trim().toLowerCase(); if(q&&!textBlob(p).includes(q)) return false;
  if($('sectorFilter').value && sectorLabel(p)!==$('sectorFilter').value) return false;
  if($('regionFilter').value && p.region!==$('regionFilter').value) return false;
  if($('hoursFilter').value && (!p.hours || p.hours>Number($('hoursFilter').value))) return false;
  if($('salaryFilter').value && p.salary<Number($('salaryFilter').value)) return false;
  if(quick.has('london') && p.region.toLowerCase()!=='london') return false;
  if(quick.has('hospital') && weeks(p,'hospital')<26 && sectorLabel(p)!=='Hospital') return false;
  if(quick.has('gp') && weeks(p,'general practice')<26 && sectorLabel(p)!=='General Practice') return false;
  if(quick.has('split') && p.settings.length<2) return false;
  if(quick.has('industry') && !hasSetting(p,'industry')) return false;
  if(quick.has('under40') && (!p.hours || p.hours>40)) return false;
  if(quick.has('over30') && p.salary<30000) return false;
  return true;
}
function sortPlacements(arr){
  const s=$('sortSelect').value;
  return arr.sort((a,b)=>{
    if(s==='fit') return analyse(b).score-analyse(a).score || b.salary-a.salary;
    if(s==='salary') return b.salary-a.salary;
    if(s==='hourly') return hourly(b)-hourly(a);
    if(s==='hours') return (a.hours||999)-(b.hours||999);
    return a.employer.localeCompare(b.employer);
  });
}

function statusOptions(current){ return STATUS.map(([v,l])=>`<option value="${v}" ${current===v?'selected':''}>${l}</option>`).join(''); }
function placementCard(p, compact=false){
  const a=analyse(p), m=markFor(p), inCompare=state.compare.includes(p.id), site=p.postcodes.join(' · ')||'Postcode not detected';
  const sector=sectorLabel(p), hp=weeks(p,'hospital'),gp=weeks(p,'general practice'),cp=weeks(p,'community'),ip=weeks(p,'industry');
  const badges=[
    p.region?`📍 ${p.region}`:'', sector?`${sector==='Hospital'?'🏥':sector==='General Practice'?'🩺':sector==='Industry'?'🏭':'💊'} ${sector}`:'',
    p.hours?`⏱️ ${p.hours}h/week`:'', p.settings.length>1?'🔀 Split':'', hp?`🏥 ${hp}w`:'', gp?`🩺 ${gp}w`:'', cp?`🛍️ ${cp}w`:'', ip?`🏭 ${ip}w`:''
  ].filter(Boolean);
  return `<article class="placement-card card" data-id="${esc(p.id)}">
    <div class="card-top"><div class="title-wrap"><span class="eyebrow">${esc(site)}</span><h3>${esc(p.title||p.employer)}</h3><div class="employer">${esc(p.employer)}</div></div>
    <div class="money-box"><div class="salary">${p.salary?'£'+p.salary.toLocaleString():'Salary n/a'}</div><div class="hourly">${hourly(p)?'≈ £'+hourly(p).toFixed(2)+'/hr gross':''}</div></div></div>
    <div class="badges">${badges.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}${a.cautions.map(x=>`<span class="badge warn">${esc(x)}</span>`).join('')}</div>
    <div class="fit-strip"><div class="fit-score"><span>FOR YOU</span><strong>${a.score}</strong>${esc(a.band)}</div><div class="reasons">${(a.reasons.length?a.reasons:['🤷 Not enough strong signals either way']).map(x=>`<span class="reason">${esc(x)}</span>`).join('')}</div></div>
    ${compact?'':`<p class="description">${esc(p.desc||'No programme description supplied.')}</p><button class="more-btn" type="button">Read more</button>`}
    <div class="card-actions">
      <select class="status-select">${statusOptions(m.status)}</select>
      <div class="rating" aria-label="Your rating">${[1,2,3,4,5].map(n=>`<button data-rating="${n}" class="${m.rating>=n?'on':''}">⭐</button>`).join('')}</div>
      <input class="note-input" value="${esc(m.note||'')}" placeholder="📝 Your note…" />
      <button class="compare-toggle ${inCompare?'active':''}">${inCompare?'✓ Comparing':'⚖️ Compare'}</button>
      ${p.website&&p.website!=='-'?`<a class="link-btn" target="_blank" rel="noopener" href="${esc(/^https?:/i.test(p.website)?p.website:'https://'+p.website)}">Employer ↗</a>`:''}
      <a class="link-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.postcodes[0]||p.title)+', UK')}">Map ↗</a>
    </div>
  </article>`;
}

function bindCards(container){
  container.querySelectorAll('.placement-card').forEach(card=>{
    const p=placements.find(x=>x.id===card.dataset.id); if(!p)return;
    card.querySelector('.status-select')?.addEventListener('change',e=>setMark(p,{status:e.target.value}));
    card.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>setMark(p,{rating:Number(b.dataset.rating)})));
    const note=card.querySelector('.note-input'); if(note){ let tm; note.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>setMark(p,{note:note.value}),350)}); }
    card.querySelector('.compare-toggle')?.addEventListener('click',()=>toggleCompare(p));
    card.querySelector('.more-btn')?.addEventListener('click',e=>{const d=card.querySelector('.description');d.classList.toggle('open');e.target.textContent=d.classList.contains('open')?'Show less':'Read more';});
  });
}

function renderStats(){
  const marked=Object.values(state.marks); const shortlisted=marked.filter(m=>STATUS_SHORTLIST.has(m.status)).length;
  const london=placements.filter(p=>p.region.toLowerCase()==='london').length;
  const hospital=placements.filter(p=>sectorLabel(p)==='Hospital').length;
  const gp=placements.filter(p=>sectorLabel(p)==='General Practice').length;
  const maxSalary=Math.max(...placements.map(p=>p.salary),0);
  const strong=placements.filter(p=>analyse(p).score>=78).length;
  const data=[['❤️',shortlisted,'Shortlisted'],['📍',london,'London options'],['🏥',hospital,'Hospital-led'],['🩺',gp,'GP-led'],['💷',maxSalary?'£'+Math.round(maxSalary/1000)+'k':'—','Highest salary'],['✨',strong,'Strong-fit flags']];
  $('statsGrid').innerHTML=data.map(([e,v,l])=>`<div class="stat-card card"><div class="emoji">${e}</div><div class="value">${v}</div><div class="label">${l}</div></div>`).join('');
}
function renderExplore(){
  filtered=sortPlacements(placements.filter(filtersMatch));
  $('resultCount').textContent=`${filtered.length.toLocaleString()} placements`;
  const shown=filtered.slice(0,140);
  $('resultsList').innerHTML=shown.length?shown.map(p=>placementCard(p)).join(''):`<div class="card empty">No placements match these filters.</div>`;
  if(filtered.length>140) $('resultsList').insertAdjacentHTML('beforeend',`<div class="card empty">Showing the first 140 matches. Refine filters to narrow it down.</div>`);
  bindCards($('resultsList'));
}
function renderForYou(){
  const picks=placements.filter(p=>p.region.toLowerCase()==='london').map(p=>({p,a:analyse(p)})).sort((x,y)=>y.a.score-x.a.score||y.p.salary-x.p.salary).slice(0,16);
  $('recommendationGrid').innerHTML=picks.map(({p,a},i)=>`<article class="recommendation-card card"><div class="rank">#${i+1} TO LOOK AT</div><h3>${esc(p.title)}</h3><div class="badges"><span class="badge good">✨ ${a.score}/100</span><span class="badge">💷 ${p.salary?'£'+p.salary.toLocaleString():'n/a'}</span><span class="badge">⏱️ ${p.hours||'?'}h</span></div><p>${esc(a.reasons.slice(0,3).join(' · ')||'Potentially worth a closer look based on your current preferences.')}</p><button class="btn small open-placement" data-id="${esc(p.id)}">Open in Explore</button></article>`).join('');
  $('recommendationGrid').querySelectorAll('.open-placement').forEach(b=>b.addEventListener('click',()=>{ switchTab('explore'); $('searchInput').value=placements.find(x=>x.id===b.dataset.id)?.title||''; renderExplore(); window.scrollTo({top:0,behavior:'smooth'}); }));
}
function renderShortlist(){
  const list=placements.filter(p=>STATUS_SHORTLIST.has(markFor(p).status)).sort((a,b)=>(markFor(b).rating||0)-(markFor(a).rating||0)||analyse(b).score-analyse(a).score);
  $('shortlistList').innerHTML=list.length?list.map(p=>placementCard(p,true)).join(''):`<div class="card empty">Nothing shortlisted yet. Mark placements 😍 ❤️ 🤔 or 😐 and they’ll appear here.</div>`;
  bindCards($('shortlistList'));
}
function renderCompare(){
  const list=(state.compare||[]).map(id=>placements.find(p=>p.id===id)).filter(Boolean);
  if(!list.length){ $('compareArea').innerHTML='<div class="card empty">Pick up to 5 placements using ⚖️ Compare.</div>'; return; }
  const rows=[
    ['Salary',p=>p.salary?'£'+p.salary.toLocaleString():'—'],['Hours',p=>p.hours?p.hours+'h/week':'—'],['Effective hourly',p=>hourly(p)?'£'+hourly(p).toFixed(2):'—'],['Sector',sectorLabel],['Split',splitLabel],['Hospital weeks',p=>weeks(p,'hospital')||'—'],['GP weeks',p=>weeks(p,'general practice')||'—'],['Community weeks',p=>weeks(p,'community')||'—'],['Industry weeks',p=>weeks(p,'industry')||'—'],['For You',p=>`${analyse(p).score}/100 · ${analyse(p).band}`],['Best signals',p=>analyse(p).reasons.slice(0,3).join(' · ')||'—'],['Cautions',p=>analyse(p).cautions.join(' · ')||'—'],['Your status',p=>STATUS.find(x=>x[0]===markFor(p).status)?.[1]||'Unmarked'],['Your rating',p=>markFor(p).rating?'⭐'.repeat(markFor(p).rating):'—']
  ];
  $('compareArea').innerHTML=`<table class="compare-table"><thead><tr><th>Attribute</th>${list.map(p=>`<th>${esc(p.employer)}<br><span class="muted">${esc(p.postcodes[0]||'')}</span></th>`).join('')}</tr></thead><tbody>${rows.map(([l,fn])=>`<tr><th>${l}</th>${list.map(p=>`<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderSettings(){
  const labels={money:'💷 Money',hospital:'🏥 Hospital',gp:'🩺 GP',lifestyle:'🧘 Lifestyle / hours',location:'📍 Area fit',progression:'🚀 CV & progression',independence:'🎧 Independent-work signals',communityPenalty:'🛍️ Penalise community-heavy'};
  $('weightControls').innerHTML=Object.entries(state.prefs.weights).map(([k,v])=>`<div class="weight-row"><span>${labels[k]||k}</span><input type="range" min="0" max="5" step="1" value="${v}" data-weight="${k}"><span class="weight-value">${v}</span></div>`).join('');
  $('weightControls').querySelectorAll('[data-weight]').forEach(r=>r.addEventListener('input',e=>{state.prefs.weights[e.target.dataset.weight]=Number(e.target.value);e.target.parentElement.querySelector('.weight-value').textContent=e.target.value;saveState();renderStats();renderForYou();renderExplore();}));
  $('likedAreas').value=state.prefs.likedAreas||''; $('avoidAreas').value=state.prefs.avoidAreas||'';
}
function renderAll(){ renderStats(); renderExplore(); renderForYou(); renderShortlist(); renderCompare(); renderSettings(); }
function populateFilters(){
  const sectors=[...new Set(placements.map(sectorLabel).filter(Boolean))].sort();
  $('sectorFilter').innerHTML='<option value="">Any</option>'+sectors.map(x=>`<option>${esc(x)}</option>`).join('');
  const regions=[...new Set(placements.map(p=>p.region).filter(Boolean))].sort();
  $('regionFilter').innerHTML='<option value="">Any</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join('');
}
function switchTab(name){
  currentTab=name; document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active')); $(`${name}Tab`).classList.add('active');
}
async function uploadCsv(file){
  const csv=await file.text(); const test=rowsToPlacements(csv); placements=test; uploadedMeta={name:file.name,date:new Date().toISOString()}; localStorage.setItem(DATA_KEY,JSON.stringify({csv,meta:uploadedMeta})); populateFilters(); renderAll(); toast(`Loaded ${placements.length.toLocaleString()} placements from ${file.name}`);
}
function backup(){
  const payload={version:1,exportedAt:new Date().toISOString(),state,uploaded:localStorage.getItem(DATA_KEY)?JSON.parse(localStorage.getItem(DATA_KEY)):null};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='phivos-placement-desk-backup.json';a.click();URL.revokeObjectURL(a.href);toast('Backup downloaded 💾');
}
async function setBase(){
  const q=$('baseLocation').value.trim(); state.prefs.base=q; saveState(); if(!q){baseCoord=null;$('baseLocationStatus').textContent='No base set.';return;}
  $('baseLocationStatus').textContent='Checking area…';
  try{
    const isPc=/^[A-Z]{1,2}\d[A-Z\d]?\s?(\d[A-Z]{2})?$/i.test(q);
    if(isPc){ const clean=q.replace(/\s+/g,''); const full=/\d[A-Z]{2}$/i.test(clean); const u=`https://api.postcodes.io/${full?'postcodes':'outcodes'}/${encodeURIComponent(clean)}`; const j=await fetch(u).then(r=>r.json()); if(!j.result) throw 0; baseCoord=[j.result.latitude,j.result.longitude]; }
    else { const j=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q='+encodeURIComponent(q)).then(r=>r.json()); if(!j[0]) throw 0; baseCoord=[+j[0].lat,+j[0].lon]; }
    $('baseLocationStatus').textContent=`Base set to “${q}”. Placement cards still prioritise area fit over current-home distance.`;
  }catch{$('baseLocationStatus').textContent='Could not find that area. Try a postcode or well-known place.';}
}

function bindGlobal(){
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  ['searchInput','sectorFilter','regionFilter','hoursFilter','salaryFilter','sortSelect'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',renderExplore));
  $('quickFilters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.qf;quick.has(k)?quick.delete(k):quick.add(k);b.classList.toggle('active',quick.has(k));renderExplore();}));
  $('resetFilters').addEventListener('click',()=>{$('searchInput').value='';$('sectorFilter').value='';$('regionFilter').value='';$('hoursFilter').value='';$('salaryFilter').value='';quick.clear();$('quickFilters').querySelectorAll('button').forEach(b=>b.classList.remove('active'));renderExplore();});
  $('uploadBtn').addEventListener('click',()=> $('uploadInput').click()); $('uploadInput').addEventListener('change',e=>{if(e.target.files[0]) uploadCsv(e.target.files[0]).catch(err=>alert(err.message));e.target.value='';});
  $('backupBtn').addEventListener('click',backup); $('clearCompare').addEventListener('click',()=>{state.compare=[];saveState();renderCompare();renderExplore();});
  $('savePrefsBtn').addEventListener('click',()=>{state.prefs.likedAreas=$('likedAreas').value;state.prefs.avoidAreas=$('avoidAreas').value;saveState();renderAll();toast('Preferences saved ✨');});
  $('clearDataBtn').addEventListener('click',()=>{if(confirm('Clear your Placement Desk data from this browser?')){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(DATA_KEY);location.reload();}});
  $('setBaseBtn').addEventListener('click',setBase); $('baseLocation').addEventListener('keydown',e=>{if(e.key==='Enter')setBase();});
}

(async function init(){
  bindGlobal(); $('baseLocation').value=state.prefs.base||''; $('resultsList').innerHTML='<div class="card loading">Loading Oriel placement data…</div>';
  try { await loadBuiltIn(); populateFilters(); renderAll(); if(uploadedMeta) toast(`Restored ${uploadedMeta.name}`); }
  catch(err){ console.error(err); $('resultsList').innerHTML=`<div class="card empty">Couldn’t load the built-in snapshot. You can still use “Upload Oriel CSV”.</div>`; }
})();
