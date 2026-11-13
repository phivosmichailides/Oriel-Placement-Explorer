'use strict';
const test=require('node:test');
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','session-ui.js'),'utf8');
function extract(name){
  const start=source.indexOf(name);
  assert.ok(start>=0,`${name} missing`);
  const end=source.indexOf('\n',start);
  return source.slice(start,end);
}
function build(quickValue,savedQuick){
  const store={};
  if(savedQuick)store.s=JSON.stringify({version:1,filters:{quick:savedQuick}});
  const storage={get:(_s,k)=>store[k]??null};
  const factory=new Function('quick','storage','$','ids','S','SESSION',
    extract('const getQuickSet=')+'\n'+extract('const getSaved=')+'\n'+extract('function currentQuick(')+'\n'+extract('function currentFilters(')+'\nreturn currentFilters;');
  return factory(quickValue,storage,()=>null,['search'],null,'s');
}
test('currentFilters does not spread the #quick DOM element before app-base.js loads',()=>{
  const domElement={tagName:'DIV',id:'quick'};
  const currentFilters=build(domElement,['london','gp']);
  let result;
  assert.doesNotThrow(()=>{result=currentFilters()});
  assert.deepStrictEqual(result.quick,['london','gp']);
});
test('currentFilters falls back to an empty list without a saved snapshot',()=>{
  assert.deepStrictEqual(build({tagName:'DIV'},null)().quick,[]);
});
test('currentFilters uses the live quick Set once app-base.js has loaded',()=>{
  assert.deepStrictEqual(build(new Set(['pay']),['london'])().quick,['pay']);
});
