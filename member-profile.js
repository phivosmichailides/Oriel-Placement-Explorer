'use strict';
/* Personal details are private; public handles are unique in the database. */
(()=>{
 const bridge=()=>window.PlacementAtlasAccount||{}, $=id=>document.getElementById(id);
 let details=null, loadedFor='', fetching=false, dialog=null, checkId=0, timer=0;
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
     if(!details){clearTimeout(timer);timer=setTimeout(prompt,800)}
   }catch(e){console.warn('Member profile unavailable:',e.message||e)}
   finally{fetching=false}
 }
 function prompt(){
   if(dialog||details||!bridge().getUser?.())return;
   if(document.querySelector('.cloudOverlay')){timer=setTimeout(prompt,850);return}
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
    '<div class="atlasMemberField"><label>Date of birth '+tip('Date of birth','Private account information, not part of your public profile.')+'</label><input name="birth" type="date" max="'+new Date().toISOString().slice(0,10)+'" required></div>'+
    '<div class="atlasMemberField"><label>University '+tip('University','Your current university or training provider; editable later.')+'</label><input name="university" placeholder="University name" maxlength="120" required></div>'+
    '<div class="atlasMemberField wide"><label>Current stage</label><div class="atlasMemberYears">'+
      [['year1','Year 1'],['year2','Year 2'],['year3','Year 3'],['year4','Year 4'],['pre_reg','Pre-Reg!']].map(x=>'<label><input name="study_year" type="radio" value="'+x[0]+'">'+x[1]+'</label>').join('')+
    '</div></div></div><div class="atlasMemberFooter"><span>A profile picture is optional. Add one later from your profile.</span><button type="submit" id="atlasMemberSave">Save my profile</button></div><p id="atlasMemberError" role="status" aria-live="polite"></p></form></section>';
   document.body.append(dialog);
   const form=$('atlasMemberForm'),field=n=>form.elements.namedItem(n);
   const close=()=>{dialog?.remove();dialog=null;clearTimeout(timer)};
   dialog.querySelector('.atlasMemberClose').addEventListener('click',close);
   dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
   dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
   if(details){
     field('first').value=details.first_name;field('last').value=details.last_name;
     field('username').value=details.username;field('birth').value=details.birth_date;
     field('university').value=details.university;
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
     const birth=String(field('birth').value||''),university=String(field('university').value||'').trim();
     const year=form.querySelector('[name="study_year"]:checked')?.value||'';
     error.textContent='';
     if(Array.from(first).length<2||Array.from(last).length<2){error.textContent='First and last names must have at least two characters.';return}
     if(!/^[a-z][a-z0-9_]{4,14}$/.test(username)){error.textContent='Choose a valid username.';input.focus();return}
     if(!birth||birth>new Date().toISOString().slice(0,10)||university.length<2||!year){error.textContent='Complete your date of birth, university and current stage.';return}
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
 document.addEventListener('placement:auth-changed',()=>{loadedFor='';refresh()});
 document.addEventListener('desk:after-navigation',addEdit);
 window.OrielCloudReady?.then(refresh);
 setTimeout(refresh,800);
})();