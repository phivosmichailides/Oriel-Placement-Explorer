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
  assert.doesNotMatch(html, /legacy\.html|acid555\/oriel-placement-explorer/i);
  assert.doesNotMatch(app, /legacy\.html|acid555\/oriel-placement-explorer/i);
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
  assert.match(basemap, /tiles\.openfreemap\.org\/styles\//);
  assert.match(basemap, /OpenStreetMap contributors/);
  assert.match(basemap, /oriel-basemap-style-v1/);
});

test('public files document historical provenance, not a fictional authorship claim', () => {
  const notice=read('THIRD_PARTY_NOTICES.md');
  assert.match(notice, /originally started from a GitHub fork/);
  assert.match(notice, /copyright rights/);
});
