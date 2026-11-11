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
  assert.match(html,/app\.js\?v=20261110footer1/);
  assert.match(read('app.js'),/app-product\.js\?v=20261110fitinsights1/);
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
  assert.match(html,/<title>Placement Atlas - Independent Oriel Placement Desk<\/title>/);
  assert.ok(html.includes('name="description" content="Placement Atlas is an independent Oriel placement desk for UK MPharm students.'));
  assert.ok(html.includes('<link rel="icon" type="image/png" sizes="192x192" href="/icons/placement-atlas-192.png">'));
  assert.equal(html.includes('rel="icon" type="image/svg+xml" href="/favicon.svg"'),false);
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
  assert.match(html,/atlas-navigation\.css\?v=20261109mobile5/);
  assert.match(html,/atlas-navigation\.js\?v=20261110footer1/);
  assert.match(sw,/atlas-navigation\.css\?v=20261109mobile5/);
  assert.match(sw,/atlas-navigation\.js\?v=20261110footer1/);
  assert.match(read('atlas-navigation.js'),/header\.insertBefore\(nav,headerActions\)/);
  assert.match(read('atlas-navigation.js'),/footer\.insertAdjacentElement\('beforebegin',utilities\)/);
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

test('Tinder Mode preloads the next card but conceals it until promotion', () => {
  const js=read('tinder-mode.js'),css=read('tinder-mode.css');
  const html=read('index.html'),sw=read('sw.js');
  assert.match(html,/tinder-mode\.js\?v=20261110deckfix1/);
  assert.match(html,/tinder-mode\.css\?v=20261110deckfix1/);
  assert.match(sw,/tinder-mode\.js\?v=20261110deckfix1/);
  assert.match(sw,/tinder-mode\.css\?v=20261110deckfix1/);
  assert.match(js,/const build=\(p,underlay=false\)/);
  assert.match(js,/cardSlot\.append\(below\)/);
  assert.doesNotMatch(js,/tdShowingNext/);
  assert.match(css,/#tinderMode \.tdCardSlot > \.tdNextCard,[\s\S]*?#tinderMode \.tdCardSlot > \.tdNextFinished\{\s*display:none!important/);
  assert.match(css,/\.tdCardDeck\{position:relative;z-index:0/);
  assert.match(css,/\.tdActions\{position:relative;z-index:1/);
  assert.match(css,/\.tdActionLegend\{position:relative;z-index:1/);
  assert.match(css,/tdSwipeCard\.tdLeaving\{opacity:1/);
});

test('Tinder Mode-only directional shines, instruction hints and decision drawers remain scoped', () => {
  const html=read('index.html'),sw=read('sw.js'),js=read('tinder-mode.js'),css=read('tinder-mode.css');
  assert.match(html,/tinder-mode\.js\?v=20261110deckfix1/);
  assert.match(html,/tinder-mode\.css\?v=20261110deckfix1/);
  assert.match(sw,/tinder-mode\.js\?v=20261110deckfix1/);
  assert.match(sw,/tinder-mode\.css\?v=20261110deckfix1/);
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

test('Tinder refines its own programme pool and keeps outgoing stars independent of map',()=>{
  const game=read('tinder-mode.js'),mobile=read('session-ui.js');
  assert.match(game,/const defaultFilters=\(\)=>/);
  assert.match(game,/const exitTwinkles=\(card,status\)=>/);
  assert.match(game,/tdExitTwinkles-/);
  assert.match(game,/id="tinderFilterToggle"/);
  assert.match(game,/id="tinderFilterPanel"/);
  assert.match(game,/ff\.hideDecided/);
  assert.match(mobile,/mobileFirst\?true:/);
  assert.match(read('atlas-navigation.css'),/max-width:720px/);
  assert.match(read('tinder-mode.css'),/tdExitStar/);
});

test('personal fit requires onboarding and quiz can set appearance without changing map sources', () => {
  const app=read('app-product.js'),quiz=read('onboarding.js'),tinder=read('tinder-mode.js');
  const nav=read('atlas-navigation.css'),html=read('index.html'),sw=read('sw.js');
  assert.match(app,/data-atlas-start-quiz/);
  assert.match(app,/unpersonalised/);
  assert.match(app,/state\.prefs\.onboarding/);
  assert.match(quiz,/data-ob-palette/);
  assert.match(quiz,/data-ob-mode/);
  assert.match(quiz,/window\.OrielCloud\?\.signIn/);
  assert.match(quiz,/Maybe later/);
  assert.match(tinder,/FIT · TAKE QUIZ/);
  assert.match(nav,/atlasSubnavChoices/);
  assert.match(html,/simulator-refinement\.css\?v=20261109fit1/);
  assert.match(sw,/onboarding\.js\?v=20261110ux1/);
});

test('Copper Sulfate quiz swatch matches blue Appearance palette in light and dark', () => {
  const quiz=read('onboarding.js'),html=read('index.html'),app=read('app.js');
  assert.match(quiz,/\['copper','Copper','#3f6589'\]/);
  assert.doesNotMatch(quiz,/\['copper','Copper','#b26d55'\]/);
  assert.match(html,/data-ux-palette="copper"[\s\S]*?--swatch:#3f6589/);
  assert.match(app,/onboarding\.js\?v=20261110ux1/);
});


test('contextual dashboard actions and compact filters are wired to the live app',()=>{
  const html=read('index.html'),ui=read('atlas-interactions.js'),css=read('atlas-interactions.css');
  const session=read('session-ui.js'),app=read('app.js'),sw=read('sw.js');
  assert.match(html,/atlas-interactions\.js\?v=20261110reset1/);
  assert.match(html,/atlas-interactions\.css\?v=20261110ux1/);
  assert.match(sw,/atlas-interactions\.js\?v=20261110reset1/);
  assert.match(sw,/atlas-interactions\.css\?v=20261110ux1/);
  assert.match(app,/sector-map\.js\?v=20261110popup1/);
  for(const action of ['shortlist','catalogue','places','hospital','gp','matches'])
    assert(ui.includes("'"+action+"'"),'Missing dashboard action '+action);
  assert.match(ui,/window\.OrielEnhanceProgrammeCards/);
  assert.match(ui,/window\.OrielReleaseProgrammeCards/);
  assert.match(ui,/Remove preferences/);
  assert.match(ui,/state\.prefs=.*DEFAULT/);
  assert.match(ui,/brand\.addEventListener\('click',goHome\)/);
  assert.match(session,/max-width: 1180px/);
  assert.match(css,/#atlasRefinePill/);
  assert.match(css,/#explore\.uxFiltersCollapsed #uxFilterSidebar/);
});

test('map legend reflects rendered markers and does not duplicate old status dots',()=>{
  const html=read('index.html'),map=read('sector-map.js');
  assert.doesNotMatch(html,/<i class="dot green"><\/i> Shortlisted/);
  assert.doesNotMatch(map,/Muted burgundy ring = shortlisted/);
  assert.match(map,/renderLegend\(displayGroups\)/);
  assert.match(map,/palette\[key\]/);
  assert.match(map,/hasExcluded=groups\.some/);
});


test('preference removal refreshes safely and keeps the shortlist',()=>{
  const js=read('atlas-interactions.js');
  const cloud=read('supabase-cloud.js');
  assert.match(js,/const clearPersonalisation=async\(\)=>/);
  assert.match(js,/state\.prefs=.*DEFAULT/);
  assert.match(js,/state\.filters=.*FILTER_DEFAULTS/);
  assert.match(js,/window\.OrielCommuteProfile\?\.save\?\.\('',\{silent:true\}\)/);
  assert.match(js,/window\.OrielCloud\.saveNow\(\)/);
  assert.match(js,/sessionStorage\.removeItem\('oriel-desk-last-view-v1'\)/);
  assert.match(js,/window\.location\.reload\(\)/);
  assert.match(cloud,/const saveNow=async\(\)=>/);
  assert.match(cloud,/return await flush\(\)/);
  assert.match(cloud,/saveNow\};/);
  assert.doesNotMatch(js,/state\.marks\s*=\s*\{\}/);
});

test('map popup titles open the exact programme without removing Open actions',()=>{
  const map=read('sector-map.js');
  const app=read('app-base.js');
  const css=read('atlas-footer.css');
  assert.match(map,/class="atlasPopupTitle" data-open/);
  assert.match(map,/class="atlasPopupOpen" data-open/);
  assert.match(app,/closest\('\[data-open\]'\)/);
  assert.match(css,/atlasPopupProgramme \.atlasPopupTitle/);
});

test('professional footer stays navigation-friendly and keeps existing data tools',()=>{
  const html=read('index.html'),nav=read('atlas-navigation.js');
  const css=read('atlas-footer.css'),sw=read('sw.js');
  assert.match(html,/class="app-footer atlasFooter"/);
  assert.match(html,/atlasFooterGrid/);
  for(const tab of ['explore','foryou','shortlist','compare','simulator','outcome','prefs'])
    assert(html.includes('data-atlas-footer-tab="'+tab+'"'));
  assert.match(html,/guide\.html/);
  assert.match(html,/Feedback &amp; ideas/);
  assert.match(html,/2026 Oriel CSV snapshot/);
  assert.match(nav,/footer\.insertAdjacentElement\('beforebegin',utilities\)/);
  assert.match(nav,/footer\.querySelectorAll\('\[data-atlas-footer-tab\]'\)/);
  assert.match(nav,/atlasSaveHelp/);
  assert.match(css,/atlasFooterBottom/);
  assert.match(sw,/atlas-footer\.css\?v=20261110footer1/);
});


test('premium discovery prototype is reversible and keeps the original programme logic',()=>{
  const html=read('index.html');
  const css=read('premium-discovery-preview.css');
  const js=read('premium-discovery-preview.js');
  const sw=read('sw.js');
  const app=read('app-base.js');
  const product=read('app-product.js');
  assert.match(html,/premium-discovery-preview\.js\?v=20261111makeover3/);
  assert.match(html,/premium-discovery-preview\.css\?v=20261111makeover3/);
  assert.match(sw,/premium-discovery-preview\.js\?v=20261111makeover3/);
  assert.match(sw,/premium-discovery-preview\.css\?v=20261111makeover3/);
  assert.match(js,/atlasClassic/,'Prototype has a simple off switch');
  assert.match(js,/atlasPremiumPreview/,'Prototype is scoped to its opt-in class');
  assert.match(css,/html\.atlasPremiumPreview/);
  assert.match(js,/className='atlasCompactSummary'/,'Compact summaries are additive');
  assert.match(js,/const cleanTitle=/,'Raw source titles remain preserved');
  assert.match(js,/const details=document\.createElement\('details'\)/,'Advanced controls remain accessible');
  assert.match(js,/for\(const node of advanced\)/,'Controls are moved intact, not duplicated');
  assert.match(js,/region'\)\?\.addEventListener\('change',syncMapToRegion/);
  assert.match(app,/function card\(p,compact=false\)/);
  assert.match(product,/card=\(p,compact=false\)=>/);
  assert.doesNotMatch(js,/state\.marks\s*=/,'Prototype must not overwrite decisions');
  assert.doesNotMatch(js,/localStorage\.clear\s*\(/);
});


test('editorial palette prototype keeps neutral surfaces and six distinct accessible accents',()=>{
  const html=read('index.html'),pwa=read('sw.js'),css=read('premium-editorial-palettes.css');
  assert.match(html,/premium-editorial-palettes\.css\?v=20261111makeover3/);
  assert.match(pwa,/premium-editorial-palettes\.css\?v=20261111makeover3/);
  assert.match(css,/--bg:#141719/);
  assert.match(css,/--panel:#22272A/);
  assert.match(css,/--line:#373E42/);
  assert.match(css,/--ux-accent:#9EBEAD/);
  const stableCanvas=css.split('Give the neutral canvas')[1]?.split('/* Existing palettes')[0]||'';
  assert.match(stableCanvas,/--bg:#141719/,'Exact charcoal canvas must override older palette rules');
  assert.match(stableCanvas,/--panel:#22272A/,'Neutral surfaces must override old green tint');
  assert.match(stableCanvas,/--line:#373E42/,'Neutral border contrast must override legacy palettes');
  for(const palette of ['forest','copper','mauve','amber','cocoa','mono']){
    assert(stableCanvas.includes('data-theme="dark"][data-palette="'+palette+'"]'),
      'Explicit high-specificity dark neutral canvas missing for '+palette);
    assert(stableCanvas.includes('data-theme="light"][data-palette="'+palette+'"]'),
      'Explicit high-specificity light neutral canvas missing for '+palette);
    assert(css.includes('data-theme="dark"][data-palette="'+palette+'"]'),
      'Missing dark palette '+palette);
    assert(css.includes('data-theme="light"][data-palette="'+palette+'"]'),
      'Missing light palette '+palette);
    assert(css.includes('[data-ob-palette="'+palette+'"]'),
      'Missing updated onboarding swatch '+palette);
  }
  assert.match(css,/\.atlasSummaryChipPrimary/,'Informational setting chips must be neutral');
  assert.match(css,/\.salary-value/,'Salary values are read-only information');
  assert.match(css,/\.atlasSummaryChipCaution/,'Warnings keep distinct semantic colour');
  assert.match(css,/\.productIntro\.card/,'Hero should have a neutral surface');
  assert.match(css,/html\.atlasPremiumPreview/,'Palette changes must remain prototype-scoped');
});


test('discovery redesign uses progressive disclosure and concise, evidence-led summaries',()=>{
  const html=read('index.html');
  const hero=read('premium-discovery-preview.js');
  const heroCss=read('premium-discovery-preview.css');
  const cards=read('premium-card-tabs.js');
  const cardCss=read('premium-card-tabs.css');
  assert.match(html,/premium-discovery-preview\.js\?v=20261111makeover3/);
  assert.match(hero,/className='atlasHowItWorks'/,'Introductory explanations should remain accessible behind disclosure');
  assert.match(hero,/enhanceNavigation/,'Secondary navigation should be grouped');
  assert.match(hero,/activeAdvanced/,'Active advanced filters should reopen automatically');
  assert.match(hero,/OrielFitMapToScope/,'Region changes should fit the filtered map bounds');
  assert.match(hero,/Hospital rotation: '\+h\+' weeks/,'Fit language should state sourced rotation weeks');
  assert.match(hero,/Stated gross salary/,'Vague salary praise should be replaced by a factual amount');
  assert.match(heroCss,/atlasMoreNav/,'Secondary navigation needs a visible More disclosure');
  assert.match(heroCss,/atlasHowItWorks/,'How it works disclosure needs a clear presentation');
  assert.match(cards,/atlasCompactTakeHome/,'Compact cards should show the estimated monthly take-home');
  assert.match(cards,/Travel to check/,'Multi-postcode programmes should surface a travel check');
  assert.match(cards,/Sponsorship not stated/,'Unknown eligibility must remain unknown');
  assert.doesNotMatch(cards,/facts\.push\(\['good','Hospital \+ GP'/,
    'A training setting is factual, not inherently a positive recommendation');
  assert.match(cardCss,/atlasCompactTakeHome/,'Compact take-home needs a readable secondary style');
});
