'use strict';
(()=>{
  const ready=()=>{
    try{
      return typeof drawMap==='function' && typeof sector==='function' && typeof pcKey==='function' && typeof mark==='function' && typeof isExcluded==='function' && typeof SHORT!=='undefined' && typeof placements!=='undefined' && typeof matches==='function' && typeof L!=='undefined' && typeof mapLayer!=='undefined' && !!mapLayer && typeof placementMap!=='undefined' && !!placementMap;
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
    const mapScopeMode='matching';
    window.OrielMapScope=mapScopeMode;
    const updateMapScopeHeading=()=>{
      const count=Array.isArray(window.OrielFilteredProgrammes)?window.OrielFilteredProgrammes.length:placements.filter(matches).length;
      const heading=document.querySelector('.map-heading h2');
      const eyebrow=document.querySelector('.map-heading .eyebrow');
      if(heading)heading.textContent=count===placements.length?'Explore all programme locations across England & Wales':`Explore ${count.toLocaleString()} matching programme locations`;
      if(eyebrow)eyebrow.textContent=`${placements.length.toLocaleString()} TOTAL · ${count.toLocaleString()} MATCHING`;
    };
    updateMapScopeHeading();
    const fitScopePins=()=>{
      if(!placementMap||!mapLayer)return false;
      placementMap.invalidateSize(false);
      const bounds=window.OrielMapCurrentBounds?.isValid?.()?window.OrielMapCurrentBounds:null;
      const points=mapLayer.getLayers().map(layer=>layer.getLatLng()).filter(point=>Number.isFinite(point.lat)&&Number.isFinite(point.lng));
      const target=bounds|| (points.length?L.latLngBounds(points):null);
      if(!target?.isValid?.())return false;
      placementMap.fitBounds(target,{padding:[42,42],maxZoom:11,animate:false});
      return true;
    };
    window.OrielFitMapToScope=fitScopePins;
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
    ].map(([s,t])=>`<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:10px;height:10px;border-radius:50%;background:${palette[s]};display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12)"></i>${t}</span>`).join('')+
    '<span class="oriel-tube-legend"><i class="oriel-tube-legend-mark" aria-hidden="true"></i> Underground station</span>'+
    '<span class="oriel-tube-attribution">Station data provided by Transport for London</span>'+
    '<span>Numbered clusters zoom in · single-location pins open programme details</span><span style="margin-left:auto">Muted burgundy ring = shortlisted · red ring = excluded</span>';};
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

    const programmePins=new Map(),pinBases=new WeakMap(),programmeCoordinates=new Map();
    let selectedProgramme=null,hoveredProgramme=null,currentMapList=placements.filter(matches),mapRedrawQueued=false;

    // TfL Underground markers are a separate layer, so filtering or redrawing
    // placement pins never removes transport context.
    const tubeLayer=L.layerGroup();
    const tubeIcon=L.divIcon({
      className:'oriel-tube-marker',
      html:'<span class="oriel-tube-roundel" aria-hidden="true"></span>',
      iconSize:[19,19],iconAnchor:[9.5,9.5]
    });
    const safeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const updateTubeVisibility=()=>{
      if(!placementMap)return;
      const visible=placementMap.getZoom()>=11.25;
      if(visible&&!placementMap.hasLayer(tubeLayer))tubeLayer.addTo(placementMap);
      else if(!visible&&placementMap.hasLayer(tubeLayer))placementMap.removeLayer(tubeLayer);
    };
    const renderTubeStations=()=>{
      if(!placementMap)return;
      tubeLayer.clearLayers();
      const stations=Array.isArray(window.ORIEL_TUBE_STATIONS)?window.ORIEL_TUBE_STATIONS:[];
      stations.forEach(station=>{
        const lines=String(station.lines||'London Underground');
        const marker=L.marker([Number(station.lat),Number(station.lng)],{
          icon:tubeIcon,title:station.name,alt:station.name,keyboard:true,riseOnHover:true,zIndexOffset:650
        });
        marker.bindTooltip(safeText(station.name),{direction:'top',offset:[0,-9],opacity:.98});
        marker.bindPopup('<div class="oriel-tube-popup-content"><b>'+safeText(station.name)+'</b><span>'+safeText(lines)+'</span><small>Data provided by Transport for London</small></div>',{className:'oriel-tube-popup',maxWidth:250});
        marker.addTo(tubeLayer);
      });
      updateTubeVisibility();
    };
    placementMap.on('zoomend',updateTubeVisibility);
    document.addEventListener('desk:tube-stations-ready',renderTubeStations);
    if(Array.isArray(window.ORIEL_TUBE_STATIONS)&&window.ORIEL_TUBE_STATIONS.length)renderTubeStations();
    else window.ORIEL_TUBE_STATIONS_READY?.then(renderTubeStations).catch(()=>{});

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
        if(pan&&selectedProgramme&&placementMap){
          const pin=programmePins.get(selectedProgramme)?.[0];
          if(pin){
            const coord=pin.getLatLng();
            if(!placementMap.getBounds().contains(coord))placementMap.panTo(coord,{animate:true,duration:.38});
          }else{
            const locations=programmeCoordinates.get(selectedProgramme)||[];
            const visible=placementMap.getBounds();
            const coord=locations.find(point=>visible.contains(L.latLng(point[0],point[1])))||locations[0];
            if(coord)placementMap.panTo([coord[0],coord[1]],{animate:true,duration:.38});
          }
        }
      },
      hover(id,active=true){hoveredProgramme=active?id:null;syncMap()},
      current:()=>selectedProgramme
    };
    const updateFocusCount=()=>{const count=window.OrielMapStats?.programmes??currentMapList.length;const label=document.getElementById('atlasMapFocusCount');if(label)label.textContent=`${count.toLocaleString()} of ${placements.length.toLocaleString()} programmes shown`;};
    const updateViewportHint=()=>{
      const hint=document.getElementById('atlasMapEmptyHint');
      if(!hint||!placementMap||!mapLayer)return;
      const noMatches=currentMapList.length===0;
      const bounds=placementMap.getBounds();
      const hasVisiblePin=mapLayer.getLayers().some(layer=>{
        const point=layer.getLatLng?.();
        return !!point&&bounds.contains(point);
      });
      const copy=hint.querySelector('[data-atlas-empty-copy]');
      const fit=hint.querySelector('[data-atlas-fit-view]');
      if(copy)copy.textContent=noMatches?'No programmes match the current filters.':'No programme sites in this view.';
      if(fit)fit.hidden=noMatches||!window.OrielMapCurrentBounds?.isValid?.();
      hint.hidden=!noMatches&&hasVisiblePin;
    };
    const installMapControls=()=>{
      const mapContainer=placementMap.getContainer();
      if(!mapContainer||document.getElementById('atlasMapZoom'))return;
      mapContainer.style.position='relative';
      const zoom=document.createElement('div');zoom.className='atlasMapZoom';zoom.id='atlasMapZoom';zoom.setAttribute('role','group');zoom.setAttribute('aria-label','Map zoom controls');
      zoom.innerHTML='<button type="button" data-atlas-zoom="out" aria-label="Zoom out" title="Zoom out">−</button><span aria-hidden="true"></span><button type="button" data-atlas-zoom="in" aria-label="Zoom in" title="Zoom in">+</button>';
      zoom.addEventListener('click',event=>{const button=event.target.closest('[data-atlas-zoom]');if(!button)return;event.preventDefault();event.stopPropagation();const delta=button.dataset.atlasZoom==='in'?1:-1;const target=Math.max(placementMap.getMinZoom(),Math.min(placementMap.getMaxZoom(),placementMap.getZoom()+delta));placementMap.stop();placementMap.setZoom(target,{animate:false});});
      mapContainer.append(zoom);
      const emptyHint=document.createElement('div');
      emptyHint.className='atlasMapEmptyHint';emptyHint.id='atlasMapEmptyHint';
      emptyHint.setAttribute('role','status');emptyHint.setAttribute('aria-live','polite');emptyHint.hidden=true;
      emptyHint.innerHTML='<span data-atlas-empty-copy>No programme sites in this view.</span><button type="button" data-atlas-fit-view>Fit all results</button>';
      emptyHint.querySelector('[data-atlas-fit-view]').addEventListener('click',()=>fitScopePins());
      mapContainer.append(emptyHint);
      const expand=document.createElement('button');expand.type='button';expand.className='atlasMapExpand';expand.id='atlasMapExpand';expand.setAttribute('aria-label','Open expanded map');expand.title='Open expanded map';
      expand.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4"/><path d="M9 9 4 4m11 5 5-5M9 15l-5 5m11-5 5 5"/></svg>';
      mapContainer.append(expand);
      const dialog=document.createElement('div');dialog.className='atlasMapFocus';dialog.id='atlasMapFocus';dialog.hidden=true;
      dialog.innerHTML='<section class="atlasMapFocusPanel" role="dialog" aria-modal="true" aria-labelledby="atlasMapFocusTitle"><header class="atlasMapFocusHead"><div><small>PLACEMENT ATLAS · MAP EXPLORER</small><strong id="atlasMapFocusTitle">Programme locations</strong><span id="atlasMapFocusCount"></span></div><button type="button" class="atlasMapFocusClose" id="atlasMapFocusClose">Close map <span aria-hidden="true">×</span></button></header><div class="atlasMapFocusStage"></div></section>';
      document.body.append(dialog);
      const stage=dialog.querySelector('.atlasMapFocusStage'),closeButton=dialog.querySelector('#atlasMapFocusClose');
      const placeholder=document.createComment('Placement Atlas map position');
      mapContainer.parentNode?.insertBefore(placeholder,mapContainer);
      const closeFocus=()=>{
        if(dialog.hidden)return;
        placeholder.parentNode?.insertBefore(mapContainer,placeholder.nextSibling);
        dialog.hidden=true;document.body.classList.remove('atlasMapFocusOpen');
        requestAnimationFrame(()=>{placementMap.invalidateSize(false);expand.focus();});
      };
      const openFocus=()=>{
        dialog.hidden=false;document.body.classList.add('atlasMapFocusOpen');stage.append(mapContainer);updateFocusCount();
        requestAnimationFrame(()=>{placementMap.invalidateSize(false);setTimeout(()=>placementMap.invalidateSize(false),160);closeButton.focus();});
      };
      expand.addEventListener('click',openFocus);closeButton.addEventListener('click',closeFocus);
      dialog.addEventListener('click',event=>{if(event.target===dialog)closeFocus();});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.hidden)closeFocus();});
    };
    installMapControls();
    drawMap=requestedList=>{const list=Array.isArray(requestedList)?requestedList:placements.filter(matches);currentMapList=list;refreshPalette();renderLegend();
      if(!placementMap)return;
      placementMap.closePopup();
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

      // Keep exact locations for fitting and programme-to-map navigation,
      // then merge nearby points into progressively finer screen-space clusters.
      programmeCoordinates.clear();
      for(const group of groups.values()){
        group.entries.forEach(p=>{
          if(!programmeCoordinates.has(p.id))programmeCoordinates.set(p.id,[]);
          programmeCoordinates.get(p.id).push(group.c);
        });
      }
      window.OrielMapProgrammeLocations=programmeCoordinates;
      window.OrielMapCurrentBounds=groups.size
        ?L.latLngBounds([...groups.values()].map(group=>L.latLng(group.c[0],group.c[1])))
        :null;

      const zoom=placementMap.getZoom();
      // Use broader clusters at national scale so dense coverage does not
      // become a regular-looking carpet of tiny numbered cells. Tighten the
      // screen-space radius progressively as the user zooms into regions,
      // boroughs and neighbourhoods; individual sites appear at street level.
      const cellSize=zoom<=5?42:zoom<=6?36:zoom<=7?30:zoom<=8?28:
        zoom<=9?26:zoom<=10?24:zoom<=11?20:zoom<=12?16:
        zoom<=13?12:zoom<=14?9:zoom<=15?6:0;
      const visibleBounds=zoom>=16?placementMap.getBounds().pad(.55):null;
      const displayGroups=[];
      if(cellSize>0){
        // Use a spatial hash only to find nearby candidate clusters. Cluster
        // centres are weighted geographic centroids, not fixed grid-cell
        // centres; this avoids the visible lattice of circles at country scale.
        const spatialIndex=new Map(),clusters=[];
        const cellKey=(x,y)=>Math.floor(x/cellSize)+':'+Math.floor(y/cellSize);
        const indexCluster=cluster=>{
          cluster.cell=cellKey(cluster.sumX/cluster.items.length,cluster.sumY/cluster.items.length);
          if(!spatialIndex.has(cluster.cell))spatialIndex.set(cluster.cell,[]);
          spatialIndex.get(cluster.cell).push(cluster);
        };
        const unindexCluster=cluster=>{
          const bucket=spatialIndex.get(cluster.cell);
          if(!bucket)return;
          const index=bucket.indexOf(cluster);
          if(index>=0)bucket.splice(index,1);
          if(!bucket.length)spatialIndex.delete(cluster.cell);
        };
        const radiusSquared=cellSize*cellSize;
        const ordered=[...groups.values()]
          .filter(group=>!visibleBounds||visibleBounds.contains(L.latLng(group.c[0],group.c[1])))
          .sort((a,b)=>b.entries.length-a.entries.length||a.c[0]-b.c[0]||a.c[1]-b.c[1]);
        for(const group of ordered){
          const pixel=placementMap.project(L.latLng(group.c[0],group.c[1]),zoom);
          const gx=Math.floor(pixel.x/cellSize),gy=Math.floor(pixel.y/cellSize);
          let nearest=null,nearestDistance=radiusSquared;
          for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
            const candidates=spatialIndex.get((gx+dx)+':'+(gy+dy))||[];
            for(const candidate of candidates){
              const cx=candidate.sumX/candidate.items.length,cy=candidate.sumY/candidate.items.length;
              const distance=(pixel.x-cx)**2+(pixel.y-cy)**2;
              if(distance<=nearestDistance){nearest=candidate;nearestDistance=distance;}
            }
          }
          if(nearest){
            unindexCluster(nearest);
            nearest.items.push({group,pixel});
            nearest.sumX+=pixel.x;nearest.sumY+=pixel.y;
            indexCluster(nearest);
          }else{
            const cluster={items:[{group,pixel}],sumX:pixel.x,sumY:pixel.y,cell:''};
            clusters.push(cluster);indexCluster(cluster);
          }
        }
        for(const cluster of clusters){
          const items=cluster.items;
          if(items.length===1){
            const group=items[0].group;
            displayGroups.push({...group,cluster:false,locationCount:1,clusterBounds:null});
            continue;
          }
          const entriesById=new Map(),codes=new Set(),points=[];
          let approximate=false;
          for(const {group} of items){
            points.push(L.latLng(group.c[0],group.c[1]));
            group.entries.forEach(entry=>entriesById.set(entry.id,entry));
            group.codes.forEach(code=>codes.add(code));
            if(group.approximate)approximate=true;
          }
          const centre=placementMap.unproject(L.point(cluster.sumX/items.length,cluster.sumY/items.length),zoom);
          displayGroups.push({
            c:[centre.lat,centre.lng],
            entries:[...entriesById.values()],
            codes,
            approximate,
            cluster:true,
            locationCount:items.length,
            clusterBounds:L.latLngBounds(points)
          });
        }
      }else{
        for(const group of groups.values()){
          if(!visibleBounds||visibleBounds.contains(L.latLng(group.c[0],group.c[1])))
            displayGroups.push({...group,cluster:false,locationCount:1,clusterBounds:null});
        }
      }
      window.OrielMapClusterCount=displayGroups.filter(group=>group.cluster).length;
      window.OrielMapRenderedMarkerCount=displayGroups.length;

      for(const group of displayGroups){
        const {c,entries}=group;
        const mapSector=groupMapSector(entries);
        const preferred=entries.some(p=>SHORT.has(mark(p).status));
        const excluded=entries.every(isExcluded);
        const stroke=excluded?'#ac515e':preferred?'#82505d':'#ffffff';
        const fillColor=palette[mapSector]||palette.Other;
        const radius=(entries.length>1?4.3:2.9)+(preferred?.55:0);
        const needsBadge=group.cluster||entries.length>1;
        let pin;
        if(needsBadge){
          const size=group.cluster?(entries.length>=100?34:entries.length>=10?28:24):(entries.length>=100?30:entries.length>=10?26:23);
          const fontSize=entries.length>=100?9:10;
          const countLabel=entries.length>999?'999+':String(entries.length);
          pin=L.marker(c,{
            icon:L.divIcon({
              className:'oriel-group-marker'+(group.cluster?' oriel-cluster-marker':''),
              html:'<span class="oriel-group-count" data-programme-count="'+entries.length+'" data-cluster="'+(group.cluster?'true':'false')+'" style="width:'+size+'px;height:'+size+'px;font-size:'+fontSize+'px;--group-fill:'+fillColor+';--group-ring:'+stroke+'">'+countLabel+'</span>',
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
        const allLabels=[...group.codes].map(code=>code.startsWith('@OUTCODE:')?code.slice(9)+' (approx.)':code);
        const shownLabels=group.cluster?allLabels.slice(0,4):allLabels;
        const locationSummary=shownLabels.join(', ')+(allLabels.length>shownLabels.length?' +'+(allLabels.length-shownLabels.length)+' more':'');
        const approximateNote=group.approximate?' · includes approximate postcode-district centre':'';
        const markerSummary=group.cluster
          ?entries.length+' programme'+(entries.length===1?'':'s')+' across '+group.locationCount+' nearby sites'
          :(entries.length>1?entries.length+' programmes':'1 programme');
        pin.bindTooltip(markerSummary+' · '+sectorSummary+approximateNote+(locationSummary?' · '+locationSummary:''));

        const openPin=()=>{
          selectedProgramme=entries[0]?.id||null;syncMap();
          $('mapSelection').innerHTML='';
          const shown=sorted([...entries]).slice(0,8);
          const rows=shown.map(p=>{
            const salary=Number(p.salary)>0?'£'+Number(p.salary).toLocaleString('en-GB'):'Salary not stated';
            const hours=Number(p.hours)>0?Number(p.hours)+' h/week':'Hours not stated';
            const place=[p.region,(p.postcodes||[]).join(' · ')||p.area].filter(Boolean).join(' · ');
            return '<article class="atlasPopupProgramme"><div class="atlasPopupCopy"><b>'+safeText(p.title||p.employer)+'</b><small>'+safeText(p.employer||'')+'</small><span>'+salary+' · '+hours+'</span><small>'+safeText(place)+'</small></div><button type="button" class="atlasPopupOpen" data-open="'+safeText(p.id)+'">Open</button></article>';
          }).join('');
          const more=entries.length>shown.length?'<p class="atlasPopupMore">Showing '+shown.length+' of '+entries.length+' programmes at this location. Refine your filters to narrow the list.</p>':'';
          const approx=group.approximate?'<p class="map-approx-note">This marker includes an approximate postcode-district centre because a full postcode was not available.</p>':'';
          const content='<div class="atlasPopupContent"><div class="atlasPopupHead"><b>'+entries.length+' programme'+(entries.length===1?'':'s')+' at this location</b><small>'+safeText(sectorSummary)+'</small></div>'+approx+'<div class="atlasPopupList">'+rows+'</div>'+more+'</div>';
          L.popup({className:'atlasProgrammePopup',maxWidth:420,minWidth:270,autoPan:true,autoPanPadding:[24,24],closeButton:true}).setLatLng(c).setContent(content).openOn(placementMap);
        };
        const zoomIntoCluster=()=>{
          if(group.cluster&&group.clusterBounds?.isValid()){
            placementMap.fitBounds(group.clusterBounds,{padding:[48,48],maxZoom:Math.min(placementMap.getZoom()+2,14),animate:true,duration:.35});
          }else openPin();
        };
        pin.on('click',group.cluster?zoomIntoCluster:openPin);
        const el=pin.getElement();
        if(el){
          el.setAttribute('tabindex','0');
          el.setAttribute('role','button');
          el.dataset.programmeCount=String(entries.length);
          el.setAttribute('aria-label',group.cluster
            ?'Zoom into '+entries.length+' programmes across '+group.locationCount+' nearby sites'
            :'Show '+entries.length+' '+sectorSummary+' programme'+(entries.length===1?'':'s')+(locationSummary?' at '+locationSummary:'')+(group.approximate?' · approximate area':''));
          el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();group.cluster?zoomIntoCluster():openPin();}});
        }
      }

      const unresolved=allCodes.size-resolvedCodes.size;
      const summary=[
        programmesWithAllSites.toLocaleString()+' of '+list.length.toLocaleString()+' programmes have all listed sites mapped',
        groups.size.toLocaleString()+' unique sites',
        displayGroups.length.toLocaleString()+' visible map markers'+(window.OrielMapClusterCount?' · '+window.OrielMapClusterCount.toLocaleString()+' clusters':''),
        resolvedCodes.size.toLocaleString()+' of '+allCodes.size.toLocaleString()+' location codes resolved'
      ];
      if(unresolved)summary.push(unresolved.toLocaleString()+' codes still need locating');
      if(programmesWithoutCode)summary.push(programmesWithoutCode.toLocaleString()+' programmes have no postcode/outcode in the source');
      $('mapStatus').textContent=summary.join(' · ');
      $('mapStatus').title='Showing programmes that match your current filters. With no active filters, the full catalogue is shown. At wider zooms, numbered clusters zoom into nearby sites; individual location pins open a programme preview. Outcode-only markers are approximate area locations. Underground station symbols appear from neighbourhood zoom; station data provided by Transport for London.';
      window.OrielMapStats={
        scope:'matching',
        programmes:list.length,
        programmesRepresented:programmePins.size,
        programmesWithAnySite,
        programmesWithAllSites,
        programmesWithoutCode,
        uniqueSites:groups.size,
        visibleMarkers:displayGroups.length,
        clusters:window.OrielMapClusterCount,
        locationCodes:allCodes.size,
        resolvedLocationCodes:resolvedCodes.size,
        unresolvedLocationCodes:unresolved,
        bounds:window.OrielMapCurrentBounds?.isValid?.()?window.OrielMapCurrentBounds.toBBoxString():null
      };
      updateFocusCount();
      syncMap();
      updateViewportHint();
    };
    const scheduleMapRedraw=()=>{
      if(mapRedrawQueued)return;
      mapRedrawQueued=true;
      requestAnimationFrame(()=>{
        mapRedrawQueued=false;
        try{drawMap(currentMapList)}catch(error){console.warn('Map markers could not be refreshed after navigation',error)}
      });
    };
    placementMap.on('popupclose',()=>{selectedProgramme=null;syncMap();});
    placementMap.on('zoomend',()=>{scheduleMapRedraw();updateViewportHint();});
    placementMap.on('moveend',()=>{if(placementMap.getZoom()>=16)scheduleMapRedraw();updateViewportHint();});
    try{drawMap(placements.filter(matches));}catch{}
    // Fit the complete catalogue on first paint as well as after geocoding.
    // This prevents the default London view from hiding the rest of the map.
    requestAnimationFrame(()=>setTimeout(fitScopePins,120));
    return true;
  };

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>100)clearInterval(timer);
  },100);
})();
