'use strict';
/* Transparent all-site exclusion rules.
   Oriel region 'London' includes outer towns; the optional outer-town switch
   is deliberately separate from regional eligibility.
   These filters only affect visibility, never delete an applicant's marks. */
(()=>{
  const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const compact=s=>String(s||'').toUpperCase().replace(/\s+/g,'');
  const tokens=s=>String(s||'').split(',').map(normalize).filter(Boolean);
  const namedSiteFields=p=>[
    p.title,p.employer,p.area,p.desc,
    ...(Array.isArray(p.settings)?p.settings.map(x=>String(x[0]||'')):[])
  ].map(normalize).join(' ');
  const starts=(pc,prefixes)=>prefixes.some(prefix=>pc.startsWith(prefix));
  const areaPrefixes={
    croydon:['CR0','CR2','CR3','CR4','CR5','CR6','CR7','CR8','CR9'],
    lewisham:['SE13','SE12','SE6','SE4','SE14','SE8'],
    orpington:['BR5','BR6']
  };
  const matches=(p,word)=>{
    const text=' '+namedSiteFields(p)+' ';
    if(!word)return false;
    if(text.includes(' '+word+' '))return true;
    const prefixes=areaPrefixes[word];
    if(prefixes&&(p.postcodes||[]).some(pc=>starts(compact(pc),prefixes)))return true;
    return false;
  };
  const isAvoided=(p,avoids)=>tokens(avoids).some(term=>matches(p,term));
  // Only optional named outer-town exclusion; leave inner London postcodes
  // untouched and never represent Oriel's 'London' as a transport zone.
  const outerTerms=[
    'orpington','croydon','romford','dagenham','enfield','barnet',
    'bexley','sidcup','bromley','sutton','morden','new addington',
    'wood green','lewisham'
  ];
  const isOuterTown=p=>outerTerms.some(term=>matches(p,term));
  window.OrielAreaRules={isAvoided,isOuterTown,matches,areaPrefixes};
})();
