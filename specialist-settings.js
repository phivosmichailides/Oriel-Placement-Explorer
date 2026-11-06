'use strict';
/* Conservative Oriel setting labels; checks explicit workplace names/settings only.
   Ordinary acute hospitals are not marked specialist because a description mentions
   mental health care, opioids, or palliative care as part of general practice. */
window.OrielSpecialist=(()=>{
 const cache=new WeakMap();
 const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
 const classify=p=>{
   if(!p||typeof p!=='object')return [];
   const cached=cache.get(p);if(cached)return cached;
   const title=clean(p.title),employer=clean(p.employer),type=clean(p.type);
   const sites=(p.settings||[]).map(x=>clean(x[0])).join(' ');
   const t=[title,employer,sites,type].join(' ');
   const labels=[];
   const justice=/\b(?:HMP|HMYOI|HMPS|YOI|prison(?:s)?|custod(?:y|ial)|youth offender|young offender|secure estate|immigration removal cent(?:re|er)|detention cent(?:re|er)|criminal justice|probation|justice health(?:care)?)\b/i;
   const mental=/\b(?:mental health|psychiatr(?:y|ic)|forensic (?:mental|psychiatr|service|hospital|unit)|low secure|medium secure|high secure|CAMHS|South London and Maudsley|Bethlem Royal|Springfield University Hospital|East London NHS Foundation Trust|Camden and Islington NHS Foundation Trust|Oxleas NHS Foundation Trust)\b/i;
   const other=/\b(?:hospice|substance misuse|drug and alcohol service|addiction service|residential rehabilitation|rehabilitation cent(?:re|er)|specialist rehabilitation|palliative care cent(?:re|er))\b/i;
   if(justice.test(t))labels.push('justice');
   if(mental.test(t))labels.push('mental');
   if(other.test(t))labels.push('other');
   cache.set(p,labels);
   return labels;
 };
 const filterOut=p=>{
   const l=classify(p);
   const checkbox=id=>document.getElementById(id)?.checked===true;
   if(checkbox('hideJustice')&&l.includes('justice'))return true;
   if(checkbox('hideMental')&&l.includes('mental'))return true;
   if(checkbox('hideOtherSpecialist')&&l.includes('other'))return true;
   const view=document.getElementById('specialistView')?.value;
   return view==='only'&&l.length===0;
 };
 const labelOf=k=>({justice:'Prison / custodial',mental:'Mental health / forensic',other:'Other specialist centre'}[k]||'Specialist setting');
 return {classify,filterOut,labelOf};
})();