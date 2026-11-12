'use strict';
/* Shortlist-only presentation and print-ready PDF export.
   All programme records, saved decisions and ranking values remain untouched. */
(()=>{
  const $=id=>document.getElementById(id);
  const formatTitle=value=>{
    let text=String(value||'').replace(/[\u00a0\u2007\u202f]/g,' ').normalize('NFC').trim();
    text=text
      .replace(/\s*&\s*/g,' & ')
      .replace(/\s*\+\s*/g,' + ')
      .replace(/\s*\/\s*/g,' / ')
      .replace(/\bHosp\.?(?=\s|$)/gi,'Hospital')
      .replace(/\bPCN\s*\(/gi,'PCN (')
      .replace(/([A-Za-z0-9])\(/g,'$1 (')
      .replace(/\s+\)/g,')')
      .replace(/\s+,/g,',')
      .replace(/,\s*/g,', ')
      .replace(/\s{2,}/g,' ')
      .trim();
    return text;
  };
  window.AtlasFormatShortlistTitle=formatTitle;

  const readableEmployer=value=>{
    const raw=String(value||'').trim();
    if(!raw||raw!==raw.toLocaleUpperCase('en-GB'))return raw;
    let text=raw.toLocaleLowerCase('en-GB').replace(/\b([a-z])/g,letter=>letter.toUpperCase());
    text=text
      .replace(/\bAnd\b/g,'and')
      .replace(/\bOf\b/g,'of')
      .replace(/\bThe\b/g,'the')
      .replace(/\bFor\b/g,'for')
      .replace(/\bNhs\b/g,'NHS')
      .replace(/\bUclh\b/g,'UCLH')
      .replace(/\bGstt\b/g,'GSTT')
      .replace(/\bPcn\b/g,'PCN');
    return text;
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const money=value=>'£'+Math.round(Number(value)||0).toLocaleString('en-GB');
  const statusLabel=status=>({
    love:'Love',yes:'Strong yes',maybe:'Maybe',backup:'Only if needed',
    no:'No',never:'Absolutely not'
  }[status]||'Unmarked');

  const polishCard=card=>{
    const heading=card.querySelector(':scope > .placementTop h3');
    if(heading){
      const display=heading.querySelector('.atlasTitleConcise,.atlasWorkspaceTitleConcise');
      const original=heading.querySelector('.atlasTitleOriginal,.atlasWorkspaceTitleOriginal');
      if(display&&display.textContent!==formatTitle(display.textContent))
        display.textContent=formatTitle(display.textContent);
      if(original&&original.textContent!==formatTitle(original.textContent))
        original.textContent=formatTitle(original.textContent);
      if(!display&&!original){
        const formatted=formatTitle(heading.textContent);
        if(heading.textContent!==formatted)heading.textContent=formatted;
      }
      const full=original?.textContent||display?.textContent||heading.textContent;
      if(full)heading.title=formatTitle(full);
    }
    const employer=card.querySelector(':scope > .placementTop .employer');
    if(employer){
      const formatted=readableEmployer(employer.textContent);
      if(employer.textContent!==formatted)employer.textContent=formatted;
    }
    const quiz=card.querySelector(':scope > .fit .score .atlasFitQuizLink');
    if(quiz&&quiz.textContent!=='Take quiz')quiz.textContent='Take quiz';
    const small=card.querySelector(':scope > .fit .score small');
    if(small&&small.textContent.trim()==='Not personalised')
      small.textContent='Not personalised yet';
    const facts=card.querySelector(':scope > .atlasShortlistFacts > summary');
    if(facts&&facts.textContent!=='Rotation details')
      facts.textContent='Rotation details';
  };

  const printRankedShortlist=()=>{
    let items=[];
    try{items=typeof ranked==='function'?ranked():[]}catch{}
    if(!items.length){
      try{if(typeof toast==='function')toast('Add programmes to your shortlist first.')}catch{}
      return;
    }
    const rows=items.map((programme,index)=>{
      let decision={};
      try{decision=typeof mark==='function'?mark(programme):((window.state?.marks||{})[programme.id]||{})}catch{}
      const estimate=Number(programme.salary)>0?window.OrielPay?.estimate?.(Number(programme.salary)):null;
      const title=formatTitle(programme.title||programme.employer||'Programme');
      const employer=readableEmployer(programme.employer||'Employer not stated');
      const sites=Array.isArray(programme.postcodes)?programme.postcodes.filter(Boolean).join(' · '):'';
      const rotations=Array.isArray(programme.settings)?programme.settings.map(row=>{
        if(Array.isArray(row))return row[0]?(String(row[0])+(row[1]?' · '+row[1]+' weeks':'')):'';
        if(row&&typeof row==='object')return row.name?(String(row.name)+(row.weeks?' · '+row.weeks+' weeks':'')):'';
        return '';
      }).filter(Boolean).join(' · '):'';
      const facts=[
        ['Programme ID',String(programme.id||'').split('/').pop()||'Not stated'],
        ['Location',([programme.area,programme.region].filter(Boolean).join(' · ')||'Not stated')+(sites?' · '+sites:'')],
        ['Training',rotations||'Rotation details not stated'],
        ['Hours',programme.hours?programme.hours+' hours/week':'Not stated'],
        ['Training places',programme.places?String(programme.places):'Not stated'],
        ['Sponsorship',programme.visa===true?'Offered':programme.visa===false?'Not offered':'Not stated'],
        ['Start date',programme.start||'Not stated'],
        ['Decision',statusLabel(decision.status)]
      ];
      const salary=Number(programme.salary)>0
        ?'<div class="pay"><strong>Gross salary</strong><b>'+money(programme.salary)+'/year</b><span>'+money(Number(programme.salary)/12)+'/month gross</span></div>'
        :'<div class="pay"><strong>Gross salary</strong><b>Not stated</b></div>';
      const takeHome=estimate&&Number.isFinite(Number(estimate.monthly))&&Number.isFinite(Number(estimate.annual))
        ?'<div class="pay net"><strong>Estimated take-home</strong><b>'+money(estimate.monthly)+'/month</b><span>'+money(estimate.annual)+'/year</span></div>'
        :'<div class="pay net"><strong>Estimated take-home</strong><b>Not available</b></div>';
      const note=decision.note?'<div class="note"><strong>My note</strong><p>'+escapeHtml(decision.note)+'</p></div>':'';
      return '<article class="programme"><div class="rank">PREFERENCE '+(index+1)+'</div><h2>'+escapeHtml(title)+'</h2><p class="employer">'+escapeHtml(employer)+'</p><div class="pay-grid">'+salary+takeHome+'</div><dl>'+facts.map(fact=>'<div><dt>'+escapeHtml(fact[0])+'</dt><dd>'+escapeHtml(fact[1])+'</dd></div>').join('')+'</dl>'+note+'</article>';
    }).join('');
    const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Placement Atlas | Ranked shortlist</title><style>'+
      '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#222;font:10.5pt/1.45 Arial,Helvetica,sans-serif}header{padding:0 0 12px;border-bottom:2px solid #293b38;margin-bottom:15px}header .brand{font-size:10pt;letter-spacing:.12em;text-transform:uppercase;color:#53645f;font-weight:700}header h1{font-size:25pt;line-height:1.1;margin:7px 0 4px;letter-spacing:-.04em}header p{margin:0;color:#666;font-size:9pt}.programme{break-inside:avoid;page-break-inside:avoid;padding:13px 0 15px;border-bottom:1px solid #ddd}.rank{font-size:8pt;letter-spacing:.1em;font-weight:700;color:#65756f}.programme h2{font-size:15pt;line-height:1.25;margin:4px 0 3px}.employer{font-size:9pt;color:#666;margin:0 0 9px}.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.pay{border:1px solid #d9dfdb;border-radius:7px;padding:8px 10px;display:grid;gap:2px}.pay strong{font-size:7.5pt;text-transform:uppercase;letter-spacing:.07em;color:#66736e}.pay b{font-size:12pt}.pay span{font-size:8.5pt;color:#66736e}.pay.net{background:#f5f7f5}dl{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;margin:9px 0 0}dl div{min-width:0}dt{font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#777}dd{margin:1px 0 0;font-size:9pt;overflow-wrap:anywhere}.note{margin-top:9px;padding:8px 10px;background:#f6f5f1;border-radius:7px}.note strong{font-size:8pt}.note p{margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}.footer{margin-top:13px;color:#777;font-size:8pt}@media print{a{color:inherit;text-decoration:none}}'+
      '</style></head><body><header><div class="brand">Placement Atlas · Independent Oriel placement desk</div><h1>Ranked shortlist</h1><p>'+items.length+' saved programmes · Prepared '+escapeHtml(new Date().toLocaleDateString('en-GB'))+'</p></header>'+rows+'<p class="footer">Gross salaries are the stated programme figures. Take-home values are illustrative estimates, not guaranteed payslip amounts. Verify programme details with the employer and official Oriel information.</p></body></html>';
    const popup=window.open('','_blank');
    if(!popup){
      try{if(typeof toast==='function')toast('Allow pop-ups for Placement Atlas to create your PDF.')}catch{}
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    window.setTimeout(()=>{try{popup.print()}catch{}},450);
    try{document.dispatchEvent(new CustomEvent('desk:action',{detail:{name:'shortlist_exported'}}))}catch{}
  };

  let observer=null;
  const apply=()=>{
    const section=$('shortlist');
    const list=$('shortlistList');
    if(section){
      const paragraph=section.querySelector('.sectionHero p');
      if(paragraph){
        const copy='Review and reorder your saved programmes before transferring your preferences to Oriel.';
        if(paragraph.textContent!==copy)paragraph.textContent=copy;
      }
      const button=$('exportRanked');
      if(button){
        if(button.textContent.trim()!=='Make it a PDF')button.textContent='Make it a PDF';
        button.title='Open a print-ready shortlist, then choose Save as PDF.';
        button.setAttribute('aria-label','Make a PDF of your ranked shortlist');
        if(!button.dataset.atlasPdfBound&&typeof ranked==='function'){
          button.onclick=printRankedShortlist;
          button.dataset.atlasPdfBound='1';
        }
      }
    }
    if(list)list.querySelectorAll(':scope > .rank-row > .placement').forEach(polishCard);
  };
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  };
  const list=$('shortlistList');
  if(list&&window.MutationObserver){
    observer=new MutationObserver(schedule);
    observer.observe(list,{childList:true,subtree:true});
  }
  ['desk:ready','desk:cards-ready','desk:state-saved','desk:dataset','desk:after-navigation','desk:profile-updated'].forEach(name=>document.addEventListener(name,schedule));
  schedule();
  let attempts=0;
  const timer=window.setInterval(()=>{
    attempts++;
    apply();
    if((typeof ranked==='function'&&$('exportRanked')?.dataset.atlasPdfBound==='1')||attempts>=100)
      window.clearInterval(timer);
  },100);
})();
