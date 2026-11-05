'use strict';
/* Annual UK employee pay estimator for the 2027/28 training intake.
   Sources (checked Nov 2026):
   https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances
   https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar
   https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions
   https://questions-statements.parliament.uk/written-statements/detail/2026-11-03/hlws452
   https://www.nhsbsa.nhs.uk/cy/node/1275
   https://www.gov.uk/workplace-pensions/managing-your-pension
   https://www.gov.uk/government/publications/student-loans-a-guide-to-terms-and-conditions/student-loans-a-guide-to-terms-and-conditions-2026-to-2027
   Illustrative calculations, not payroll advice.
*/
window.OrielPay=(()=>{
 const key='oriel-pay-settings-v1',allowedPensions=new Set(['standard','nhs','none']),allowedLoans=new Set(['none','plan5']);
 const defaults={pension:'standard',studentLoan:'none'};
 const normalise=s=>({pension:allowedPensions.has(s?.pension)?s.pension:'standard',studentLoan:allowedLoans.has(s?.studentLoan)?s.studentLoan:'none'});
 const read=()=>{try{return normalise(JSON.parse(localStorage.getItem(key)||'null'))}catch{return {...defaults}}};
 let settings=read();
 const save=s=>{settings=normalise(s);try{localStorage.setItem(key,JSON.stringify(settings))}catch{}document.dispatchEvent(new CustomEvent('desk:pay-settings'));return settings};
 const range=(n,lo,hi)=>Math.max(0,Math.min(n,hi)-lo);
 // Income tax bands for employees in England and Wales for 2027/28.
 function incomeTax(income){
   const pa=Math.max(0,12570-Math.max(0,income-100000)/2);
   const taxable=Math.max(0,income-pa);
   const basic=Math.min(taxable,37700);
   const higher=Math.min(Math.max(taxable-37700,0),Math.max(0,125140-pa-37700));
   const additional=Math.max(taxable-basic-higher,0);
   return basic*.2+higher*.4+additional*.45;
 }
 const ni=gross=>range(gross,12570,50270)*.08+Math.max(0,gross-50270)*.02;
 // 2026/27 NHS member contribution table is the latest published reference.
 const nhsRate=gross=>gross<=13259?.052:gross<=28854?.065:gross<=35155?.083:gross<=52778?.098:gross<=67668?.107:.125;
 const pension=(gross,mode)=>{
   if(mode==='none')return {annual:0,label:'No pension'};
   if(mode==='nhs')return {annual:gross*nhsRate(gross),label:'NHS pension tier (2026/27 rates)'};
   // 2027/28 qualifying-earnings band maintained at 2026/27 levels, employee total minimum 5% including tax relief.
   return {annual:range(gross,6240,50270)*.05,label:'5% qualifying-earnings pension'};
 };
 const loan=(gross,mode)=>mode==='plan5'?Math.max(0,gross-25000)*.09:0;
 const estimate=(gross,options=settings)=>{
   gross=Number(gross);
   if(!Number.isFinite(gross)||gross<=0)return null;
   const {pension:pm,studentLoan:lm}=normalise(options);
   const pp=pension(gross,pm);
   // Net-pay pension arrangement assumption: contribution reduces income tax, but not standard employee NI.
   // An employer using relief at source/salary sacrifice could show a different payslip.
   const tax=incomeTax(Math.max(0,gross-pp.annual));
   const nationalInsurance=ni(gross);
   const studentLoan=loan(gross,lm);
   const annual=Math.max(0,gross-tax-nationalInsurance-pp.annual-studentLoan);
   return {gross,annual,monthly:annual/12,tax,nationalInsurance,pension:pp.annual,pensionLabel:pp.label,studentLoan,studentLoanLabel:lm==='plan5'?'Illustrative Plan 5 threshold £25,000 (2026/27 reference)':'No student loan',options:{pension:pm,studentLoan:lm}};
 };
 const money=n=>'£'+Math.round(Number(n)||0).toLocaleString('en-GB');
 const descriptor=()=>{const p=settings.pension==='standard'?'5% qualifying-earnings pension':settings.pension==='nhs'?'NHS pension (2026/27 tiers)':'no pension';return '2027/28 estimated PAYE + NI · '+p+' · '+(settings.studentLoan==='plan5'?'Plan 5 loan estimate':'no student loan')};
 return {estimate,money,read:()=>({...settings}),save,descriptor,nhsRate,incomeTax,ni,pension};
})();