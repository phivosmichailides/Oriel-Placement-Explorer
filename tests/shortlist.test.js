const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app-base.js','utf8');
function setup(){
 const c={placements:[{id:'a',score:50},{id:'b',score:90},{id:'c',score:90},{id:'d',score:10},{id:'e',score:100}],state:{marks:{a:{status:'yes',rating:5},b:{status:'yes',rating:1},c:{status:'maybe',rating:5},d:{status:'love',priority:1,rating:0},e:{status:'no',rating:5}},compare:[],prefs:{}},SHORT:new Set(['love','yes','maybe','backup']),STATUSES:[['','Unmarked'],['love','Love'],['yes','Strong yes'],['maybe','Maybe'],['backup','Only if needed'],['no','No'],['never','Absolutely not']],DEFAULT:{weights:{},likes:'',avoids:''},clone:x=>JSON.parse(JSON.stringify(x)),analyse:p=>({score:p.score}),save(){},shortlist(){},download(name,data){c.downloaded={name,data}},localStorage:{getItem:()=>null},DATAKEY:'dataset'};
 c.mark=p=>c.state.marks[p.id]||{};vm.createContext(c);
 for(const name of ['ranked','moveRank','validBackup','backup','exportDecisions'])vm.runInContext(source.split('\n').find(l=>l.startsWith('function '+name+'(')),c);
 return c;
}
test('manual priority first, then fit score and stable ID, ignoring old ratings',()=>{
 const c=setup();assert.equal(c.ranked().map(p=>p.id).join(','),'d,b,c,a');
 c.state.marks.b.rating=5;c.state.marks.c.rating=0;c.state.marks.a.rating=0;
 assert.equal(c.ranked().map(p=>p.id).join(','),'d,b,c,a');
 c.moveRank('a','up');assert.equal(c.ranked().map(p=>p.id).join(','),'d,b,a,c');
});
test('old ratings survive validation and a backup round trip',()=>{
 const c=setup();const original=JSON.stringify(c.state.marks);
 c.state=c.validBackup({v:2,state:c.state});c.backup();
 assert.equal(JSON.stringify(JSON.parse(c.downloaded.data).state.marks),original);
 assert.equal(c.ranked().map(p=>p.id).join(','),'d,b,c,a');
});
test('CSV removes the rating column and does not export rating-only records',()=>{
 const c=setup();c.placements.forEach(p=>Object.assign(p,{postcodes:[],employer:'Employer',title:'Programme',region:'London'}));
 c.state.marks.e={rating:5};c.exportDecisions();const rows=c.downloaded.data.split('\n');
 assert(!rows[0].includes('Rating'));assert.equal(rows.length,5);
 assert(rows.every(r=>r.split(',').length===11));
});
