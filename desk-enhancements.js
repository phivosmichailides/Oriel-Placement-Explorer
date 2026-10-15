'use strict';
(()=>{
  let installed=false;
  function install(){
    if(installed||!window.__genericPublicInstalled||!window.__sectorPinsInstalled||!window.__onboardingInstalled)return;
    installed=true;
    // Session-only undo history. Uploaded datasets are intentionally outside its scope.
    const saveBase=save;let history=[clone(state)],cursor=0,lastEdit='',lastTime=0,restoring=false,dataset=placements;
    const controls=document.createElement('div');controls.className='historyControls';
    controls.innerHTML='<button class="btn" id="undoDesk" disabled>↶ Undo</button><button class="btn" id="redoDesk" disabled>↷ Redo</button><span class="smallnote" id="historyStatus" role="status">Decisions & preferences · this session</span>';
    document.querySelector('nav.tabs').insertAdjacentElement('afterend',controls);
    function updateHistory(){document.getElementById('undoDesk').disabled=cursor===0;document.getElementById('redoDesk').disabled=cursor===history.length-1;}
    save=()=>{
      saveBase();if(restoring)return;
      if(dataset!==placements){dataset=placements;history=[clone(state)];cursor=0;updateHistory();return;}
      if(JSON.stringify(state)===JSON.stringify(history[cursor]))return;
      const active=document.activeElement,group=['note','priority'].includes(active?.dataset.action)?active.dataset.action+active.closest('[data-id]')?.dataset.id:active?.dataset.weight||'';
      const now=Date.now();
      if(group&&group===lastEdit&&now-lastTime<800&&cursor===history.length-1&&cursor>0)history[cursor]=clone(state);
      else{history=history.slice(0,cursor+1);history.push(clone(state));if(history.length>31)history.shift();cursor=history.length-1;}
      lastEdit=group;lastTime=now;updateHistory();
    };
    function travel(delta){
      if(cursor+delta<0||cursor+delta>=history.length)return;
      const oldProfile=JSON.stringify(state.prefs.onboarding);
      cursor+=delta;restoring=true;state=clone(history[cursor]);saveBase();restoring=false;lastEdit='';
      const profile=state.prefs.onboarding;
      try{if(profile){localStorage.setItem('phivos-onboarding-profile-v1',JSON.stringify(profile));localStorage.setItem('phivos-onboarding-v1','1')}else{localStorage.removeItem('phivos-onboarding-profile-v1');localStorage.removeItem('phivos-onboarding-v1')}}catch{}
      if(oldProfile!==JSON.stringify(profile)){$('region').value=profile?.region||'';$('salary').value=profile?.salary||'';$('hours').value=profile?.hours||'';quick.delete('london');}
      document.body.classList.toggle('deskPersonalised',!!profile);renderAll();document.dispatchEvent(new CustomEvent('desk:palette'));updateHistory();
      $('historyStatus').textContent=delta<0?'Change undone.':'Change restored.';
    }
    $('undoDesk').onclick=()=>travel(-1);$('redoDesk').onclick=()=>travel(1);
    document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.key.toLowerCase()==='z'){e.preventDefault();travel(e.shiftKey?1:-1)}});
    document.addEventListener('desk:dataset',()=>{dataset=placements;history=[clone(state)];cursor=0;lastEdit='';updateHistory()});

    const box=document.createElement('details');box.className='distanceFilter';
    box.innerHTML='<summary>Search within a distance</summary><p class="smallnote">Choose a map point or look up a UK postcode. Straight-line distance, not commute time. A programme matches if at least one known training location is inside the circle; other rotations may be farther away. Unlocated programmes are excluded while this filter is on.</p><label class="field"><span>Postcode (optional)</span><input id="radiusPostcode" placeholder="e.g. SW1A 1AA" autocomplete="off" maxlength="10"></label><p class="smallnote">“Look up postcode” sends only this postcode to postcodes.io. Your search centre stays in memory for this visit and is not included in study exports.</p><div class="researchActions"><button class="btn" id="radiusLookup">Look up postcode</button><button class="btn" id="radiusPick">Choose point on map</button></div><label class="field"><span>Radius in kilometres</span><select id="radiusKm"><option value="1">1 km</option><option value="5">5 km</option><option value="10" selected>10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option><option value="200">200 km</option></select></label><button class="textbtn" id="radiusClear">Clear distance filter</button><p id="radiusStatus" role="status">No distance filter applied.</p>';
    document.querySelector('.filters .footerbar').insertAdjacentElement('beforebegin',box);
    let centre=null,circle=null,picking=false,lookupVersion=0;
    const distanceStatus=message=>$('radiusStatus').textContent=message;
    window.deskWithinRadius=p=>!centre||p.postcodes.some(pc=>{const point=geo[pcKey(pc)];return point&&L.latLng(centre).distanceTo(L.latLng(point))<=Number($('radiusKm').value)*1000});
    const baseMatches=matches;matches=p=>baseMatches(p)&&window.deskWithinRadius(p);
    function redraw(){
      if(circle){circle.remove();circle=null;}
      if(centre&&placementMap){circle=L.circle(centre,{radius:Number($('radiusKm').value)*1000,color:'#172b22',weight:2,fillOpacity:0.06,interactive:false}).addTo(placementMap);placementMap.fitBounds(circle.getBounds(),{padding:[25,25]});}
      renderAll();
      if(centre){const unknown=placements.filter(p=>!p.postcodes.some(pc=>geo[pcKey(pc)])).length;distanceStatus(`Within ${$('radiusKm').value} km of your selected point. ${unknown} programmes have no mapped location and cannot be checked. Region and other filters still apply.`);}
    }
    function setCentre(point){centre=point;picking=false;$('radiusPick').textContent='Choose point on map';$('radiusPick').setAttribute('aria-pressed','false');redraw();}
    $('radiusLookup').onclick=async()=>{
      const postcode=$('radiusPostcode').value.trim();if(!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode)){distanceStatus('Enter a full UK postcode, or choose a point on the map.');return;}
      const version=++lookupVersion;$('radiusLookup').disabled=true;distanceStatus('Looking up postcode…');
      try{const r=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(postcode),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Postcode not found or lookup unavailable.');const data=(await r.json()).result;if(!Number.isFinite(data?.latitude)||!Number.isFinite(data?.longitude))throw Error('No coordinates available for this postcode.');if(version===lookupVersion)setCentre([data.latitude,data.longitude]);}
      catch(error){if(version===lookupVersion)distanceStatus(error.message+' Existing distance filter unchanged. You can also choose a map point.');}
      finally{$('radiusLookup').disabled=false;}
    };
    $('radiusPick').onclick=()=>{
      if(!placementMap){distanceStatus('Map unavailable. Try the postcode lookup instead.');return;}
      ++lookupVersion;picking=!picking;$('radiusPick').textContent=picking?'Cancel point selection':'Choose point on map';$('radiusPick').setAttribute('aria-pressed',String(picking));distanceStatus(picking?'Click or tap an empty part of the map to set the centre. Use postcode lookup if you prefer keyboard input.':'Point selection cancelled.');if(picking)$('placementMap').scrollIntoView({block:'center'});
    };
    // Leaflet may finish initialising after the desk; attach once it exists.
    let bound=false;const bindMap=()=>{if(!placementMap||bound)return false;bound=true;placementMap.on('click',e=>{if(picking)setCentre([e.latlng.lat,e.latlng.lng])});return true;};
    if(!bindMap()){let tries=0;const timer=setInterval(()=>{if(bindMap()||++tries>100)clearInterval(timer)},100);}
    $('radiusKm').onchange=()=>{if(centre)redraw()};
    const clearRadius=()=>{++lookupVersion;centre=null;picking=false;$('radiusPostcode').value='';$('radiusPick').textContent='Choose point on map';$('radiusPick').setAttribute('aria-pressed','false');redraw();distanceStatus('No distance filter applied.');};
    $('radiusClear').onclick=clearRadius;$('resetBtn').addEventListener('click',clearRadius);
  }
  let tries=0;const timer=setInterval(()=>{install();if(installed||++tries>150)clearInterval(timer)},100);
})();
