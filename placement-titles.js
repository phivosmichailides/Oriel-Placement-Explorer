'use strict';
/* Readable titles in every programme-card view. Exact source names remain
   available, and raw source data is never overwritten. */
(()=>{
 if(new URLSearchParams(location.search).get('atlasClassic')==='1')return;
 const getProgramme=id=>{
   try{if(typeof placements==='undefined'||!Array.isArray(placements))return null;return placements.find(p=>String(p.id)===String(id))||null}
   catch{return null}
 };
 const concise=(title,p)=>typeof window.AtlasPrototypeCleanTitle==='function'
   ?window.AtlasPrototypeCleanTitle(title,p):String(title||'').trim();
 const enhance=(card)=>{
   if(!card)return;
   const id=card.dataset?.id||card.querySelector('[data-open]')?.getAttribute('data-open');
   if(!id)return;
   const programme=getProgramme(id);
   if(!programme)return;
   const title=card.querySelector('.placementTop h3')||card.querySelector('h3');
   if(!title||title.dataset.paReadableTitle==='1')return;
   // Existing Explore cards have their own equivalent "Full name" button.
   if(title.querySelector('.atlasTitleConcise')){title.dataset.paReadableTitle='1';return;}
   const full=String(programme.title||programme.employer||title.textContent||'').trim();
   const display=concise(full,programme);
   title.dataset.paReadableTitle='1';
   if(!display||display===full)return;
   title.dataset.atlasFullTitle=full;
   title.title=full;title.replaceChildren();
   const short=document.createElement('span');short.className='atlasTitleConcise';short.textContent=display;
   const raw=document.createElement('span');raw.className='atlasTitleOriginal';raw.textContent=full;
   const toggle=document.createElement('button');toggle.type='button';toggle.className='atlasTitleExpand';
   toggle.textContent='Full name';toggle.setAttribute('aria-expanded','false');
   toggle.setAttribute('aria-label','Show original Oriel programme name');
   toggle.addEventListener('click',event=>{
     event.stopPropagation();event.preventDefault();
     const isOpen=title.classList.toggle('uxTitleExpanded');
     toggle.textContent=isOpen?'Less':'Full name';
     toggle.setAttribute('aria-expanded',String(isOpen));
   });
   title.append(short,raw,toggle);
 };
 const refresh=()=>{
   for(const selector of ['#results .placement','#shortlistList .placement','#mapSelection .placement','#reco .reco']){
     document.querySelectorAll(selector).forEach(enhance);
   }
 };
 for(const id of ['results','shortlistList','mapSelection','reco']){
   const host=document.getElementById(id);
   if(host)new MutationObserver(()=>requestAnimationFrame(refresh)).observe(host,{childList:true,subtree:false});
 }
 document.addEventListener('desk:dataset',refresh);
 document.addEventListener('desk:after-navigation',refresh);
 refresh();
})();
