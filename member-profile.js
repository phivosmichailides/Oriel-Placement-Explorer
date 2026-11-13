'use strict';
/* Personal details are private; public handles are unique in the database. */
(()=>{
 const bridge=()=>window.PlacementAtlasAccount||{}, $=id=>document.getElementById(id);
 let details=null, loadedFor='', fetching=false, dialog=null, checkId=0, timer=0;
 const SCHOOLS=[
  ['Aston University','aston'],['Bangor University','bangor'],['University of Bath','bath'],
  ['University of Birmingham','birmingham'],['University of Bradford','bradford'],
  ['University of Brighton','brighton'],['Cardiff University','cardiff'],
  ['De Montfort University','dmu de montfort'],['University of East Anglia','uea east anglia'],
  ['University of Hertfordshire','herts'],['University of Huddersfield','huddersfield'],
  ['Keele University','keele'],["King's College London",'kcl kings'],
  ['Kingston University','kingston'],['University of Lancashire','uclan central lancashire'],
  ['University of Leicester','leicester'],['University of Lincoln','lincoln'],
  ['University of Liverpool','liverpool'],['Liverpool John Moores University','ljmu'],
  ['University of Manchester','manchester'],
  ['Medway School of Pharmacy (Universities of Greenwich and Kent)','greenwich kent medway'],
  ['Newcastle University','newcastle'],['University of Nottingham','nottingham'],
  ['University of Portsmouth','portsmouth'],["Queen's University Belfast",'qub queens'],
  ['University of Reading','reading'],['Robert Gordon University','rgu aberdeen'],
  ['University of Sheffield','sheffield'],['University of Strathclyde','strathclyde'],
  ['University of Suffolk','suffolk'],['University of Sunderland','sunderland'],
  ['Swansea University','swansea'],['Teesside University','teesside'],
  ['Ulster University','ulster'],['University College London','ucl school of pharmacy'],
  ['University of Wolverhampton','wolverhampton']
 ].sort((a,b)=>a[0].localeCompare(b[0],'en-GB'));
 const schoolMatch=(query,school)=>{
  const q=String(query||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
  return !q||[school[0],school[1]].some(value=>String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'').includes(q));
 };
 const acceptableOtherUniversity=value=>{
  const v=String(value||'').trim();
  return v.length>=3&&v.length<=120&&/^[\\p{L}\\p{M}\\p{N} .,&'’()\\-]+$/u.test(v)&&
    /[\\p{L}]{3,}/u.test(v)&&!/(https?:|www\\.|@|\\b(?:test|asdf|qwerty|fake|joke|poop|idiot|stupid|fuck|shit|bitch)\\b)/i.test(v)&&
    !/(.)\\1{5,}/iu.test(v);
 };
 const publicDetails=()=>details?{firstName:details.first_name,lastName:details.last_name,username:details.username}:null;
 window.PlacementAtlasMemberProfile={current:publicDetails,open:()=>show()};
 function notify(){
   document.dispatchEvent(new CustomEvent('placement:member-profile',{detail:publicDetails()}));
   if($('paMemberEdit'))$('paMemberEdit').hidden=!bridge().getUser?.();
 }
 function addEdit(){
   const row=document.querySelector('#outcome .paProfileActions');
   if(!row||$('paMemberEdit'))return;
   const b=document.createElement('button');b.id='paMemberEdit';b.type='button';b.className='btn';b.textContent='Edit details';
   b.addEventListener('click',()=>show());row.append(b);b.hidden=!bridge().getUser?.();
 }
 async function refresh(){
   addEdit();
   const user=bridge().getUser?.(),client=bridge().getClient?.();
   if(!user||!client){details=null;loadedFor='';dialog?.remove();dialog=null;notify();return}
   if(fetching||loadedFor===user.id)return;
   fetching=true;
   try{
     const [p,h]=await Promise.all([
       client.from('atlas_member_profiles').select('first_name,last_name,birth_date,university,study_year').eq('user_id',user.id).maybeSingle(),
       client.from('atlas_member_handles').select('username').eq('user_id',user.id).maybeSingle()
     ]);
     if(p.error||h.error)throw(p.error||h.error);
     if(bridge().getUser?.()?.id!==user.id)return;
     details=p.data&&h.data?{...p.data,...h.data}:null;
     loadedFor=user.id;notify();
     // A new account should not be interrupted by mandatory profile completion.
     // The form is available from Profile, or after an intentional quiz.
   }catch(e){console.warn('Member profile unavailable:',e.message||e)}
   finally{fetching=false;setTimeout(prompt,250)}
 }
 function prompt(){
   if(dialog||details||!bridge().getUser?.())return;
   let interested=false;
   try{interested=sessionStorage.getItem('atlas-quiz-profile-intent')==='1'}catch{}
   if(!interested)return;
   if(document.querySelector('.cloudOverlay,.onboardSyncOverlay,.onboardOverlay')){timer=setTimeout(prompt,850);return}
   try{sessionStorage.removeItem('atlas-quiz-profile-intent')}catch{}
   show();
 }
 function tip(title,text){return '<details class="atlasMemberTip"><summary aria-label="'+title+' information">?</summary><span>'+text+'</span></details>'}
 function show(){
   if(!bridge().getUser?.()){bridge().openSignIn?.();return}
   if(dialog){dialog.querySelector('input')?.focus();return}
   dialog=document.createElement('div');dialog.className='atlasMemberOverlay';
   dialog.innerHTML='<section class="atlasMemberDialog" role="dialog" aria-modal="true" aria-labelledby="atlasMemberTitle">'+
    '<button class="atlasMemberClose" type="button" aria-label="Close">×</button><span class="eyebrow">YOUR PLACEMENT ATLAS PROFILE</span>'+
    '<h2 id="atlasMemberTitle">Let’s get to know you.</h2><p>Set up your personal workspace. Only your username will be visible to other members.</p>'+
    '<form id="atlasMemberForm" novalidate><div class="atlasMemberFields">'+
    '<div class="atlasMemberField"><label>First name '+tip('First name','Your chosen first name. Any language is welcome.')+'</label><input name="first" autocomplete="given-name" placeholder="First name" maxlength="80" required></div>'+
    '<div class="atlasMemberField"><label>Last name '+tip('Last name','Your surname, in any language.')+'</label><input name="last" autocomplete="family-name" placeholder="Last name" maxlength="80" required></div>'+
    '<div class="atlasMemberField wide"><label>Unique username '+tip('Username','Your unique public @handle. Use 5–15 English lowercase letters, numbers or underscores, starting with a letter.')+'</label><input name="username" autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="e.g. pharmacyexplorer" minlength="5" maxlength="15" required><small id="atlasHandleStatus" aria-live="polite">5–15 lowercase letters, numbers or underscores</small><div id="atlasHandleSuggestions" class="atlasHandleSuggestions"></div></div>'+
    '<div class="atlasMemberField"><label for="atlasBirthDay">Date of birth '+tip('Date of birth','Private account information; not displayed publicly.')+'</label><div class="atlasBirthParts" role="group" aria-label="Date of birth"><select name="birth_day" id="atlasBirthDay" aria-label="Day" required><option value="">Day</option></select><select name="birth_month" aria-label="Month" required><option value="">Month</option></select><select name="birth_year" aria-label="Year" required><option value="">Year</option></select></div></div>'+ 
    '<div class="atlasMemberField atlasUniField"><label for="atlasUniversityInput">University '+tip('University','Choose a university offering an MPharm, or use Other for a different provider or overseas qualification.')+'</label><div class="atlasUniControl"><input name="university" id="atlasUniversityInput" type="text" placeholder="Search universities" maxlength="120" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="atlasUniversityList" autocomplete="off" required><button type="button" id="atlasUniversityExpand" aria-label="Show all universities" aria-controls="atlasUniversityList">⌄</button></div><div class="atlasUniOptions" id="atlasUniversityList" role="listbox" hidden></div><div id="atlasUniversityOther" class="atlasUniOther" hidden><label for="atlasOtherUniversity">University or training provider</label><input id="atlasOtherUniversity" name="university_other" type="text" maxlength="120" placeholder="Enter the institution name" autocomplete="organization"><small>Please use the institution’s proper name.</small></div></div>'+ 
    '<div class="atlasMemberField wide"><label>Current stage</label><div class="atlasMemberYears">'+
      [['year1','Year 1'],['year2','Year 2'],['year3','Year 3'],['year4','Year 4'],['pre_reg','Foundation training year']].map(x=>'<label><input name="study_year" type="radio" value="'+x[0]+'">'+x[1]+'</label>').join('')+
    '</div><details class="atlasAlternatePath"><summary>Studying through another route?</summary><p>Overseas-qualified pharmacists may follow a GPhC-approved route such as OSPAP. A pharmacology degree alone does not qualify someone for pharmacist foundation training. Choose Other university above if your institution is not listed, and select your current stage only if it applies.</p><a href="https://www.pharmacyregulation.org/registration/registering-pharmacist" target="_blank" rel="noopener noreferrer">See official qualification routes</a></details></div></div><div class="atlasMemberFooter"><span>A profile picture is optional. Add one later from your profile.</span><button type="submit" id="atlasMemberSave">Save my profile</button></div><p id="atlasMemberError" role="status" aria-live="polite"></p></form></section>';
   document.body.append(dialog);
   const form=$('atlasMemberForm'),field=n=>form.elements.namedItem(n);
   const events=new AbortController();
   const close=()=>{events.abort();dialog?.remove();dialog=null;clearTimeout(timer)};
   dialog.querySelector('.atlasMemberClose').addEventListener('click',close);
   dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
   dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
   // A segmented birthday selector is quicker and more accessible than a native
   // date calendar for birth dates several decades in the past.
   const daySelect=field('birth_day'),monthSelect=field('birth_month'),yearSelect=field('birth_year');
   for(let m=1;m<=12;m++)monthSelect.add(new Option(new Intl.DateTimeFormat('en-GB',{month:'short'}).format(new Date(2020,m-1,1)),String(m).padStart(2,'0')));
   for(let y=new Date().getFullYear();y>=1900;y--)yearSelect.add(new Option(String(y),String(y)));
   const refreshDays=()=>{
     const selected=daySelect.value,m=Number(monthSelect.value),y=Number(yearSelect.value);
     const numberOfDays=m&&y?new Date(y,m,0).getDate():31;
     daySelect.replaceChildren(new Option('Day',''));
     for(let d=1;d<=numberOfDays;d++)daySelect.add(new Option(String(d),String(d).padStart(2,'0')));
     if([...daySelect.options].some(o=>o.value===selected))daySelect.value=selected;
   };
   monthSelect.addEventListener('change',refreshDays);
   yearSelect.addEventListener('change',refreshDays);
   refreshDays();

   const universityInput=field('university'),otherInput=field('university_other');
   const otherGroup=$('atlasUniversityOther'),universityList=$('atlasUniversityList'),expand=$('atlasUniversityExpand');
   let selectedSchool='',otherSelected=false,allSchools=false;
   const hideSchools=()=>{universityList.hidden=true;universityInput.setAttribute('aria-expanded','false')};
   const chooseSchool=name=>{
     selectedSchool=name;otherSelected=false;universityInput.value=name;otherGroup.hidden=true;
     hideSchools();
   };
   const chooseOther=(initial='')=>{
     selectedSchool='';otherSelected=true;universityInput.value='Other university';
     otherGroup.hidden=false;otherInput.value=initial;hideSchools();otherInput.focus();
   };
   const showSchools=(full=false)=>{
     allSchools=full;
     const q=full?'':universityInput.value.trim();
     const found=SCHOOLS.filter(school=>schoolMatch(q,school)).slice(0,full?SCHOOLS.length:10);
     universityList.replaceChildren();
     for(const [name] of found){
       const option=document.createElement('button');option.type='button';option.setAttribute('role','option');
       option.textContent=name;option.addEventListener('click',()=>chooseSchool(name));universityList.append(option);
     }
     const other=document.createElement('button');other.type='button';other.className='atlasUniOtherOption';
     other.setAttribute('role','option');other.textContent='Other university / international qualification';
     other.addEventListener('click',()=>chooseOther(found.length? '':q));
     universityList.append(other);universityList.hidden=false;universityInput.setAttribute('aria-expanded','true');
   };
   universityInput.addEventListener('focus',()=>showSchools(false));
   universityInput.addEventListener('input',()=>{selectedSchool='';otherSelected=false;otherGroup.hidden=true;showSchools(false)});
   universityInput.addEventListener('keydown',e=>{
     if(e.key==='Escape')hideSchools();
     if(e.key==='ArrowDown'&&universityList.hidden){e.preventDefault();showSchools(true)}
     if(e.key==='Enter'&&!universityList.hidden){e.preventDefault();universityList.querySelector('button')?.click()}
   });
   expand.addEventListener('click',()=>universityList.hidden?showSchools(true):hideSchools());
   document.addEventListener('pointerdown',e=>{if(!e.target.closest('.atlasUniField'))hideSchools()},{signal:events.signal});
   if(details){
     field('first').value=details.first_name;field('last').value=details.last_name;
     field('username').value=details.username;
     const parts=String(details.birth_date||'').split('-');
     if(parts.length===3){yearSelect.value=parts[0];monthSelect.value=parts[1];refreshDays();daySelect.value=parts[2];}
     if(SCHOOLS.some(([name])=>name===details.university))chooseSchool(details.university);
     else chooseOther(details.university||'');
     const radio=form.querySelector('[name="study_year"][value="'+details.study_year+'"]');
     if(radio)radio.checked=true;
   }
   const input=field('username'),status=$('atlasHandleStatus'),suggestions=$('atlasHandleSuggestions');
   let debounce;
   const set=(msg,tone='')=>{status.textContent=msg;status.dataset.tone=tone};
   const alternatives=value=>{
     suggestions.replaceChildren();
     const choices=[value.slice(0,14)+'1',value.slice(0,12)+'_uk',value.slice(0,11)+'2026'];
     choices.filter((x,i)=>choices.indexOf(x)===i&&/^[a-z][a-z0-9_]{4,14}$/.test(x)).forEach(v=>{
       const btn=document.createElement('button');btn.type='button';btn.textContent='@'+v;
       btn.addEventListener('click',()=>{input.value=v;input.dispatchEvent(new Event('input'))});suggestions.append(btn);
     });
   };
   async function check(){
     const username=input.value.trim().toLowerCase(),id=++checkId;
     input.value=username;suggestions.replaceChildren();
     if(!/^[a-z][a-z0-9_]{4,14}$/.test(username)){set('× Start with a letter; use 5–15 lowercase letters, numbers or underscores.','error');return}
     if(username===details?.username){set('✓ This username belongs to you.','success');return}
     set('Checking availability…');
     const client=bridge().getClient?.();if(!client)return;
     const result=await client.from('atlas_member_handles').select('username').eq('username',username).maybeSingle();
     if(id!==checkId||!dialog?.isConnected)return;
     if(result.error){set('Availability unavailable; we’ll check on save.','error');return}
     if(result.data){set('× Username taken. Try one of these:','error');alternatives(username)}
     else set('✓ Available right now.','success');
   }
   input.addEventListener('input',()=>{clearTimeout(debounce);set('Checking…');debounce=setTimeout(check,330)});
   if(details)check();
   form.addEventListener('submit',async e=>{
     e.preventDefault();
     const error=$('atlasMemberError'),button=$('atlasMemberSave');
     const first=String(field('first').value||'').trim(),last=String(field('last').value||'').trim();
     const username=String(input.value||'').trim().toLowerCase();
     const birth=yearSelect.value&&monthSelect.value&&daySelect.value?[yearSelect.value,monthSelect.value,daySelect.value].join('-'):'';
     const university=otherSelected?otherInput.value.trim():selectedSchool;
     const year=form.querySelector('[name="study_year"]:checked')?.value||'';
     error.textContent='';
     if(Array.from(first).length<2||Array.from(last).length<2){error.textContent='First and last names must have at least two characters.';return}
     if(!/^[a-z][a-z0-9_]{4,14}$/.test(username)){error.textContent='Choose a valid username.';input.focus();return}
     const date=birth?new Date(birth+'T12:00:00Z'):null;
     if(!birth||!date||isNaN(date.getTime())||date.toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10)){
       error.textContent='Choose a valid date of birth.';return;
     }
     if(!university||(otherSelected&&!acceptableOtherUniversity(university))){
       error.textContent=otherSelected?'Enter a genuine university or training provider name.':'Choose a university from the suggestions, or select Other.';return;
     }
     if(!year){error.textContent='Select your current training stage.';return}
     const client=bridge().getClient?.(),user=bridge().getUser?.();if(!client||!user){error.textContent='Sign in again and retry.';return}
     button.disabled=true;button.textContent='Saving…';
     const result=await client.rpc('atlas_save_member_profile',{
       p_first_name:first,p_last_name:last,p_username:username,p_birth_date:birth,
       p_university:university,p_study_year:year
     });
     button.disabled=false;button.textContent='Save my profile';
     if(result.error){
       if(result.error.code==='23505'){set('× Username just taken. Please choose another.','error');alternatives(username);input.focus()}
       else error.textContent='Could not save: '+(result.error.message||'Try again.');
       return;
     }
     details={first_name:first,last_name:last,username,birth_date:birth,university,study_year:year};
     loadedFor=user.id;notify();close();
   });
   field('first').focus();
 }
 addEdit();
 document.addEventListener('placement:auth-changed',()=>{loadedFor='';refresh();setTimeout(prompt,1200)});
 document.addEventListener('placement:quiz-finished',()=>{
   try{sessionStorage.setItem('atlas-quiz-profile-intent','1')}catch{}
   clearTimeout(timer);timer=setTimeout(prompt,850);
 });
 document.addEventListener('desk:after-navigation',addEdit);
 window.OrielCloudReady?.then(refresh);
 setTimeout(refresh,800);
})();