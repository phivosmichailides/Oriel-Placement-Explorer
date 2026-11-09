'use strict';
/* Railway-corridor signposts, not a journey-time engine.
   Sources for the broad corridors:
   TfL Elizabeth line map https://content.tfl.gov.uk/elizabeth-line-map.pdf
   TfL journey planner https://tfl.gov.uk/plan-a-journey/
   SWR route timetables https://www.southwesternrailway.com/plan-my-journey/timetables
   Thameslink route map https://www.thameslinkrailway.com/travel-information/plan-your-journey/route-map
   Southeastern route map https://www.southeasternrailway.co.uk/travel-information/plan-your-journey/our-routes
   Greater Anglia https://www.greateranglia.co.uk/travel-information/journey-planning/network-map
   Site coordinates are read from the local Oriel postcodes/locations.json data only. */
window.OrielLocationGuide=(()=>{
 const first=p=>String((p.postcodes||[])[0]||'').trim().toUpperCase().replace(/\s+/g,' ');
 const area=p=>String(p.area||'').trim();
 const regexp=(pattern)=>new RegExp(pattern,'i');
 const guides=[
  // Each entry is intentionally restricted to a district or narrower: employer name is NOT a location.
  ['^N1\\s*0SL$','Clockwork Pharmacy · Caledonian Road','161 Caledonian Road is around a 10–15 minute walk from King’s Cross St Pancras; Caledonian Road & Barnsbury Overground is another nearby option.','tfl'],
  ['^N1(?:\\s|$)','Islington / Caledonian Road','King’s Cross/St Pancras and the Piccadilly line are useful starting points; check the specific branch address.','tfl'],
  ['^N7(?:\\s|$)','Holloway / Islington','Piccadilly line (Caledonian Road/Holloway Road) and north London rail connections are useful corridors.','tfl'],
  ['^N11(?:\\s|$)','Bounds Green / north London','Piccadilly line via Bounds Green is a useful central-London connection.','tfl'],
  ['^N15(?:\\s|$)','Tottenham / Tottenham Hale area','Victoria line and rail from Tottenham Hale are useful, depending on the exact postcode.','tfl'],
  ['^N17(?:\\s|$)','Tottenham / north-east London','Victoria line from Seven Sisters/Tottenham Hale may help; check the local journey to the site.','tfl'],
  ['^N22(?:\\s|$)','Wood Green / north London','Piccadilly line and nearby rail corridors are relevant; the closest station depends on the address.','tfl'],
  ['^N2(?:\\s|$)','East Finchley / north London','Northern line via East Finchley is a useful route to central London.','tfl'],
  ['^N3(?:\\s|$)','Finchley / north London','Northern line via Finchley Central is a useful corridor.','tfl'],
  ['^N12(?:\\s|$)','North Finchley / north London','Northern line stations and onward buses are typical options; check the branch postcode.','tfl'],
  ['^N20(?:\\s|$)','Whetstone / north London','Northern line via Totteridge & Whetstone is a useful corridor.','tfl'],
  ['^N10(?:\\s|$)','Muswell Hill / north London','This area is often bus-led; check connections to nearby Tube stations rather than assuming a direct train.','tfl'],
  ['^E8(?:\\s|$)','Hackney / east London','London Overground via Hackney Central and buses connect this area; confirm the nearest stop to the pharmacy.','tfl'],
  ['^E9(?:\\s|$)','Hackney / Homerton','London Overground via Homerton or Hackney Central is a useful starting point; the precise branch matters.','tfl'],
  ['^E13(?:\\s|$)','Plaistow / east London','District and Hammersmith & City lines through Plaistow/Upton Park are useful central-London corridors.','tfl'],
  ['^E15(?:\\s|$)','Stratford / east London','Stratford connects the Elizabeth, Jubilee and Central lines with National Rail; check the local leg.','tfl'],
  ['^E20(?:\\s|$)','Stratford / Olympic Park','Stratford is a major rail and Underground interchange with Elizabeth, Jubilee and Central lines.','tfl'],
  ['^E1(?:\\s|$)','Whitechapel / east-central London','Whitechapel offers Elizabeth, District and Hammersmith & City connections, depending on the site.','tfl'],
  ['^E14(?:\\s|$)','Docklands / east London','Canary Wharf, the DLR, Jubilee and Elizabeth line can be useful, depending on the branch.','tfl'],
  ['^E3(?:\\s|$)','Bow / east London','District/Hammersmith & City lines and the DLR are useful corridors; exact nearest station varies.','tfl'],
  ['^E16(?:\\s|$)','Canning Town / Royal Docks · east London','Jubilee line and DLR are key connections; Stratford and Canary Wharf are useful interchanges, while the exact postcode determines whether Canning Town or Custom House is the more practical starting station.','tfl'],
  ['^E17(?:\\s|$)','Walthamstow / north-east London','Victoria line from Walthamstow Central and Overground services are useful corridors.','tfl'],
  ['^E18(?:\\s|$)','South Woodford / east London','Central line via South Woodford is a useful central-London connection.','tfl'],
  ['^E11(?:\\s|$)','Leytonstone / east London','Central line via Leytonstone is a useful corridor.','tfl'],
  ['^EC','City of London','Farringdon, Liverpool Street, Moorgate and Bank provide multiple connections; nearest hub varies by street.','tfl'],
  ['^WC','Bloomsbury / central London','King’s Cross, Russell Square, Holborn and Farringdon are nearby central-London corridors depending on the postcode.','tfl'],
  ['^SE1(?:\\s|$)','London Bridge / Southwark','London Bridge, Waterloo and Borough offer strong rail/Tube links; check the actual site address.','tfl'],
  ['^SE16(?:\\s|$)','Bermondsey / Rotherhithe','Jubilee line via Bermondsey/Canada Water and Overground via Canada Water can help.','tfl'],
  ['^SE17(?:\\s|$)','Elephant & Castle / south London','Northern/Bakerloo lines and Thameslink through Elephant & Castle are useful.','tfl'],
  ['^SE15(?:\\s|$)','Peckham / south-east London','Peckham Rye and Queens Road Peckham provide rail/Overground connections; use exact postcode.','tfl'],
  ['^SE22(?:\\s|$)','East Dulwich / south-east London','Southern rail towards London Bridge is a useful corridor; check walking distance to the site.','national'],
  ['^SE21(?:\\s|$)','Dulwich / south London','Connections vary across Dulwich; West Dulwich and North Dulwich link to different London terminals.','national'],
  ['^SE24(?:\\s|$)','Herne Hill / south London','Thameslink and Southeastern services via Herne Hill offer connections to central London.','national'],
  ['^SE5(?:\\s|$)','Camberwell / south London','Bus links to Denmark Hill, Elephant & Castle or Oval may be needed; do not assume a nearby Tube station.','tfl'],
  ['^SE18(?:\\s|$)','Woolwich / south-east London','Elizabeth line via Woolwich and rail/DLR via Woolwich Arsenal provide different London connections.','tfl'],
  ['^SE7(?:\\s|$)','Charlton / south-east London','National Rail via Charlton towards London Bridge/Cannon Street is a useful starting point.','national'],
  ['^SE9(?:\\s|$)','Eltham / south-east London','Southeastern rail towards London Bridge, Charing Cross or Cannon Street is useful, depending on the station.','national'],
  ['^SE12(?:\\s|$)','Lee / south-east London','Southeastern rail from Lee is a useful route towards central London.','national'],
  ['^SW1[A-Z]?(?:\\s|$)','Westminster / Victoria','Victoria, Waterloo and central Tube interchanges are useful; check the site’s nearest station.','tfl'],
  ['^SW3(?:\\s|$)','Chelsea / west London','Sloane Square/South Kensington Underground and local buses can be useful; check the final leg.','tfl'],
  ['^SW6(?:\\s|$)','Fulham / south-west London','District line via Fulham Broadway/Parsons Green and buses are useful corridors.','tfl'],
  ['^SW10(?:\\s|$)','Chelsea / west London','District line and buses from Earl’s Court/Fulham Broadway may help; check the exact hospital entrance.','tfl'],
  ['^SW11(?:\\s|$)','Battersea / south-west London','Clapham Junction connects to Waterloo and Victoria; Battersea Power Station has Northern line links.','tfl'],
  ['^SW12(?:\\s|$)','Balham / south London','Northern line and Southern trains from Balham to Victoria are useful.','national'],
  ['^SW16(?:\\s|$)','Streatham / south London','Streatham station has Thameslink; Streatham Hill and Streatham Common use Southern services towards Victoria. Check which is closest.','national'],
  ['^SW17(?:\\s|$)','Tooting / south-west London','Northern line around Tooting Broadway/Bec and Thameslink at Tooting railway station serve different parts.','tfl'],
  ['^SW18(?:\\s|$)','Wandsworth / south-west London','Waterloo–Clapham Junction rail corridor and local buses are useful; exact nearest station varies.','swr'],
  ['^SW19(?:\\s|$)','Wimbledon / south-west London','South Western Railway from Waterloo, the District line and Thameslink provide options at Wimbledon.','swr'],
  ['^SW20(?:\\s|$)','Raynes Park / south-west London','South Western Railway via Raynes Park offers trains towards London Waterloo.','swr'],
  ['^SW14(?:\\s|$)','East Sheen / south-west London','South Western Railway via Mortlake or Barnes provides links towards Waterloo; confirm walk or bus.','swr'],
  ['^SW15(?:\\s|$)','Putney / Roehampton','Putney has Waterloo-bound South Western Railway and District line connections; Roehampton often needs a bus.','swr'],
  ['^W5(?:\\s|$)','Ealing Broadway / west London','Elizabeth, Central and District lines meet at Ealing Broadway; check the actual pharmacy’s last leg.','tfl'],
  ['^W13(?:\\s|$)','West Ealing / west London','Elizabeth line at West Ealing is a useful central-London connection.','tfl'],
  ['^W12(?:\\s|$)','Shepherd’s Bush / west London','Central line, Overground and the Hammersmith & City corridor may be useful, depending on the branch.','tfl'],
  ['^W4(?:\\s|$)','Chiswick / west London','District line via Turnham Green/Gunnersbury or SWR via Chiswick station; check which is nearer.','swr'],
  ['^W3(?:\\s|$)','Acton / west London','Central, Elizabeth and Overground corridors serve different parts of Acton; check the closest station.','tfl'],
  ['^W7(?:\\s|$)','Hanwell / west London','Elizabeth line at Hanwell is a useful corridor.','tfl'],
  ['^W2(?:\\s|$)','Paddington / west-central London','Paddington has the Elizabeth line, GWR and several Tube lines.','tfl'],
  ['^NW1(?:\\s|$)','Camden / north-central London','Northern line, Overground and King’s Cross/Euston corridors are useful, depending on the site.','tfl'],
  ['^NW3(?:\\s|$)','Hampstead / north London','Northern line and London Overground may help; nearest stop depends on the postcode.','tfl'],
  ['^NW10(?:\\s|$)','Willesden / north-west London','Jubilee/Bakerloo lines and Overground serve different parts; check the station near the site.','tfl'],
  ['^NW2(?:\\s|$)','Cricklewood / north-west London','Thameslink at Cricklewood and Jubilee line at nearby stations may be useful, depending on the address.','tfl'],
  ['^HA5(?:\\s|$)','Pinner / Eastcote area','Metropolitan/Piccadilly lines around Eastcote or Pinner may be relevant; check the exact postcode.','tfl'],
  ['^UB3(?:\\s|$)','Hayes / west London','Elizabeth line at Hayes & Harlington is a key corridor; allow for the local leg.','tfl'],
  ['^UB1(?:\\s|$)','Southall / west London','Elizabeth line from Southall towards Paddington/central London is useful.','tfl'],
  ['^UB7(?:\\s|$)','West Drayton / west London','Elizabeth line at West Drayton connects towards central London.','tfl'],
  ['^UB8(?:\\s|$)','Uxbridge / west London','Metropolitan/Piccadilly lines to Uxbridge are useful but the local leg can be significant.','tfl'],
  ['^TW3(?:\\s|$)','Hounslow / west London','Piccadilly line and South Western Railway serve different Hounslow stations; check which is nearest.','swr'],
  ['^TW7(?:\\s|$)','Isleworth / west London','SWR via Isleworth and connections through Hounslow or Richmond are useful.','swr'],
  ['^TW9(?:\\s|$)','Richmond / south-west London','SWR to Waterloo, District line and Overground serve Richmond.','swr'],
  ['^TW10(?:\\s|$)','Richmond Hill / south-west London','Richmond station provides SWR, District line and Overground services; final journey varies.','swr'],
  ['^TW13(?:\\s|$)','Feltham / west London','SWR from Feltham towards Waterloo; check local access to the pharmacy.','swr'],
  ['^TW18(?:\\s|$)','Staines / Surrey','South Western Railway from Staines towards Waterloo; final journey depends on the branch.','swr'],
  ['^KT1(?:\\s|$)','Kingston / south-west of London','SWR from Kingston towards London Waterloo; check the pharmacy’s exact distance from the station.','swr'],
  ['^KT2(?:\\s|$)','Kingston / north Kingston','SWR via Kingston or Norbiton towards London Waterloo is useful.','swr'],
  ['^KT3(?:\\s|$)','New Malden / south-west London','SWR from New Malden towards Waterloo is useful.','swr'],
  ['^KT5(?:\\s|$)','Surbiton / south-west London','SWR from Surbiton offers fast services towards Waterloo; verify the site walk.','swr'],
  ['^KT6(?:\\s|$)','Surbiton / south-west London','SWR from Surbiton provides Waterloo connections; check which end of the postcode area.','swr'],
  ['^KT9(?:\\s|$)','Chessington / south-west London','SWR Chessington branch towards Waterloo; check which station serves the site.','swr'],
  ['^KT12(?:\\s|$)','Walton-on-Thames / Surrey','SWR from Walton-on-Thames to Waterloo; local travel may be needed.','swr'],
  ['^SM1(?:\\s|$)','Sutton / south London','Southern/Thameslink routes to London terminals depending on station; confirm the site.','national'],
  ['^SM5(?:\\s|$)','Carshalton / south London','Rail from Carshalton/Carshalton Beeches via Southern; check exact workplace access.','national'],
  ['^BR1(?:\\s|$)','Bromley / south-east London','Bromley South uses services to Victoria; Bromley North has a different connection — check the site.','national'],
  ['^BR6(?:\\s|$)','Orpington / south-east London','Southeastern rail from Orpington to London Bridge/Charing Cross/Victoria; check the train.','national'],
  ['^DA1(?:\\s|$)','Dartford / Kent edge','Southeastern routes connect Dartford with London Bridge and other London terminals; check the local bus.','national'],
  ['^DA2(?:\\s|$)','Dartford / Kent edge','Southeastern from Dartford to London terminals; hospital sites may require onward bus travel.','national'],
  ['^TN13(?:\\s|$)','Sevenoaks / Kent','Southeastern via Sevenoaks towards London Bridge and Charing Cross; check the station-to-work leg.','national'],
  ['^SL1(?:\\s|$)','Slough / Berkshire','Elizabeth line to central London and fast GWR services to Paddington; check the last leg.','tfl'],
  ['^SL2(?:\\s|$)','Wexham / Slough','Use Slough station (Elizabeth line / GWR) plus a local bus or other onward journey.','tfl'],
  ['^SL6(?:\\s|$)','Maidenhead / Berkshire','Elizabeth line and GWR services via Maidenhead link towards London Paddington.','tfl'],
  ['^RG1(?:\\s|$)','Reading town centre / Berkshire','Fast GWR trains from Paddington to Reading; Elizabeth line is an alternative but typically slower.','national'],
  ['^RG4(?:\\s|$)','Caversham / Reading','Reach Reading via Paddington (GWR) or Elizabeth line, then cross the river by local transport.','national'],
  ['^RG2(?:\\s|$)','South Reading / Berkshire','Reading rail links to Paddington (GWR/Elizabeth), then a local transfer may be needed.','national'],
  ['^AL1(?:\\s|$)','St Albans / Hertfordshire','Thameslink via St Albans City towards St Pancras, Farringdon and Blackfriars.','national'],
  ['^AL2(?:\\s|$)','St Albans outskirts / Hertfordshire','Thameslink via St Albans City or local rail/bus links; check the exact workplace.','national'],
  ['^WD17(?:\\s|$)','Watford / Hertfordshire','Watford Junction links by rail to Euston; check the walk or bus to the site.','national'],
  ['^WD18(?:\\s|$)','Watford / Hertfordshire','Watford Junction is a useful Euston rail link, but some sites require onward transport.','national'],
  ['^WD24(?:\\s|$)','North Watford / Hertfordshire','Watford Junction and local rail/bus services connect towards London Euston.','national'],
  ['^WD6(?:\\s|$)','Borehamwood / Hertfordshire','Thameslink from Elstree & Borehamwood to St Pancras/Farringdon; check the site walk.','national'],
  ['^SG1(?:\\s|$)','Stevenage / Hertfordshire','Fast rail services connect Stevenage with King’s Cross; some sites require a local bus.','national'],
  ['^SG6(?:\\s|$)','Letchworth / Hertfordshire','Great Northern/Thameslink rail towards King’s Cross/St Pancras, depending on the service.','national'],
  ['^LU1(?:\\s|$)','Luton / Bedfordshire','Thameslink from Luton towards St Pancras, Farringdon and Blackfriars.','national'],
  ['^LU4(?:\\s|$)','Luton / Bedfordshire','Thameslink via Luton/Luton Airport Parkway towards St Pancras; allow for local travel.','national'],
  ['^CM20(?:\\s|$)','Harlow / Essex','Greater Anglia trains from Harlow Town towards Liverpool Street and Stratford; local bus may be needed.','national'],
  ['^CM1(?:\\s|$)','Chelmsford / Essex','Greater Anglia trains between Chelmsford and Liverpool Street.','national'],
  ['^CM2(?:\\s|$)','Chelmsford / Essex','Greater Anglia rail from Chelmsford to Liverpool Street; check the branch’s last leg.','national'],
  ['^RM1(?:\\s|$)','Romford / east London','Elizabeth line via Romford to central London; local access varies by postcode.','tfl'],
  ['^SS1(?:\\s|$)','Southend / Essex','c2c or Greater Anglia corridors connect towards London terminals; use the exact station.','national'],
  ['^RH1(?:\\s|$)','Redhill / Surrey','Rail services via Redhill connect to London Bridge or Victoria; hospital may require a bus.','national'],
  ['^GU1(?:\\s|$)','Guildford / Surrey','South Western Railway from Guildford to Waterloo; check the last leg from the station.','swr'],
  ['^GU2(?:\\s|$)','Guildford / Surrey','SWR via Guildford towards Waterloo, but hospital sites often need onward transport.','swr'],
  ['^GU21(?:\\s|$)','Woking / Surrey','SWR from Woking to London Waterloo; check the walk or bus from station.','swr'],
  ['^GU16(?:\\s|$)','Frimley / Surrey','Frimley rail has different connections from fast Woking services; check transfers carefully.','national'],
  ['^SS16(?:\\s|$)','Basildon / Essex','c2c rail to London Fenchurch Street via Basildon; hospital access may need a local bus.','national']
 ];
 const PLACE_BY_POSTCODE=Object.freeze({
  AL:'St Albans / Hertfordshire',B:'Birmingham',BA:'Bath / Somerset',BB:'Blackburn / Lancashire',BD:'Bradford / West Yorkshire',
  BH:'Bournemouth',BL:'Bolton',BN:'Brighton',BR:'Bromley / south-east London',BS:'Bristol',CA:'Carlisle / Cumbria',
  CB:'Cambridge',CF:'Cardiff',CH:'Chester / Cheshire',CM:'Chelmsford / Essex',CO:'Colchester / Essex',CR:'Croydon / south London',
  CT:'Canterbury / Kent',CV:'Coventry',CW:'Crewe / Cheshire',DA:'Dartford / Kent',DE:'Derby',DH:'Durham',DL:'Darlington',
  DN:'Doncaster / South Yorkshire',DT:'Dorchester / Dorset',DY:'Dudley / West Midlands',E:'East London',EC:'City of London',
  EN:'Enfield / north London',EX:'Exeter / Devon',FY:'Blackpool',GL:'Gloucester',GU:'Guildford / Surrey',HA:'Harrow / north-west London',
  HD:'Huddersfield',HG:'Harrogate',HP:'Hemel Hempstead',HR:'Hereford',HU:'Hull',HX:'Halifax',IG:'Ilford / east London',
  IP:'Ipswich / Suffolk',KT:'Kingston / Surrey',L:'Liverpool',LA:'Lancaster / Cumbria',LE:'Leicester',LL:'North Wales',
  LN:'Lincoln',LS:'Leeds',LU:'Luton',M:'Manchester',ME:'Maidstone / Kent',MK:'Milton Keynes',N:'North London',
  NE:'Newcastle upon Tyne',NG:'Nottingham',NN:'Northampton',NP:'Newport / South Wales',NR:'Norwich',NW:'North-west London',
  OL:'Oldham / Greater Manchester',OX:'Oxford',PE:'Peterborough',PL:'Plymouth',PO:'Portsmouth',PR:'Preston / Lancashire',
  RG:'Reading / Berkshire',RH:'Redhill / Surrey',RM:'Romford / east London',S:'Sheffield',SA:'Swansea',SE:'South-east London',
  SG:'Stevenage',SK:'Stockport',SL:'Slough / Berkshire',SM:'Sutton / south London',SN:'Swindon',SO:'Southampton',
  SP:'Salisbury',SR:'Sunderland',SS:'Southend-on-Sea',ST:'Stoke-on-Trent',SW:'South-west London',SY:'Shrewsbury / Shropshire',
  TA:'Taunton / Somerset',TF:'Telford',TN:'Tunbridge Wells / Kent',TQ:'Torquay',TR:'Truro / Cornwall',TS:'Middlesbrough',
  TW:'Hounslow / west London',UB:'Hayes / Uxbridge',W:'West London',WA:'Warrington',WC:'Bloomsbury / central London',
  WD:'Watford / Hertfordshire',WF:'Wakefield',WN:'Wigan',WR:'Worcester',WS:'Walsall',WV:'Wolverhampton',YO:'York'
 });
 const HUB_BY_POSTCODE=Object.freeze({
  AL:'St Albans City',B:'Birmingham New Street',BA:'Bath Spa',BD:'Bradford Interchange',BH:'Bournemouth',BL:'Bolton',
  BN:'Brighton',BS:'Bristol Temple Meads',CA:'Carlisle',CB:'Cambridge',CF:'Cardiff Central',CH:'Chester',
  CM:'Chelmsford',CO:'Colchester',CT:'Canterbury East',CV:'Coventry',CW:'Crewe',DA:'Dartford',DE:'Derby',
  DH:'Durham',DL:'Darlington',DN:'Doncaster',DT:'Dorchester South',DY:'Dudley Port',EX:'Exeter St Davids',
  FY:'Blackpool North',GL:'Gloucester',GU:'Guildford',HD:'Huddersfield',HG:'Harrogate',HR:'Hereford',
  HU:'Hull',HX:'Halifax',IP:'Ipswich',L:'Liverpool Lime Street',LA:'Lancaster',LE:'Leicester',LL:'Llandudno Junction',
  LN:'Lincoln',LS:'Leeds',LU:'Luton',M:'Manchester Piccadilly',ME:'Maidstone East',MK:'Milton Keynes Central',
  NE:'Newcastle',NG:'Nottingham',NN:'Northampton',NP:'Newport',NR:'Norwich',OL:'Manchester Victoria',
  OX:'Oxford',PE:'Peterborough',PL:'Plymouth',PO:'Portsmouth & Southsea',PR:'Preston',RG:'Reading',
  RH:'Redhill',S:'Sheffield',SA:'Swansea',SG:'Stevenage',SK:'Stockport',SL:'Slough',SN:'Swindon',
  SO:'Southampton Central',SP:'Salisbury',SR:'Sunderland',SS:'Southend Central',ST:'Stoke-on-Trent',
  SY:'Shrewsbury',TA:'Taunton',TF:'Telford Central',TN:'Tunbridge Wells',TQ:'Torquay',TR:'Truro',
  TS:'Middlesbrough',WA:'Warrington Central',WD:'Watford Junction',WF:'Wakefield Westgate',
  WN:'Wigan North Western',WR:'Worcester Foregate Street',WS:'Walsall',WV:'Wolverhampton',YO:'York'
 });
 const LONDON_LOCAL_HUBS=Object.freeze({
  SW10:"Earl's Court",SW6:'Fulham Broadway',SW11:'Clapham Junction',SW1:'Victoria',SE24:'Herne Hill',
  SE1:'London Bridge',SE16:'Canada Water',SE15:'Peckham Rye',SE5:'Denmark Hill',N1:'Highbury & Islington',
  N7:'Caledonian Road',N4:'Finsbury Park',NW1:'Camden Town',NW3:'Hampstead',E1:'Whitechapel',
  E8:'Dalston Junction',E14:'Canary Wharf',E16:'Canning Town',W1:'Oxford Circus',W2:'Paddington',
  W5:'Ealing Broadway',WC1:'Russell Square',EC1:'Farringdon',BR1:'Bromley South',CR0:'East Croydon',
  KT1:'Kingston',TW3:'Hounslow Central',UB3:'Hayes & Harlington',WD17:'Watford Junction'
 });
 const postcodePrefix=postcode=>(String(postcode||'').match(/^([A-Z]{1,2})/i)||[])[1]?.toUpperCase()||'';
 const postcodeDistrict=postcode=>(String(postcode||'').toUpperCase().replace(/\\s+/g,'').match(/^([A-Z]{1,2}\\d{1,2}[A-Z]?)/)||[])[1]||'';
 const distanceKm=(aLat,aLng,bLat,bLng)=>{
  const rad=value=>value*Math.PI/180,dLat=rad(bLat-aLat),dLng=rad(bLng-aLng);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
 };
 const nearestStations=site=>{
  const lat=Number(site?.lat),lng=Number(site?.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return [];
  const candidates=[];
  (Array.isArray(window.ORIEL_RAIL_STATIONS)?window.ORIEL_RAIL_STATIONS:[]).forEach(station=>{
   const sLat=Number(station.lat),sLng=Number(station.lng);
   if(Number.isFinite(sLat)&&Number.isFinite(sLng))candidates.push({name:station.name,lat:sLat,lng:sLng,type:'National Rail'});
  });
  (Array.isArray(window.ORIEL_TUBE_STATIONS)?window.ORIEL_TUBE_STATIONS:[]).forEach(station=>{
   const sLat=Number(station.lat),sLng=Number(station.lng);
   if(Number.isFinite(sLat)&&Number.isFinite(sLng))candidates.push({name:station.name,lat:sLat,lng:sLng,type:'London Underground',lines:station.lines||''});
  });
  const seen=new Set();
  return candidates.map(station=>({...station,distanceKm:distanceKm(lat,lng,station.lat,station.lng)}))
   .filter(station=>Number.isFinite(station.distanceKm))
   .sort((a,b)=>a.distanceKm-b.distanceKm)
   .filter(station=>{const key=station.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;})
   .slice(0,3);
 };
 const isLondonPlace=(postcode,p)=>{
  return String(p?.region||'').toLowerCase()==='london'||/^(EC|WC|N|NW|E|SE|SW|W)\\d/i.test(String(postcode||''));
 };
 const postcodeHub=postcode=>{
  const district=postcodeDistrict(postcode),prefix=postcodePrefix(postcode);
  return LONDON_LOCAL_HUBS[district]||HUB_BY_POSTCODE[prefix]||null;
 };
 const placeName=(p,postcode,nearest=[])=>{
  const named=area(p);
  if(named&&!/^(england|wales|united kingdom|uk)$/i.test(named))return named;
  const prefix=postcodePrefix(postcode);
  return PLACE_BY_POSTCODE[prefix]||nearest[0]?.name||String(p?.region||'').trim()||'Local area';
 };
 function getDirection(lat,lon,lat0,lon0){
  const kmLat=(lat-lat0)*111.1,kmLon=(lon-lon0)*111.1*Math.cos(lat0*Math.PI/180);
  const dist=Math.sqrt(kmLat*kmLat+kmLon*kmLon);
  const brg=(Math.atan2(kmLon,kmLat)*180/Math.PI+360)%360;
  const compass=['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(brg/45)%8];
  return {distanceKm:Math.round(dist),compass,label:dist<3?'Around central London':dist<22?compass+' London':compass+' of central London'};
 }
 const lookup=(p,sites=[])=>{
  const pc=first(p),g=guides.find(x=>regexp(x[0]).test(pc)),site=sites[0]||null;
  const nearest=site?nearestStations(site):[];
  const place=placeName(p,pc,nearest);
  const london=isLondonPlace(pc,p);
  const fallbackHub=postcodeHub(pc);
  const hub=nearest[0]?.name||fallbackHub||null;
  let headline=g?g[1]:place;
  let connections=g?g[2]:'';
  if(!g){
   if(nearest.length){
    const n=nearest[0],type=n.type==='London Underground'?'Underground station':'National Rail station';
    connections='Nearby '+type+': '+n.name+' (about '+n.distanceKm.toFixed(1)+' km straight-line from the listed postcode). Local buses or walking can complete the final leg; check the exact site entrance and current services.';
   }else if(fallbackHub){
    connections='A useful local rail reference is '+fallbackHub+' station. Local buses or walking can complete the final leg; check the exact workplace address and current services.';
   }else{
    connections='Use the main rail station serving '+place+' where rail is available, then check local buses or walking for the final leg to the exact training address.';
   }
  }else if(nearest.length&&!connections.toLowerCase().includes(nearest[0].name.toLowerCase())){
   connections+=' Nearby mapped station: '+nearest[0].name+' (about '+nearest[0].distanceKm.toFixed(1)+' km straight-line).';
  }
  const whole=(String(p.area||'')+' '+String(p.title||'')).toLowerCase();
  if(/university of nottingham|nottingham university/.test(whole)){
   headline='Nottingham · University area';
   if(!/nottingham/i.test(connections))connections='Nottingham railway station is the main rail arrival point; the university area is served by local tram and bus links. Check the exact campus building and stop.';
  }
  const relative=london&&site?getDirection(site.lat,site.lng,51.5074,-0.1278).label:null;
  const multi=(p.postcodes||[]).filter(Boolean).length>1;
  const detail=multi?'Multiple training locations are listed; the most useful station and final leg can change between rotations.':
   nearest.length?'Station distance is straight-line, not a walking-route estimate; use the directions link for the actual walk or bus.':
   'Check the exact workplace entrance and final walk or bus leg.';
  return {headline,relative,connections,detail,source:g?g[3]:(london?'tfl':'national'),hub,hubDistanceKm:nearest[0]?.distanceKm??null,
   hubType:nearest[0]?.type||null,nearbyStations:nearest,postcodes:(p.postcodes||[]).filter(Boolean),multi,place};
 };
 const describePostcode=postcode=>{
  const pc=String(postcode||'').trim().toUpperCase().replace(/\\s+/g,' '),g=guides.find(x=>regexp(x[0]).test(pc));
  const prefix=postcodePrefix(pc),place=PLACE_BY_POSTCODE[prefix]||((pc.match(/^([A-Z]{1,2}\\d[A-Z\\d]?)/)||[])[1]||'Your area')+' area';
  const hub=postcodeHub(pc);
  return {postcode:pc,headline:g?g[1]:place,
   connections:g?g[2]:(hub?'A useful local rail reference is '+hub+' station; local bus and walking links can complete the final leg.':'Use the main rail station serving '+place+' where available, then check local bus and walking links to the exact address.'),
   source:g?g[3]:'national',hub};
 };
 const sourceUrls={
   tfl:'https://tfl.gov.uk/plan-a-journey/',
   swr:'https://www.southwesternrailway.com/plan-my-journey',
   national:'https://www.nationalrail.co.uk/'
 };
 return {lookup,getDirection,describePostcode,sourceUrls};
})();