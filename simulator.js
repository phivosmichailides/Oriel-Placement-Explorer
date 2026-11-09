'use strict';
/* Private Oriel practice desk. Intentionally independent of official Oriel and core saved rankings. */
(()=>{
 const KEY='oriel-simulator-v1',ZKEY='oriel-simulator-zoom-v1';
 const Z=['preferred','neutral','unwanted'];
 const labels={preferred:'Preference',neutral:'No Preference',unwanted:'Not Wanted'};
 const $=id=>document.getElementById(id);
 const el=(tag,cl,value)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(value!==undefined)e.textContent=String(value);return e};
 const codes=p=>String(p.id||'').split('/').pop().trim();
 const data=()=>{try{return typeof placements!=='undefined'&&Array.isArray(placements)?placements:[]}catch{return []}};
 const rankedHere=()=>{try{return typeof ranked==='function'?ranked():[]}catch{return []}};
 const byId=new Map(),all=[];
 let state={preferred:[],neutral:[],unwanted:[]},show={preferred:75,neutral:75,unwanted:75},zoom=100,started=false;
 const msg=x=>{if($('simToast'))$('simToast').textContent=x};
 function load(){
   try{let r=JSON.parse(localStorage.getItem(KEY)||'null');if(r&&r.version===1)for(const z of Z)if(Array.isArray(r[z]))state[z]=r[z].filter(s=>typeof s==='string').slice(0,5000)}catch{}
   try{zoom=Number(localStorage.getItem(ZKEY)||100)}catch{}if(!Number.isFinite(zoom)||zoom<65||zoom>145)zoom=100;
 }
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({version:1,preferred:state.preferred,neutral:state.neutral,unwanted:state.unwanted}))}catch{msg('Browser storage unavailable. Export a backup.')}};
 function indexData(){
   byId.clear();all.splice(0);
   for(const p of data()){byId.set(p.id,p);all.push(p)}
   const seen=new Set();for(const z of Z)state[z]=state[z].filter(id=>byId.has(id)&&!seen.has(id)&&seen.add(id));
 }
 const zoneOf=id=>Z.find(z=>state[z].includes(id));
 function move(id,zone,index){
   if(!byId.has(id)||!Z.includes(zone))return;
   const old=zoneOf(id),oldIndex=old?state[old].indexOf(id):-1;
   if(old)state[old].splice(oldIndex,1);
   const items=state[zone];
   let at=Number.isInteger(index)?Math.max(0,Math.min(items.length,index)):items.length;
   if(old===zone&&oldIndex<at)at--;
   items.splice(at,0,id);save();render();
 }
 function remove(id){const zone=zoneOf(id);if(!zone)return;state[zone].splice(state[zone].indexOf(id),1);save();render()}
 function copy(value,button){
   const done=()=>{button.classList.add('simCopied');msg('Copied Oriel code '+value+'. Paste into official Oriel.');setTimeout(()=>button.classList.remove('simCopied'),900)};
   const fallback=()=>{
     const input=el('textarea');input.value=value;input.style.cssText='position:fixed;left:-9999px';
     document.body.append(input);input.select();let ok=false;try{ok=document.execCommand('copy')}catch{}
     input.remove();if(ok)done();else msg('Clipboard unavailable. Copy this code manually: '+value);
   };
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(done,fallback);else fallback();
 }
 const saveFile=(name,content,mime)=>{
   const url=URL.createObjectURL(new Blob([content],{type:mime})),a=el('a');a.href=url;a.download=name;
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
 };
 const csv=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 function exportCSV(){
   const rows=[['Category','Rank','Oriel programme code','Programme title','Employer','Gross salary','Weekly hours']];
   for(const z of Z)state[z].forEach((id,i)=>{const p=byId.get(id);if(p)rows.push([labels[z],i+1,codes(p),p.title,p.employer,p.salary,p.hours])});
   saveFile('oriel-simulation-ranked.csv',rows.map(row=>row.map(csv).join(',')).join('\r\n'),'text/csv');
   msg('Exported your simulation order. This does not update Oriel.');
 }
 function markup(){
   const tab=el('button','tab');tab.type='button';tab.dataset.tab='simulator';
   tab.innerHTML='<span class="simNavIcon" aria-hidden="true">▥</span><span>Oriel Simulation</span>';
   document.querySelector('nav.tabs [data-tab="outcome"]').before(tab);
   tab.addEventListener('click',()=>{if(typeof switchTab==='function')switchTab('simulator')});
   const section=el('section','panel');section.id='simulator';
   section.innerHTML=
    '<div class="sectionHero card simHero"><div><div class="eyebrow">PRIVATE ORIEL PRACTICE WORKSPACE</div><h2>Oriel Simulation</h2><p>Organise programmes into the three official category names, drag or reorder them, and copy their exact codes. <b>This never updates your actual Oriel application or the main Placement Atlas shortlist.</b></p></div><div class="simHeroActions"><a class="btn" href="https://www.oriel.nhs.uk/" target="_blank" rel="noopener noreferrer">Open official Oriel ↗</a><button class="btn simSplitButton" id="simOpenSplit" type="button">Open official Oriel in split view</button><small class="simSplitHelp" id="simSplitHelp">Opens a second tab. In Chrome, right-click the Oriel tab and choose “Add tab to new split view”, then select this Desk.</small></div></div>'+
    '<div class="simSummary card"><div><div class="eyebrow">PROGRAMMES ORGANISED</div><div class="simSummaryBig"><strong id="simCount">0</strong><span> / </span><strong id="simTotal">4,064</strong></div><p id="simRemaining">Loading…</p></div><div class="simTools"><div class="simZoom"><button class="btn" id="simZoomOut" type="button" aria-label="Zoom out">−</button><output id="simZoomValue">100%</output><button class="btn" id="simZoomIn" type="button" aria-label="Zoom in">+</button><button class="btn" id="simZoomReset" type="button">Reset</button></div><button class="btn" id="simImport" type="button">Import my shortlist</button><button class="btn" id="simCSV" type="button">Export ranked CSV</button><button class="btn" id="simBackup" type="button">Backup</button><button class="btn" id="simRestore" type="button">Restore</button><input hidden id="simRestoreFile" type="file" accept=".json,application/json"><button class="btn danger" id="simClear" type="button">Clear simulation</button></div></div>'+
    '<p class="simHint">Search by name, town or code; click a result to add it. Drag a card to another column, use its dropdown to move it, or click its number to change rank. The copy icon copies the four-digit programme code for pasting into Oriel.</p>'+
    '<div class="simViewport"><div class="simColumns" id="simColumns">'+
     Z.map(z=>'<section class="simCol" data-sim-col="'+z+'"><header><div class="simColHeading"><div><div class="eyebrow">'+(z==='preferred'?'RANKED IN YOUR CHOSEN ORDER':z==='neutral'?'ACCEPTABLE UNRANKED':'NOT ACCEPTABLE')+'</div><h3>'+labels[z]+' <small data-sim-count="'+z+'">0</small></h3></div><span aria-hidden="true">'+(z==='preferred'?'♥':z==='neutral'?'○':'×')+'</span></div><label for="simInput-'+z+'">Add programme</label><input id="simInput-'+z+'" data-sim-input="'+z+'" type="search" autocomplete="off" placeholder="Search name, postcode or code…"><div class="simResults" data-sim-results="'+z+'"></div></header><div class="simList" data-sim-list="'+z+'"></div><div data-sim-more="'+z+'" class="simMore"></div></section>').join('')+
    '</div></div><div class="card simFoot"><div><strong>Unassigned is separate from No Preference here.</strong><p>Unassigned programmes have not yet been placed in this simulation. Official Oriel may handle unselected programmes differently.</p></div><button class="btn" id="simAssignAll" type="button">Place all remaining in Not Wanted…</button></div><p class="smallnote" role="status" aria-live="polite" id="simToast">Simulator data is saved locally only.</p>';
   document.getElementById('shortlist').after(section);
 }
 function search(zone){
   const input=document.querySelector('[data-sim-input="'+zone+'"]');
   const results=document.querySelector('[data-sim-results="'+zone+'"]');if(!input||!results)return;
   const query=input.value.toLowerCase().trim();results.replaceChildren();if(!query)return;
   const terms=query.split(/\s+/).filter(Boolean),found=all.filter(p=>{
     const text=(codes(p)+' '+p.title+' '+p.employer+' '+p.region+' '+(p.postcodes||[]).join(' ')).toLowerCase();
     return terms.every(s=>text.includes(s));
   }).slice(0,12);
   if(!found.length){results.append(el('div','simEmpty','No matching programmes.'));return}
   for(const p of found){
     const b=el('button','simResult');b.type='button';b.draggable=true;
     b.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move'});
     b.append(el('span','simResultCode',codes(p)),el('span','simResultName',p.title||p.employer));
     const existing=zoneOf(p.id);if(existing)b.append(el('small','simResultStatus',labels[existing]));
     b.addEventListener('click',()=>{move(p.id,zone);input.value='';results.replaceChildren();msg('Added '+codes(p)+' to '+labels[zone]+'.')});
     results.append(b);
   }
 }
 function card(p,z,i){
   const item=el('article','simItem');item.draggable=true;item.dataset.simId=p.id;
   const rank=el('button','simRank',i+1);rank.type='button';rank.title='Change position';
   rank.addEventListener('click',()=>{
     const n=window.prompt('Move '+codes(p)+' to position 1–'+state[z].length, String(i+1));
     if(n===null)return;const number=Number(n);
     if(!Number.isInteger(number)||number<1||number>state[z].length){msg('Please enter a number between 1 and '+state[z].length);return}
     const list=state[z];list.splice(list.indexOf(p.id),1);list.splice(number-1,0,p.id);save();render();
   });
   const main=el('div','simItemMain');
   const name=el('button','simItemName simItemNameButton',p.title||p.employer||'Untitled programme');
   name.type='button';name.title='View programme pay, hours, settings and locations';
   name.setAttribute('aria-label','Preview '+(p.title||p.employer||'programme'));
   name.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.OrielProgrammePreview?.open(p.id)});
   main.append(name);
   main.append(el('small','simItemMeta',codes(p)+' · '+(p.region||'Region not stated')+(p.salary?' · £'+Number(p.salary).toLocaleString('en-GB'):'')));
   const actions=el('div','simItemActions');
   const copyBtn=el('button','simIcon simCopy');copyBtn.type='button';
   copyBtn.title='Copy programme code '+codes(p);copyBtn.setAttribute('aria-label',copyBtn.title);
   copyBtn.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
   copyBtn.addEventListener('click',()=>copy(codes(p),copyBtn));
   const up=el('button','simIcon','↑');up.type='button';up.title='Move up';up.disabled=i===0;
   up.addEventListener('click',()=>{if(i>0){const list=state[z];[list[i-1],list[i]]=[list[i],list[i-1]];save();render()}});actions.append(up);
   const down=el('button','simIcon','↓');down.type='button';down.title='Move down';down.disabled=i>=state[z].length-1;
   down.addEventListener('click',()=>{if(i<state[z].length-1){const list=state[z];[list[i+1],list[i]]=[list[i],list[i+1]];save();render()}});actions.append(down);
   const select=el('select','simMove');select.setAttribute('aria-label','Move programme to another category');
   for(const next of Z){const opt=el('option',null,labels[next]);opt.value=next;opt.selected=next===z;select.append(opt)}
   const rem=el('option',null,'Remove');rem.value='unassigned';select.append(rem);
   select.addEventListener('change',()=>{if(select.value==='unassigned')remove(p.id);else move(p.id,select.value)});actions.append(select);
   item.append(rank,main,copyBtn,actions);
   item.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';item.classList.add('simDragging')});
   item.addEventListener('dragend',()=>item.classList.remove('simDragging'));
   item.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();item.classList.add('simHover')});
   item.addEventListener('dragleave',()=>item.classList.remove('simHover'));
   item.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();item.classList.remove('simHover');
     const id=e.dataTransfer.getData('text/plain');if(!byId.has(id))return;
     const rect=item.getBoundingClientRect();move(id,z,i+(e.clientY>rect.top+rect.height/2?1:0));
   });
   return item;
 }
 function render(){
   const total=all.length,assigned=Z.reduce((a,z)=>a+state[z].length,0);
   if($('simCount'))$('simCount').textContent=assigned.toLocaleString('en-GB');
   if($('simTotal'))$('simTotal').textContent=total.toLocaleString('en-GB');
   if($('simRemaining'))$('simRemaining').textContent=(total-assigned).toLocaleString('en-GB')+' programmes remain unassigned';
   for(const z of Z){
     const area=document.querySelector('[data-sim-list="'+z+'"]'),counter=document.querySelector('[data-sim-count="'+z+'"]'),more=document.querySelector('[data-sim-more="'+z+'"]');
     if(counter)counter.textContent=state[z].length.toLocaleString('en-GB');
     if(!area)continue;area.replaceChildren();if(more)more.replaceChildren();
     const ids=state[z].slice(0,show[z]);
     if(!ids.length)area.append(el('div','simEmpty','Add programmes using the search bar above.'));
     else{const frag=document.createDocumentFragment();for(let i=0;i<ids.length;i++){const p=byId.get(ids[i]);if(p)frag.append(card(p,z,i))}area.append(frag)}
     if(ids.length<state[z].length&&more){const btn=el('button','btn','Show 100 more · '+(state[z].length-ids.length)+' remaining');
       btn.type='button';btn.addEventListener('click',()=>{show[z]+=100;render()});more.append(btn)}
   }
 }
 function setZoom(n){
   zoom=Math.max(65,Math.min(145,Math.round(n/5)*5));
   try{localStorage.setItem(ZKEY,String(zoom))}catch{}
   if($('simColumns'))$('simColumns').style.zoom=String(zoom/100);
   if($('simZoomValue'))$('simZoomValue').textContent=zoom+'%';
   $('simZoomOut').disabled=zoom<=65;$('simZoomIn').disabled=zoom>=145;
 }
 function bind(){
   for(const z of Z){
     const input=document.querySelector('[data-sim-input="'+z+'"]');
     input.addEventListener('input',()=>search(z));
     input.addEventListener('keydown',e=>{
       if(e.key==='Enter'){e.preventDefault();document.querySelector('[data-sim-results="'+z+'"] .simResult')?.click()}
       if(e.key==='Escape'){input.value='';search(z)}
     });
     const list=document.querySelector('[data-sim-list="'+z+'"]');
     const col=document.querySelector('[data-sim-col="'+z+'"]');
     col?.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move'});
     col?.addEventListener('drop',e=>{
       if(e.target.closest('.simItem')||e.target.closest('.simList'))return;
       e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(byId.has(id))move(id,z);
     });
     list.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move'});
     list.addEventListener('drop',e=>{if(e.target.closest('.simItem'))return;e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(byId.has(id))move(id,z)});
   }
   $('simOpenSplit')?.addEventListener('click',()=>{
     const opened=window.open('https://www.oriel.nhs.uk/','_blank');
     const help=$('simSplitHelp');
     if(opened){
       try{opened.opener=null}catch{}
       if(help)help.textContent='Oriel opened in a new tab. Right-click its tab → “Add tab to new split view” → choose this Placement Desk.';
       msg('Official Oriel opened in a new tab. Use Chrome’s tab menu to pair it with this Desk.');
     }else{
       if(help)help.textContent='Chrome blocked the new tab. Allow pop-ups for this site, then try again.';
       msg('Chrome blocked the new tab. Allow pop-ups for this site and try again.');
     }
   });
   $('simZoomOut').addEventListener('click',()=>setZoom(zoom-10));
   $('simZoomIn').addEventListener('click',()=>setZoom(zoom+10));
   $('simZoomReset').addEventListener('click',()=>setZoom(100));
   $('simImport').addEventListener('click',()=>{
     const fresh=rankedHere().filter(p=>byId.has(p.id)&&!zoneOf(p.id));
     if(!fresh.length){msg('All saved shortlist programmes are already included, or the shortlist is empty.');return}
     if(!confirm('Add '+fresh.length+' currently shortlisted programmes in their ranked order to your simulation Preference column?'))return;
     state.preferred.push(...fresh.map(p=>p.id));save();render();msg('Imported '+fresh.length+' programmes into the simulation.');
   });
   $('simCSV').addEventListener('click',exportCSV);
   $('simBackup').addEventListener('click',()=>saveFile('oriel-simulation-backup.json',JSON.stringify({version:1,...state},null,2),'application/json'));
   $('simRestore').addEventListener('click',()=>$('simRestoreFile').click());
   $('simRestoreFile').addEventListener('change',async e=>{
     const f=e.target.files?.[0];if(!f)return;
     try{if(f.size>1500000)throw Error('File is too large');
       const obj=JSON.parse(await f.text());if(obj?.version!==1||!Z.every(z=>Array.isArray(obj[z])))throw Error('Not a compatible backup');
       if(!confirm('Replace the three SIMULATION lists with this backup? Your main Placement Desk will remain unchanged.'))return;
       for(const z of Z)state[z]=obj[z].filter(x=>typeof x==='string').slice(0,5000);
       indexData();save();render();msg('Simulation backup restored.');
     }catch(err){msg('Could not restore: '+err.message)}finally{e.target.value=''}
   });
   $('simClear').addEventListener('click',()=>{
     if(!confirm('Clear every SIMULATION column? Your real Oriel and main Placement Desk data will not change.'))return;
     state={preferred:[],neutral:[],unwanted:[]};show={preferred:75,neutral:75,unwanted:75};save();render();msg('Simulation cleared.');
   });
   $('simAssignAll').addEventListener('click',()=>{
     const remaining=all.filter(p=>!zoneOf(p.id)).map(p=>p.id);
     if(!remaining.length){msg('All programmes are organised.');return}
     if(!confirm('Place ALL '+remaining.length+' unassigned programmes into simulator Not Wanted?'))return;
     state.unwanted.push(...remaining);save();render();msg(remaining.length+' added to simulator Not Wanted.');
   });
   setZoom(zoom);
 }
 if(!document.querySelector('nav.tabs [data-tab="outcome"]'))return;
 markup();load();
 let n=0;const poll=setInterval(()=>{
   const items=data();n++;
   if(items.length&&!started){
     indexData();bind();render();started=true;clearInterval(poll);
   }else if(n>260){clearInterval(poll);msg('No programme data loaded yet; refresh to try again.')}
 },150);
 document.addEventListener('desk:dataset',()=>{if(!started)return;indexData();save();render()});
})();
