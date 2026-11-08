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
      Hospital:'#57799c',
      'General Practice':'#4e8d80',
      'Community Pharmacy':'#9076a6',
      Industry:'#b5895b',
      Mixed:'#af7187',
      Other:'#8c969e'
    };

    const defaults={...palette};
    const refreshPalette=()=>{for(const key of Object.keys(palette)){const colour=state.prefs.mapColours?.[key];palette[key]=/^#[0-9a-f]{6}$/i.test(colour||'')?colour:defaults[key];}};
    refreshPalette();
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
    legend.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:7px 12px;padding:9px 16px 11px;border-top:1px solid var(--line);font-size:11px;color:var(--mut);background:var(--panel)';
    const renderLegend=()=>{refreshPalette();legend.innerHTML=[
      ['Hospital','Hospital'],
      ['General Practice','GP'],
      ['Community Pharmacy','Community'],
      ['Industry','Industry'],
      ['Mixed','Mixed / split'],
      ['Other','Other']
    ].map(([s,t])=>`<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:10px;height:10px;border-radius:50%;background:${palette[s]};display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12)"></i>${t}</span>`).join('')+'<span style="margin-left:auto">Muted burgundy ring = shortlisted · red ring = excluded</span>';};
    renderLegend();
    const mapCaption=document.querySelector('.map-caption');
    if(mapCaption&&!document.getElementById('sectorMapLegend'))mapCaption.insertAdjacentElement('beforebegin',legend);

    const settings=document.createElement('div');settings.className='settingsCard card';
    settings.innerHTML='<div class="eyebrow">YOUR MAP</div><h2>Map colours</h2><p class="muted">Choose colours for each setting. Text labels remain available on the legend and pins.</p>'+Object.keys(palette).map(key=>`<label class="colourChoice"><input type="color" data-sector-colour="${key}" aria-label="${label[key]} map colour" value="${palette[key]}"> ${label[key]}</label>`).join('')+'<button class="btn" id="resetMapColours">Reset map colours</button>';
    document.querySelector('#prefs .settings').appendChild(settings);
    settings.addEventListener('change',e=>{const key=e.target.dataset.sectorColour;if(!key)return;state.prefs.mapColours={...state.prefs.mapColours,[key]:e.target.value};save();renderLegend();drawMap(placements.filter(matches));});
    document.getElementById('resetMapColours').onclick=()=>{delete state.prefs.mapColours;save();document.dispatchEvent(new CustomEvent('desk:palette'));};
    document.addEventListener('desk:palette',()=>{renderLegend();settings.querySelectorAll('input').forEach(input=>input.value=palette[input.dataset.sectorColour]);drawMap(placements.filter(matches));});

    // Numbered pins make shared programme locations visible and clickable.
    // One numbered marker opens every programme that shares those coordinates.
    if(!document.getElementById('oriel-group-pin-style')){
      const pinStyle=document.createElement('style');
      pinStyle.id='oriel-group-pin-style';
      pinStyle.textContent='.oriel-group-marker{background:transparent;border:0}.oriel-group-count{display:grid;place-items:center;box-sizing:border-box;border:2px solid var(--group-ring,#fff);border-radius:50%;background:var(--group-fill,#9076a6);color:#fff;font:800 10px/1 Inter,ui-sans-serif,system-ui,sans-serif;box-shadow:0 2px 7px rgba(20,25,30,.32);transition:transform .16s ease,box-shadow .16s ease;user-select:none}.oriel-group-marker:focus-visible .oriel-group-count{outline:3px solid #f5d68a;outline-offset:2px}.map-approx-note{display:block;margin:6px 0 10px;color:var(--mut);font-size:12px}';
      document.head.appendChild(pinStyle);
    }

    const programmePins=new Map(),pinBases=new WeakMap();
    let selectedProgramme=null,hoveredProgramme=null;
    const locationCodes=p=>{
      const exact=(p.postcodes||[]).map(pcKey);
      const preferred=exact.map(code=>{
        if(Array.isArray(geo[code]))return code;
        const outward=(code.match(/^[A-Z]{1,2}\d[A-Z\d]?/)||[])[0];
        const fallback=outward?'@OUTCODE:'+outward:null;
        return fallback&&Array.isArray(geo[fallback])?fallback:code;
      });
      return [...new Set([...preferred,...(p.outcodes||[]).map(code=>'@OUTCODE:'+String(code).toUpperCase())])];
    };
    const highlightPin=pin=>{
      const base=pinBases.get(pin);if(!base)return;
      const selected=!!selectedProgramme&&base.ids.includes(selectedProgramme);
      const hovered=!!hoveredProgramme&&base.ids.includes(hoveredProgramme);
      const active=selected||hovered;
      if(typeof pin.setRadius==='function'){
        pin.setRadius(active?base.radius*(selected?1.8:1.52):base.radius);
        pin.setStyle({
          color:selected?'#fff2cf':hovered?'#eee0ce':base.color,
          weight:selected?4:hovered?3.3:base.weight,
          fillOpacity:active?1:base.fillOpacity,
          opacity:1
        });
      }else{
        const badge=pin.getElement()?.querySelector('.oriel-group-count');
        if(badge){
          badge.style.transform=active?'scale(1.2)':'scale(1)';
          badge.style.borderColor=selected?'#fff2cf':hovered?'#eee0ce':base.color;
          badge.style.boxShadow=active?'0 0 0 3px rgba(255,225,166,.35),0 2px 8px rgba(20,25,30,.35)':'0 2px 7px rgba(20,25,30,.32)';
        }
      }
      const el=pin.getElement();
      if(el)el.style.filter=active?'drop-shadow(0px 0px 5px rgba(255,225,166,.95))':'';
    };
    const syncMap=()=>{const unique=new Set();programmePins.forEach(pins=>pins.forEach(pin=>unique.add(pin)));unique.forEach(highlightPin)};
    window.OrielMapInteractive={
      select(id,pan=false){
        selectedProgramme=id||null;syncMap();
        if(pan&&selectedProgramme&&programmePins.has(selectedProgramme)&&placementMap){
          const pin=programmePins.get(selectedProgramme)[0],coord=pin.getLatLng();
          if(!placementMap.getBounds().contains(coord))placementMap.panTo(coord,{animate:true,duration:.38});
        }
      },
      hover(id,active=true){hoveredProgramme=active?id:null;syncMap()},
      current:()=>selectedProgramme
    };
    drawMap=list=>{refreshPalette();renderLegend();
      if(!placementMap)return;
      $('mapSelection').innerHTML='';
      mapLayer.clearLayers();
      programmePins.clear();hoveredProgramme=null;
      const groups=new Map(),allCodes=new Set(),resolvedCodes=new Set();
      let programmesWithAnySite=0,programmesWithAllSites=0,programmesWithoutCode=0;

      list.forEach(p=>{
        const codes=locationCodes(p);
        if(!codes.length){programmesWithoutCode++;return;}
        codes.forEach(code=>allCodes.add(code));
        let resolvedForProgramme=0;
        codes.forEach(code=>{
          const c=geo[code];
          if(!Array.isArray(c)||c.length<2)return;
          resolvedForProgramme++;resolvedCodes.add(code);
          const k=c[0]+','+c[1];
          if(!groups.has(k))groups.set(k,{c,entries:[],codes:new Set(),approximate:false});
          const group=groups.get(k);
          group.codes.add(code);
          if(code.startsWith('@OUTCODE:'))group.approximate=true;
          if(!group.entries.some(existing=>existing.id===p.id))group.entries.push(p);
        });
        if(resolvedForProgramme>0)programmesWithAnySite++;
        if(resolvedForProgramme===codes.length)programmesWithAllSites++;
      });

      for(const group of groups.values()){
        const {c,entries}=group;
        const mapSector=groupMapSector(entries);
        const preferred=entries.some(p=>SHORT.has(mark(p).status));
        const excluded=entries.every(isExcluded);
        const stroke=excluded?'#ac515e':preferred?'#82505d':'#ffffff';
        const fillColor=palette[mapSector]||palette.Other;
        const radius=(entries.length>1?4.3:2.9)+(preferred?.55:0);
        let pin;
        if(entries.length>1){
          const size=entries.length>=100?34:entries.length>=10?29:25;
          const fontSize=entries.length>=100?9:10;
          pin=L.marker(c,{
            icon:L.divIcon({
              className:'oriel-group-marker',
              html:'<span class="oriel-group-count" data-programme-count="'+entries.length+'" style="width:'+size+'px;height:'+size+'px;font-size:'+fontSize+'px;--group-fill:'+fillColor+';--group-ring:'+stroke+'">'+entries.length+'</span>',
              iconSize:[size,size],iconAnchor:[size/2,size/2]
            }),
            keyboard:true,riseOnHover:true
          }).addTo(mapLayer);
        }else{
          pin=L.circleMarker(c,{
            radius,color:stroke,weight:preferred?2.7:excluded?2.4:1.6,
            fillColor,fillOpacity:excluded?.38:.94,opacity:excluded?.9:1
          }).addTo(mapLayer);
        }

        pinBases.set(pin,{ids:entries.map(p=>p.id),radius,color:stroke,weight:preferred?2.7:excluded?2.4:1.6,fillOpacity:excluded?.38:.94,fillColor});
        for(const p of entries){if(!programmePins.has(p.id))programmePins.set(p.id,[]);programmePins.get(p.id).push(pin)}
        pin.on('mouseover',()=>{
          hoveredProgramme=entries[0]?.id||null;syncMap();
          document.querySelectorAll('.placement[data-id]').forEach(card=>card.classList.toggle('uxProgramHover',entries.some(p=>p.id===card.dataset.id)));
        });
        pin.on('mouseout',()=>{
          hoveredProgramme=null;syncMap();
          document.querySelectorAll('.placement.uxProgramHover').forEach(card=>card.classList.remove('uxProgramHover'));
        });

        const sectorSummary=groupSectorSummary(entries);
        const labels=[...group.codes].map(code=>code.startsWith('@OUTCODE:')?code.slice(9)+' (approx.)':code);
        const locationSummary=labels.join(', ');
        const approximateNote=group.approximate?' · includes approximate postcode-district centre':'';
        pin.bindTooltip((entries.length>1?entries.length+' programmes':'1 programme')+' · '+sectorSummary+approximateNote+(locationSummary?' · '+locationSummary:''));

        const openPin=()=>{
          $('mapSelection').innerHTML='<div class="map-selection-head"><b>'+entries.length+' programme'+(entries.length===1?'':'s')+' at this location · '+esc(sectorSummary)+'</b><button class="textbtn" id="closeSelection">Close</button></div>'+(group.approximate?'<p class="map-approx-note">This marker uses a postcode-district centre because the source did not provide a full postcode.</p>':'')+sorted([...entries]).map(p=>card(p)).join('');
          $('closeSelection').onclick=()=>$('mapSelection').innerHTML='';
          $('mapSelection').scrollIntoView({behavior:'smooth',block:'nearest'});
        };
        pin.on('click',openPin);
        const el=pin.getElement();
        if(el){
          el.setAttribute('tabindex','0');
          el.setAttribute('role','button');
          el.dataset.programmeCount=String(entries.length);
          el.setAttribute('aria-label','Show '+entries.length+' '+sectorSummary+' programme'+(entries.length===1?'':'s')+(locationSummary?' at '+locationSummary:'')+(group.approximate?' · approximate area':''));
          el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPin();}});
        }
      }

      const unresolved=allCodes.size-resolvedCodes.size;
      const summary=[
        programmesWithAllSites.toLocaleString()+' of '+list.length.toLocaleString()+' programmes have all listed sites mapped',
        groups.size.toLocaleString()+' unique pin locations',
        resolvedCodes.size.toLocaleString()+' of '+allCodes.size.toLocaleString()+' location codes resolved'
      ];
      if(unresolved)summary.push(unresolved.toLocaleString()+' codes still need locating');
      if(programmesWithoutCode)summary.push(programmesWithoutCode.toLocaleString()+' programmes have no postcode/outcode in the source');
      $('mapStatus').textContent=summary.join(' · ');
      $('mapStatus').title='A programme can appear at multiple training sites. Numbered pins group multiple programmes at the same map point; click one to open every programme there. Outcode-only markers are approximate area locations.';
      syncMap();
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
