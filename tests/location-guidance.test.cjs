'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('location-guides.js','utf8');
const makeGuide=({rail=[],tube=[]}={})=>{
 const window={ORIEL_RAIL_STATIONS:rail,ORIEL_TUBE_STATIONS:tube};
 vm.runInNewContext(source,{window,console});
 return window.OrielLocationGuide;
};

test('a non-London programme uses its nearby local railway station, not a London terminal',()=>{
 const guide=makeGuide({rail:[
  {name:'Nottingham',lat:52.9473,lng:-1.1464,crs:'NOT',country:'england'},
  {name:'Beeston',lat:52.9208,lng:-1.2072,crs:'BEE',country:'england'}
 ]});
 const result=guide.lookup({region:'East Midlands',area:'Nottingham',title:'Nottingham training programme',postcodes:['NG1 5FS']},
  [{pc:'NG1 5FS',lat:52.9538,lng:-1.1581}]);
 assert.equal(result.hub,'Nottingham');
 assert.match(result.connections,/Nottingham/);
 assert.doesNotMatch(result.connections,/London Victoria|London Waterloo|Transport corridor not verified/i);
 assert.equal(result.relative,null);
});

test('London locations prefer the nearby local Tube station instead of a distant London terminus',()=>{
 const guide=makeGuide({tube:[
  {name:"Earl's Court",lat:51.4913,lng:-0.1947,lines:'District · Piccadilly'},
  {name:'Victoria',lat:51.4965,lng:-0.1447,lines:'Victoria · District'}
 ]});
 const result=guide.lookup({region:'London',area:'West London',title:'Hospital site',postcodes:['SW10 9NH']},
  [{pc:'SW10 9NH',lat:51.4855,lng:-0.1812}]);
 assert.equal(result.hub,"Earl's Court");
 assert.match(result.connections,/Earl's Court/);
});

test('an un-geocoded programme still receives useful postcode-area guidance',()=>{
 const guide=makeGuide();
 const result=guide.lookup({region:'East Midlands',area:'',title:'Training programme',postcodes:['NG1 5FS']},[]);
 assert.equal(result.hub,'Nottingham');
 assert.match(result.headline,/Nottingham/);
 assert.match(result.connections,/Nottingham/);
 assert.doesNotMatch(result.connections,/not verified|unavailable/i);
});

test('an area-only Nottingham university programme gets local tram and bus context',()=>{
 const guide=makeGuide();
 const result=guide.lookup({region:'East Midlands',area:'Nottingham',title:'University of Nottingham programme',postcodes:[]},[]);
 assert.match(result.headline,/Nottingham/);
 assert.match(result.connections,/Nottingham railway station/);
 assert.match(result.connections,/tram and bus links/);
 assert.doesNotMatch(result.connections,/not verified|unavailable/i);
});

test('the public guidance no longer emits the old dead-end warnings',()=>{
 assert.doesNotMatch(source,/Transport corridor not verified for this postcode/);
 const workspace=fs.readFileSync('workspace-ux.js','utf8');
 assert.doesNotMatch(workspace,/Journey time unavailable/);
});
