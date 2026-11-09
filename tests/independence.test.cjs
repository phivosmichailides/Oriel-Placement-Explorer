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
  assert.match(html,/app\.js\?v=20261109header2/);
  assert.match(read('app.js'),/app-product\.js\?v=20261109header2/);
  assert.match(read('app.js'),/generic-public\.js\?v=20261108atlas3/);
  assert.match(read('app-product.js'),/app-base\.js\?v=20261109fix2/);
  assert.match(html,/rail-stations\.js\?v=20261109national1/);
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

test('primary navigation and footer management use separate, cache-versioned assets', () => {
  const html=read('index.html');
  const sw=read('sw.js');
  assert.match(html,/atlas-navigation\.css\?v=20261109nav2/);
  assert.match(html,/atlas-navigation\.js\?v=20261109nav2/);
  assert.match(sw,/atlas-navigation\.css\?v=20261109nav2/);
  assert.match(sw,/atlas-navigation\.js\?v=20261109nav2/);
  assert.match(read('atlas-navigation.js'),/header\.insertBefore\(nav,headerActions\)/);
  assert.match(read('atlas-navigation.js'),/root\.append\(utilities\)/);
});

test('theme-aware header and muted map remain purely visual changes', () => {
  const html=read('index.html'),nav=read('atlas-navigation.js');
  const theme=read('atlas-map-tones.css'),app=read('desk-enhancements.js');
  assert.match(html,/atlas-map-tones\.css\?v=20261109tone1/);
  assert.match(nav,/headerTools\.append\(headerActions\)/);
  assert.match(nav,/logo\.replaceChildren\(glyph\)/);
  assert.match(nav,/placeHistory\(\)/);
  assert.match(app,/desk:history-ready/);
  assert.match(theme,/streets-editorial-light/);
  assert.match(theme,/streets-editorial-dark/);
  assert.match(read('map-basemap.js'),/keepBuffer:mainMap\?6:3/);
});

test('Tinder Mode preloads real next card without blurred gradient', () => {
  const js=read('tinder-mode.js'),css=read('tinder-mode.css');
  const html=read('index.html'),sw=read('sw.js');
  assert.match(html,/tinder-mode\.js\?v=20261109stack1/);
  assert.match(html,/tinder-mode\.css\?v=20261109stack1/);
  assert.match(sw,/tinder-mode\.js\?v=20261109stack1/);
  assert.match(sw,/tinder-mode\.css\?v=20261109stack1/);
  assert.match(js,/const build=\(p,underlay=false\)/);
  assert.match(js,/cardSlot\.append\(below\)/);
  assert.match(js,/tdShowingNext/);
  assert.match(css,/\.tdNextCard/);
  assert.match(css,/tdSwipeCard\.tdLeaving\{opacity:1/);
});

test('Tinder Mode-only directional shines, instruction hints and decision drawers remain scoped', () => {
  const html=read('index.html'),sw=read('sw.js'),js=read('tinder-mode.js'),css=read('tinder-mode.css');
  assert.match(html,/tinder-mode\.js\?v=20261109react2/);
  assert.match(html,/tinder-mode\.css\?v=20261109react2/);
  assert.match(sw,/tinder-mode\.js\?v=20261109react2/);
  assert.match(sw,/tinder-mode\.css\?v=20261109react2/);
  assert.match(js,/const shine=\(status\)=>/);
  assert.match(js,/tdDirectionalParticles/);
  assert.match(js,/tdSwipeHints/);
  assert.match(js,/const savedLists=\(\)=>/);
  assert.match(js,/tdDecisionDrawer/);
  assert.match(js,/setMark\(p,\{status,priority:''\},false\)/);
  assert.match(css,/body\[data-atlas-view="tinderMode"\] #uxDrawerLauncher/);
  assert.match(css,/tdDragNo/);
  assert.match(css,/tdLeavingSuper/);
});
