const $ = (id) => document.getElementById(id);
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const STORAGE_KEY = 'phivos-placement-desk-v1';
const DATA_KEY = 'phivos-placement-upload-v1';

const DEFAULT_PREFS = {
  weights: { money: 5, hospital: 5, gp: 5, lifestyle: 4, location: 4, progression: 5, independence: 4, communityPenalty: 4 },
  likedAreas: 'London Bridge, Southwark, Borough, Holborn, Bloomsbury, Clerkenwell, Angel, Islington, Shoreditch, Camden, Fitzrovia, Westminster, Waterloo, Vauxhall, Battersea, Kensington, Chelsea, Hammersmith, Fulham, Ealing, Wembley',
  avoidAreas: 'Croydon, Barnet, Wood Green, Morden, New Addington, Romford, Dagenham, Enfield',
  base: ''
};
const STATUS = [
  ['', 'Unmarked'], ['love','😍 Love'], ['yes','❤️ Strong yes'], ['maybe','🤔 Maybe'], ['backup','😐 Only if needed'], ['no','❌ No'], ['never','☠️ Absolutely not']
];
const STATUS_SHORTLIST = new Set(['love','yes','maybe','backup']);

let state = loadState();
let placements = [];
let filtered = [];
let uploadedMeta = null;
let quick = new Set();
let currentTab = 'explore';
let baseCoord = null;

function loadState(){
  try { return {prefs: structuredClone(DEFAULT_PREFS), marks:{}, compare:[], ...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}; }
  catch { return {prefs: structuredClone(DEFAULT_PREFS), marks:{}, compare:[]}; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function money(v){ return Number(String(v??'').replace(/[£,\s]/g,''))||0; }
function cleanSetting(s){ return String(s||'').trim().replace(/^general practice$/i,'General Practice').replace(/^industry\s*$/i,'Industry'); }

function parseCSV(text){
  if(text.charCodeAt(0)===65279) text=text.slice(1);
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else quoted=false; } else field+=c; }
    else if(c==='"') quoted=true;
    else if(c===','){ row.push(field); field=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(field); field=''; if(row.some(x=>x.trim())) rows.push(row); row=[]; }
    else field+=c;
  }
  if(field||row.length){ row.push(field); if(row.some(x=>x.trim())) rows.push(row); }
  return rows;
}
function rowsToPlacements(text){
  const rows=parseCSV(text); if(rows.length<2) throw new Error('No placement rows found.');
  const headers=rows[0].map(x=>x.trim());
  if(!headers.includes('Programme Title')||!headers.includes('Employer Name')) throw new Error('This does not look like an Oriel preference CSV.');
  return rows.slice(1).map((r,i)=>{
    const o={}; headers.forEach((h,j)=>o[h]=r[j]??'');
    const settings=[]; for(let n=1;n<=4;n++){ const s=cleanSetting(o[`Setting ${n}`]); const w=Number(o[`Length ${n}`])||0; if(s) settings.push([s,w]); }
    const title=String(o['Programme Title']||'').trim();
    const pc=(title.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi)||[]).map(x=>x.toUpperCase().replace(/\s+/g,' '));
    return {
      id:String(o.Preference||title||`row-${i}`),
      employer:String(o['Employer Name']||'').trim(), title,
      desc:String(o['Programme Description']||'').trim(), region:String(o.Region||'').trim(), area:String(o['Area(Sector)']||'').trim(),
      employerType:String(o['Employer Type']||'Other').trim(), salary:money(o.Salary), hours:Number(o['Hours Per Week'])||0,
      places:Number(o['Places Available'])||0, provider:String(o['Training Provider']||'').trim(), website:String(o['Employer Website']||'').trim(),
      visa:/^yes$/i.test(String(o['Skilled worker visa']||'')), settings, postcodes:pc, preference:String(o.Preference||'').trim(),
      orielRank:String(o['Current Assigned Rank']||'').trim(), start:String(o['Start Date']||'').trim()
    };
  }).filter(x=>x.title||x.employer);
}
async function loadBuiltIn(){
  const cached = localStorage.getItem(DATA_KEY);
  if(cached){ try { const j=JSON.parse(cached); placements=rowsToPlacements(j.csv); uploadedMeta=j.meta||null; return; } catch {} }
  const html=await fetch('legacy.html',{cache:'no-store'}).then(r=>{if(!r.ok) throw new Error('legacy data missing'); return r.text();});
  const m=html.match(/<script type="text\/plain" id="baseCsv">([\s\S]*?)<\/script>/i);
  if(!m) throw new Error('Could not read the built-in placement snapshot.');
  placements=rowsToPlacements(m[1]);
}

function textBlob(p){ return `${p.title} ${p.employer} ${p.desc} ${p.region} ${p.area} ${p.employerType} ${p.provider} ${p.settings.map(x=>x[0]).join(' ')}`.toLowerCase(); }
function weeks(p, sector){ return p.settings.filter(s=>s[0].toLowerCase().includes(sector)).reduce((a,s)=>a+s[1],0); }
function hasSetting(p, sector){ return weeks(p,sector)>0 || p.employerType.toLowerCase().includes(sector) || textBlob(p).includes(sector); }
function sectorLabel(p){
  if(hasSetting(p,'industry')) return 'Industry';
  const h=weeks(p,'hospital'), g=weeks(p,'general practice'), c=weeks(p,'community');
  if(h>=26) return 'Hospital'; if(g>=26) return 'General Practice'; if(c>=26) return 'Community Pharmacy';
  return p.employerType||'Other';
}
function splitLabel(p){ return p.settings.length>1 ? p.settings.map(s=>`${s[0]} ${s[1]}w`).join(' · ') : (p.settings[0]?`${p.settings[0][0]} ${p.settings[0][1]}w`:'Single setting / not specified'); }
function hourly(p){ return p.salary&&p.hours ? p.salary/(p.hours*52) : 0; }
function includesAny(text, terms){ return terms.some(t=>text.includes(t)); }
function areaTokens(s){ return String(s||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean); }
function areaPreference(p){
  const t=textBlob(p); const likes=areaTokens(state.prefs.likedAreas); const avoids=areaTokens(state.prefs.avoidAreas);
  if(avoids.some(a=>a&&t.includes(a))) return -2;
  if(likes.some(a=>a&&t.includes(a))) return 2;
  if(p.region.toLowerCase()==='london'){
    const pc=(p.postcodes[0]||'').replace(/\s.*/,'');
    if(/^(EC|WC|W1|SW1|SE1|N1|E1)/.test(pc)) return 2;
    return 1;
  }
  return -1;
}
function analyse(p){
  const t=textBlob(p), w=state.prefs.weights;
  let raw=0, max=0; const reasons=[], cautions=[], tags=[];
  const add=(value,weight,reason,tag)=>{ raw += value*weight; max += 2*weight; if(reason && value>0) reasons.push(reason); if(tag&&value>0) tags.push(tag); };
  const hp=weeks(p,'hospital'), gp=weeks(p,'general practice'), cp=weeks(p,'community'), ip=weeks(p,'industry');
  add(p.salary>=37000?2:p.salary>=32000?1.4:p.salary>=29000?.8:p.salary>=26000?.2:-.5,w.money,p.salary>=32000?'💷 Strong pay':'💷 Decent pay');
  add(hp>=26?2:hp>=13?1:hasSetting(p,'hospital')?.5:0,w.hospital,hp>=26?'🏥 Major hospital exposure':hp>=13?'🏥 Hospital rotation':'🏥 Hospital exposure');
  add(gp>=26?2:gp>=13?1:hasSetting(p,'general practice')?.5:0,w.gp,gp>=26?'🩺 Major GP exposure':gp>=13?'🩺 GP rotation':'🩺 GP exposure');
  const lifestyle=(p.hours&&p.hours<=35)?2:(p.hours&&p.hours<=37.5)?1.5:(p.hours&&p.hours<=40)?.7:(p.hours>=44?-1.4:0);
  add(lifestyle,w.lifestyle,p.hours&&p.hours<=37.5?`🧘 ${p.hours}h week`:null);
  const loc=areaPreference(p); add(loc,w.location,loc===2?'📍 Area matches your London preferences':loc===1?'📍 London location':null);
  let prog=0;
  if(includesAny(t,['clinical trials','research','medicines information','digital','data','industry','gsk','viatris','glaxosmithkline','clinical procurement','pharmacovigilance','regulatory','academia'])) prog+=1.2;
  if(includesAny(t,['teaching hospital','specialist','tertiary','leadership','quality improvement','audit','rotation','cardiology','oncology','paediatrics','renal'])) prog+=.8;
  add(Math.min(2,prog),w.progression,prog>=1.5?'🚀 Excellent CV / transferable exposure':prog>.5?'🚀 Strong progression signals':null);
  let independent=0;
  if(includesAny(t,['medication review','medicines optimisation','medicines information','audit','quality improvement','repeat prescribing','clinical trial','data','hybrid','remote'])) independent+=1.2;
  if(gp>=26||hp>=26) independent+=.4;
  if(includesAny(t,['high-volume','busy retail','retail pharmacy','otc consultations'])&&cp>=39) independent-=.7;
  add(Math.max(-2,Math.min(2,independent)),w.independence,independent>=1?'🎧 More desk/independent-work signals':null);
  if(cp>=39){ raw -= w.communityPenalty*1.2; max+=w.communityPenalty*2; cautions.push('🛍️ Mostly community-facing'); }
  else if(cp>=26){ raw -= w.communityPenalty*.4; max+=w.communityPenalty*2; }
  if(ip>=13){ raw += w.progression*1.6; reasons.push('🏭 Industry exposure'); tags.push('industry'); }
  if(includesAny(t,['protected study','study time','work from home study'])) reasons.push('📚 Protected study time mentioned');
  if(includesAny(t,['monday to friday','no weekend','no weekends'])) reasons.push('🗓️ Better schedule wording');
  if(includesAny(t,['late night','late nights','weekend working','weekends','bank holiday'])) cautions.push('🌙 Late/weekend working mentioned');
  if(p.hours>=44) cautions.push(`😵 ${p.hours}h/week`);
  if(areaPreference(p)===-2) cautions.push('📍 Area you said you would rather avoid');
  if(p.settings.length>1) reasons.push(`🔀 Split: ${splitLabel(p)}`);
  const score=Math.max(0,Math.min(100,Math.round(50+(raw/Math.max(1,max))*50)));
  const band=score>=78?'Strong fit':score>=66?'Worth a look':score>=54?'Mixed fit':'Probably not you';
  return {score,band,reasons:[...new Set(reasons)].slice(0,5),cautions:[...new Set(cautions)].slice(0,4),tags};
}
