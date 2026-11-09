'use strict';
(()=>{
  const url='data/rail-stations-ew.json?v=20261109national1';
  window.ORIEL_RAIL_STATIONS=Array.isArray(window.ORIEL_RAIL_STATIONS)?window.ORIEL_RAIL_STATIONS:[];
  window.OrielRailStationsReady=fetch(url,{cache:'force-cache'})
    .then(response=>{if(!response.ok)throw Error('Rail station data could not be loaded.');return response.json();})
    .then(data=>{
      window.ORIEL_RAIL_STATIONS=Array.isArray(data)?data:[];
      window.dispatchEvent(new CustomEvent('oriel:rail-stations-ready'));
      return window.ORIEL_RAIL_STATIONS;
    })
    .catch(error=>{console.warn('Placement Atlas national rail guidance is using postcode-area fallbacks.',error);return [];});
})();
