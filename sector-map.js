'use strict';
(()=>{
  const ready=()=>{
    try{
      return typeof drawMap==='function' && typeof sector==='function' && typeof pcKey==='function' && typeof mark==='function' && typeof isExcluded==='function' && typeof SHORT!=='undefined' && typeof placements!=='undefined' && typeof matches==='function' && typeof L!=='undefined' && typeof mapLayer!=='undefined';
    }catch{return false;}
  };

  const install=()=>{
    if(!ready() || window.__sectorPinsInstalled)return false;
    window.__sectorPinsInstalled=true;

    const palette={
      Hospital:'#3f6ed3',
      'General Practice':'#159b8a',
      'Community Pharmacy':'#d68a27',
      Industry:'#795bc6',
      Mixed:'#596673',
      Other:'#9099a1'
    };

    const label={
      Hospital:'Hospital',
      'General Practice':'GP',
      'Community Pharmacy':'Community',
      Industry:'Industry',
      Mixed:'Mixed',
      Other:'Other'
    };

    const programmeMapSector=p=>{
      const substantial=[];
      if(weeks(p,'hospital')>=13)substantial.push('Hospital');
      if(weeks(p,'general practice')>=13)substantial.push('General Practice');
      if(weeks(p,'community')>=13)substantial.push('Community Pharmacy');
      if(weeks(p,'industry')>=13)substantial.push('Industry');
      if(substantial.length>1)return'Mixed';
      if(substantial.length===1)return substantial[0];
      const s=sector(p);
      return palette[s]?s:'Other';
    };

    const groupMapSector=entries=>{
      const types=[...new Set(entries.map(programmeMapSector))];
      return types.length===1?types[0]:'Mixed';
    };

    const groupSectorSummary=entries=>{
      const counts={};
      entries.forEach(p=>{const s=programmeMapSector(p);counts[s]=(counts[s]||0)+1;});
      return Object.entries(counts)
        .sort((a,b)=>b[1]-a[1])
        .map(([s,n])=>`${label[s]||s}${n>1?' '+n:''}`)
        .join(' · ');
    };

    const legend=document.createElement('div');
    legend.id='sectorMapLegend';
    legend.setAttribute('aria-label','Map pin colour legend');
    legend.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:7px 12px;padding:9px 16px 11px;border-top:1px solid var(--line);font-size:11px;color:var(--mut);background:#fff';
    legend.innerHTML=[
      ['Hospital','Hospital'],
      ['General Practice','GP'],
      ['Community Pharmacy','Community'],
      ['Industry','Industry'],
      ['Mixed','Mixed / split'],
      ['Other','Other']
    ].map(([s,t])=>`<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:10px;height:10px;border-radius:50%;background:${palette[s]};display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12)"></i>${t}</span>`).join('')+'<span style="margin-left:auto">Dark ring = shortlisted · red ring = excluded</span>';
    const mapCaption=document.querySelector('.map-caption');
    if(mapCaption&&!document.getElementById('sectorMapLegend'))mapCaption.insertAdjacentElement('beforebegin',legend);

    drawMap=list=>{
      if(!placementMap)return;
      $('mapSelection').innerHTML='';
      mapLayer.clearLayers();
      const groups=new Map();
      let located=0;

      list.forEach(p=>{
        let found=false;
        new Set(p.postcodes.map(pcKey)).forEach(pc=>{
          const c=geo[pc];
          if(!c)return;
          found=true;
          const k=c.join(',');
          if(!groups.has(k))groups.set(k,{c,entries:[]});
          groups.get(k).entries.push(p);
        });
        if(found)located++;
      });

      for(const {c,entries} of groups.values()){
        const mapSector=groupMapSector(entries);
        const preferred=entries.some(p=>SHORT.has(mark(p).status));
        const excluded=entries.every(isExcluded);
        const stroke=excluded?'#b74444':preferred?'#172b22':'#ffffff';
        const radius=(entries.length>1?9:6)+(preferred?1:0);
        const pin=L.circleMarker(c,{
          radius,
          color:stroke,
          weight:preferred?4:excluded?3:2,
          fillColor:palette[mapSector]||palette.Other,
          fillOpacity:excluded?.38:.94,
          opacity:excluded?.9:1
        }).addTo(mapLayer);

        const sectorSummary=groupSectorSummary(entries);
        const postcodes=[...new Set(entries.flatMap(p=>p.postcodes))].join(', ');
        pin.bindTooltip(`${entries.length} programme${entries.length===1?'':'s'} · ${sectorSummary}${postcodes?' · '+postcodes:''}`);

        const openPin=()=>{
          $('mapSelection').innerHTML=`<div class="map-selection-head"><b>${entries.length} programme${entries.length===1?'':'s'} at this location · ${esc(sectorSummary)}</b><button class="textbtn" id="closeSelection">Close</button></div>`+sorted([...entries]).map(p=>card(p)).join('');
          $('closeSelection').onclick=()=>$('mapSelection').innerHTML='';
          $('mapSelection').scrollIntoView({behavior:'smooth',block:'nearest'});
        };
        pin.on('click',openPin);
        const el=pin.getElement();
        if(el){
          el.setAttribute('tabindex','0');
          el.setAttribute('role','button');
          el.setAttribute('aria-label',`Show ${entries.length} ${sectorSummary} programme${entries.length===1?'':'s'}${postcodes?' at '+postcodes:''}`);
          el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPin();}});
        }
      }

      if(!mapTileFailed)$('mapStatus').textContent=`${located} of ${list.length} matching programmes mapped · ${groups.size} locations${located<list.length?' · Unlocated programmes remain in the list':''}`;
    };

    try{drawMap(placements.filter(matches));}catch{}
    return true;
  };

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>100)clearInterval(timer);
  },100);
})();
