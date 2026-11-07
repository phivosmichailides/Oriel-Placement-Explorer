'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const appSource=fs.readFileSync(path.join(root,'app-base.js'),'utf8');
const start=appSource.indexOf('function parseCSV(');
const end=appSource.indexOf('\nfunction normSetting(',start);
assert(start>=0&&end>start,'CSV parser must remain available in app-base.js');
const parseCSV=vm.runInNewContext(appSource.slice(start,end)+'\nparseCSV');
const comparable=csv=>JSON.parse(JSON.stringify(parseCSV(csv)));

test('parses commas, multiline descriptions, escaped quotes and a BOM',()=>{
  assert.deepEqual(comparable('\uFEFFEmployer Name,Programme Description\r\n"Example, Trust","First line\nSecond ""quoted"" line"\r\n'),[
    ['Employer Name','Programme Description'],
    ['Example, Trust','First line\nSecond "quoted" line']
  ]);
});
test('ignores empty rows but keeps meaningful blank cells',()=>{
  assert.deepEqual(comparable('\n,,\r\nA,B,C\n1,,3\n'),[['A','B','C'],['1','','3']]);
});
test('rejects truncated quoted fields instead of misreading programmes',()=>{
  assert.throws(()=>parseCSV('Employer,Description\nTrust,"unfinished'),/closing quote/);
});
test('owner-supplied Oriel export contains 4,064 unique programmes across 12 regions',()=>{
  const raw=Array.from({length:5},(_,i)=>fs.readFileSync(path.join(root,'data',`oriel-2026.part-${String(i+1).padStart(2,'0')}.txt`),'utf8')).join('');
  const [header,...rows]=parseCSV(raw);
  const byName=col=>header.indexOf(col);
  for(const name of ['Preference','Employer Name','Programme Title','Region','Current Assigned Rank','Tags']){
    assert.notEqual(byName(name),-1,`missing required column: ${name}`);
  }
  assert.equal(rows.length,4064);
  const ids=rows.map(row=>row[byName('Preference')]);
  assert.equal(new Set(ids).size,4064);
  assert.equal(new Set(rows.map(row=>row[byName('Region')])).size,12);
  assert(rows.every(row=>(row[byName('Current Assigned Rank')]||'0').trim()==='0'));
  assert(rows.every(row=>!String(row[byName('Tags')]||'').trim()));
});
