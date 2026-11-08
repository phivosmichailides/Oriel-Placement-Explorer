'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('live project does not ship a copy of the earlier explorer', () => {
  assert.equal(fs.existsSync(path.join(root, 'legacy.html')), false);
  const html = read('index.html');
  const app = read('app-base.js');
  assert.doesNotMatch(html, /legacy\.html|original explorer|forked from|github\.com\/(?!phivosmichailides\/)[^\s"'<>]+\/oriel-placement-explorer/i);
  assert.doesNotMatch(app, /legacy\.html|original explorer|forked from|github\.com\/(?!phivosmichailides\/)[^\s"'<>]+\/oriel-placement-explorer/i);
});

test('current deployable assets contain no obsolete explorer branding or data loader', () => {
  for (const oldFile of ['core.js','ui.js','styles.css','legacy.html']) {
    assert.equal(fs.existsSync(path.join(root,oldFile)),false,`obsolete file remains: ${oldFile}`);
  }
  const html=read('index.html');
  const paths=new Set(['index.html','app.js','app-base.js','app-product.js',
    ...Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g),m=>m[1].split('?')[0])
      .filter(name=>!/^https?:\/\//.test(name))]);
  for (const filename of paths) {
    const content=read(filename);
    assert.doesNotMatch(content,/legacy\.html|original explorer|forked from|github\.com\/(?!phivosmichailides\/)[^\s"'<>]+\/oriel-placement-explorer/i,
      `Obsolete source attribution in ${filename}`);
  }
  assert.match(html,/app\.js\?v=20261108atlas3/);
  assert.match(read('app.js'),/app-product\.js\?v=20261108atlas2/);
  assert.match(read('app.js'),/generic-public\.js\?v=20261108atlas3/);
  assert.match(read('generic-public.js'),/document\.title='Placement Atlas'/);
  assert.doesNotMatch(read('generic-public.js'),/Oriel Placement Desk/);
});

test('site uses maintainer-supplied catalogue without rewriting stable saved IDs', () => {
  const app = read('app-base.js');
  assert.match(app, /const KEY='phivos-desk-v2'/);
  assert.match(app, /const CATALOGUE_PARTS=Object\.freeze/);
  assert.match(app, /id:String\(o\['Programme Number'\]\|\|o\.Preference/);
  assert.match(app, /existingIds\.some\(id=>ids\.has\(id\)\)/);
  assert.match(app, /throw Error\('The public Oriel catalogue is unavailable/);
});

test('maps use independent third-party map libraries and retain data credits', () => {
  const html = read('index.html');
  const basemap = read('map-basemap.js');
  assert.match(html, /id="mapStyle"/);
  assert.match(html, /src="map-basemap\.js/);
  assert.match(basemap, /api\.maptiler\.com\/maps\//);
  assert.match(basemap, /streets-v4-dark/);
  assert.match(basemap, /OpenStreetMap contributors/);
  assert.doesNotMatch(basemap, /openfreemap\.org\/styles/);
  assert.match(basemap, /oriel-basemap-style-v3/);
});

test('public files document historical provenance, not a fictional authorship claim', () => {
  const notice=read('THIRD_PARTY_NOTICES.md');
  assert.match(notice, /originally started from a GitHub fork/);
  assert.match(notice, /copyright rights/);
});

test('Placement Atlas branding and install assets are complete', () => {
  const html=read('index.html');
  assert.match(html,/<title>Placement Atlas<\/title>/);
  assert.match(html,/rel="icon"[^>]+favicon\.svg/);
  assert.match(html,/rel="manifest"[^>]+manifest\.webmanifest/);
  assert.match(html,/id="installAppBtn"/);
  assert.match(html,/pwa\.js\?v=/);
  const manifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name,'Placement Atlas');
  assert.equal(manifest.short_name,'Placement Atlas');
  assert.equal(manifest.display,'standalone');
  assert(manifest.icons.some(icon=>icon.sizes==='192x192'));
  assert(manifest.icons.some(icon=>icon.sizes==='512x512'));
  assert.match(read('favicon.svg'),/M22\.4 4\.8/,'The browser icon should use the same pharmacy cross as the site logo');
  for(const file of ['icons/placement-atlas-192.png','icons/placement-atlas-512.png']){
    const bytes=fs.readFileSync(path.join(root,file));
    assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],file+' is not a valid PNG');
  }
});
