'use strict';
/* Personalised commute checks. A weekday 08:00 sample is used so programmes can
   be compared consistently; the route is not a promise of the user's actual rota. */
window.OrielCommute=(()=>{
  const cache=new Map();
  const pending=new Map();
  const normalise=value=>String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  const nextWeekday=()=>{
    const now=new Date();
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(now.getDay()===0||now.getDay()===6||now.getHours()>=8)d.setDate(d.getDate()+1);
    while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()+1);
    return d;
  };
  const dateKey=d=>String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const dateLabel=d=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(d);
  const routeUrl=(origin,destination,date)=>{
    const dKey=dateKey(date);
    return 'https://api.tfl.gov.uk/Journey/JourneyResults/'+encodeURIComponent(origin)+'/to/'+encodeURIComponent(destination)+
      '?journeyPreference=LeastTime&nationalSearch=true&timeIs=Departing&date='+dKey+'&time=0800';
  };
  const mapsUrl=(origin,destination)=>'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(normalise(origin)+', UK')+
    '&destination='+encodeURIComponent(normalise(destination)+', UK')+'&travelmode=transit';
  const timeOnly=value=>{
    if(!value)return '';
    const m=String(value).match(/T(\d{2}:\d{2})/);
    return m?m[1]:'';
  };
  const getJourney=async(origin,destination)=>{
    const from=normalise(origin),to=normalise(destination),date=nextWeekday();
    if(!from||!to)throw new Error('A home and training-site postcode are both needed.');
    const key=from+'|'+to+'|'+dateKey(date)+'|0800';
    if(cache.has(key))return cache.get(key);
    if(pending.has(key))return pending.get(key);
    const request=(async()=>{
      const response=await fetch(routeUrl(from,to,date),{
        headers:{Accept:'application/json'},
        signal:AbortSignal.timeout(14000)
      });
      if(!response.ok)throw new Error('The transport planner returned '+response.status+'.');
      const data=await response.json();
      const journeys=Array.isArray(data?.journeys)?data.journeys:[];
      if(!journeys.length)throw new Error('No public-transport itinerary was returned for this postcode pair.');
      const journey=journeys.filter(x=>Number.isFinite(Number(x.duration))).sort((a,b)=>Number(a.duration)-Number(b.duration))[0];
      if(!journey)throw new Error('The transport planner did not return a usable journey time.');
      const legs=(Array.isArray(journey.legs)?journey.legs:[]).map(leg=>{
        const mode=String(leg.mode?.name||'').toLowerCase();
        return {
          mode,
          summary:String(leg.instruction?.summary||leg.instruction?.detailed||leg.mode?.name||'Transport leg').trim(),
          duration:Number(leg.duration)||0,
          disrupted:!!(leg.disruptions?.length||leg.plannedWorks?.length)
        };
      });
      const nonWalking=legs.filter(x=>x.mode&&x.mode!=='walking');
      const walkingMinutes=Math.round(legs.filter(x=>x.mode==='walking').reduce((sum,x)=>sum+x.duration,0));
      const duration=Math.round(Number(journey.duration));
      const route={
        duration,
        legs:legs.map(x=>x.summary).filter(Boolean).slice(0,5),
        extraLegs:Math.max(0,legs.length-5),
        transfers:Math.max(0,nonWalking.length-1),
        walkingMinutes,
        departure:timeOnly(journey.startDateTime||journey.scheduledDepartureTime),
        arrival:timeOnly(journey.arrivalDateTime||journey.scheduledArrivalTime),
        sampleDate:dateLabel(date),
        disrupted:!!journey.isDisrupted||legs.some(x=>x.disrupted),
        origin:from,
        destination:to,
        source:'TfL Journey Planner'
      };
      cache.set(key,route);
      return route;
    })();
    pending.set(key,request);
    try{return await request}
    finally{pending.delete(key)}
  };
  return {getJourney,mapsUrl,normalise};
})();