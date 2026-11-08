'use strict';
(()=>{
  if(window.ORIEL_TUBE_STATIONS_READY)return;
  window.ORIEL_TUBE_STATIONS=[];
  const source=new URL('data/tube-stations.json',document.baseURI).toString();
  window.ORIEL_TUBE_STATIONS_READY=fetch(source,{cache:'force-cache'})
    .then(response=>{
      if(!response.ok)throw Error('Tube station data returned HTTP '+response.status);
      return response.json();
    })
    .then(payload=>{
      const stations=Array.isArray(payload.stations)?payload.stations:[];
      window.ORIEL_TUBE_STATIONS=stations.filter(s=>
        s&&typeof s.name==='string'&&Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))
      );
      window.ORIEL_TUBE_STATIONS_META={
        attribution:String(payload.attribution||'Data provided by Transport for London'),
        source:String(payload.source||'Transport for London'),
        sourceLastUpdated:String(payload.sourceLastUpdated||'')
      };
      document.dispatchEvent(new CustomEvent('desk:tube-stations-ready',{detail:{count:window.ORIEL_TUBE_STATIONS.length}}));
      return window.ORIEL_TUBE_STATIONS;
    })
    .catch(error=>{
      console.warn('Tube station overlay unavailable; placement map remains usable.',error);
      window.ORIEL_TUBE_STATIONS=[];
      document.dispatchEvent(new CustomEvent('desk:tube-stations-ready',{detail:{count:0,error:String(error)}}));
      return window.ORIEL_TUBE_STATIONS;
    });
})();