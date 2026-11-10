# Placement Atlas — product, feature and evidence inventory

**Last reviewed:** 10 November 2026  
**Purpose:** this is the detailed internal source of truth for the product's scope, implementation, evidence, limitations and professional positioning. Use it to prepare the public README, LinkedIn launch material, CV entries, demos and future development plans. Keep claims proportional to what the code, tests and real-world validation actually establish.

> **Positioning:** Placement Atlas is an independent decision-support platform for England & Wales Foundation Pharmacist Training applicants. It is not an official Oriel, UCL, NHS England or employer product. It does not submit, alter or rank official Oriel preferences.

## 1. Product at a glance

Placement Atlas turns a large programme catalogue into a guided workspace for exploring options, relating programme information to an applicant's priorities, inspecting training locations, understanding trade-offs, comparing choices and organising a personal shortlist.

| Product fact | Current position |
| --- | --- |
| Built-in catalogue | **4,064 programmes** |
| Geographic coverage | **12 regions** across England and Wales |
| Recruitment context | 2027/28 Foundation Pharmacist Training cycle |
| Data provenance | Oriel pharmacy-programmes CSV supplied to the project on **7 November 2026**; this is a dated snapshot, not a live feed |
| Main workflows | Explore · For You · Tinder Mode · Shortlist · Compare · Oriel Simulation · My Outcome · Preferences |
| Delivery | Static web application on GitHub Pages, custom domain, installable PWA |
| Persistence | Browser storage and downloadable backups; optional Supabase account workspace when its project/auth/database configuration is operational |

**Core product principle:** make the options easier to understand, make the trade-offs visible, and leave the decision with the applicant.

## 2. Data and catalogue integrity

### Source and structure

- The public catalogue is built from a direct Oriel pharmacy-programmes CSV export supplied by the project maintainer on 7 November 2026.
- The five files `data/oriel-2026.part-01.txt` through `data/oriel-2026.part-05.txt` are contiguous UTF-8 sections of one quoted CSV. The application concatenates them in order before parsing; they are not five independent CSV files.
- The export's `Programme Number` field is blank. The application uses the complete `Preference` value as its stable programme identifier. Do not replace it with a newly derived or shortened identifier without a migration plan.
- Stable identifiers preserve the relationship between programme rows and saved decisions, notes, shortlist priorities, simulation entries and account workspace data.
- The catalogue parser handles quoted fields and multiline programme descriptions.
- The application can honour an applicant-uploaded Oriel CSV before falling back to the built-in catalogue.

### Updating the dataset

`scripts/build_catalogue.py` rebuilds the five public data parts from a fresh Oriel CSV export. It validates required columns, non-empty data and unique identifiers before writing output. Any future refresh must also:

1. Confirm the export's provenance, date and applicable Oriel data terms.
2. Compare the new programme identifiers with the existing catalogue and saved-state compatibility requirements.
3. Update the required row-count guard if the dataset size changes.
4. Run catalogue-parser and independence tests, then inspect the application with the refreshed dataset.
5. Update the README and this inventory with the new export date and count.

**Do not describe the catalogue as live, continuously updated, complete for every future intake, or an availability feed.** Applicants must verify current programme details with official sources and employers.

## 3. Applicant experience and product features

### 3.1 First visit and personalisation

- New visitors begin with a general, broad catalogue view. Personal fit is not presented as if the application already knows the visitor's preferences.
- A guided multi-step setup collects an optional region and home-base postcode; preferred training environment; career and lifestyle priorities; minimum salary and maximum weekly-hours preferences; and comfort with community-pharmacy exposure.
- Training-environment choices include hospital-led, GP-focused, mixed/split settings, industry/research, community and broad exploration.
- Priority signals include pay, work-life balance, progression, location, independence and clinical variety.
- Applicants can choose among six palettes — Forest, Copper, Mauve, Amber, Cocoa and Mono — and light or dark appearance.
- Preferences can be revisited and adjusted. The quiz is a starting point, not a permanent commitment or a guarantee that every result will meet every preference.

### 3.2 Explore and filter the catalogue

- Search by programme, employer, identifier and available descriptive/location text.
- Filter and sort by region, setting/sector, salary, weekly hours, sponsorship information, decision state and other available programme characteristics.
- Quick filters cover common discovery needs such as hospital-led, GP-heavy, hospital + GP, split placements, industry, community, lower-community exposure, desk-oriented signals, pay and hours.
- Specialist-setting controls can hide or focus on descriptive indicators such as mental health/forensic, custody/prison, hospice, rehabilitation and substance-misuse environments. These are text/data-derived clues, not independently verified classifications of every training site.
- Location-related controls include postcode context, outer-area preferences, a straight-line radius and controls to hide excluded or already-shortlisted programmes.
- List and grid layouts, sorting, pagination, collapsible filters and focused browsing reduce the need to scan every field at once.
- Programme cards expose employer, title, region, programme code, stated setting/rotation information, salary, hours, sponsorship status and available location details.
- Where available, programme previews and external links help the applicant inspect a programme or locate its official Oriel entry.

### 3.3 For You: preference-aware recommendations

- The For You view ranks a limited set of relevant programmes using the product's fit-scoring logic, available programme fields and saved applicant preferences.
- Personal fit is a heuristic, not an objective employer rating, a validated prediction of satisfaction, a guarantee of suitability or an official Oriel score.
- Adjustable preference weights let applicants express the relative importance of pay, hospital, GP, lifestyle, location, progression, independence and community exposure.
- Salary and weekly-hours criteria can act as hard discovery limits; missing hours do not satisfy a maximum-hours constraint.
- Programme cards provide reasons to consider an option and trade-offs worth checking, rather than relying on a score alone.
- Before setup, the cards use general labels such as **Programme highlights** and **Potential trade-offs**. After setup, they switch to **Why it fits you** and **Trade-offs for you**.
- The positive and caution signals are conditional on the visitor's answers. For example, major GP exposure should not be advertised as a benefit to someone who has said they do not want GP training; a hospital-heavy programme can instead be flagged as a mismatch for someone seeking community-heavy experience.
- Unknown, incomplete or missing data should be surfaced as uncertainty rather than silently treated as a positive match.

### 3.4 Tinder Mode

- One-programme-at-a-time decision workflow, designed to make reviewing a large catalogue feel more focused and less repetitive.
- Supports swipe gestures and explicit on-screen controls, with distinct visual states for **NOPE**, **LIKE** and **SUPER LIKE**.
- Decisions map to the application's existing states: Love, Strong yes, Maybe, Only if needed, No and Absolutely not.
- Includes a focused filter set for region, training setting, minimum salary, maximum hours, split placements and hiding programmes already decided.
- Shows programme details, available pay/hours, setting signals and training-location information while reviewing a card.
- Uses a preloaded next-card presentation and animated feedback; undo restores the previous programme and its previous decision rather than merely moving the card back visually.
- Stores local progress and includes Tinder Mode state in the signed-in workspace allowlist.

### 3.5 Shortlist, decisions and ranking

- Save programmes into decision states: Love, Strong yes, Maybe, Only if needed, No and Absolutely not.
- Assign manual ranking priorities and add applicant-authored notes.
- Reorder and review the shortlist, with a live shortlist count and controls to focus on or hide selected groups.
- Export a ranked shortlist and export broader programme decisions to CSV.
- Download a backup and restore it later, with validation to prevent incompatible or malformed backup data from being applied.
- Recent changes can be undone/redone during the current session. The history is bounded and is not a permanent audit log; saved decisions remain separate from the temporary undo history.
- Stable programme IDs are important to preserve shortlist and note continuity when refreshing catalogue data.

### 3.6 Compare

- Select up to five programmes from Explore for side-by-side comparison.
- Compare available programme details such as setting, location, salary, hours and other supplied fields.
- Comparison is a decision aid; missing source fields should remain visibly unknown rather than being inferred.

### 3.7 Oriel Simulation

- Separate practice workspace for organising programmes into **Preferred**, **Neutral** and **Unwanted** groups.
- Allows applicants to move and reorder programmes, inspect programme codes and details, and import the current shortlist into the Preferred column.
- Includes its own export and backup/restore workflow.
- Simulation data is separate from the main shortlist and the applicant's official Oriel account.
- It is a personal planning aid, not the official Oriel allocation algorithm, an offer prediction, an allocation calculator or an integration that submits preferences.

### 3.8 My Outcome

- Private applicant-side record for an outcome/status, associated programme, received date, response deadline and personal notes.
- Data is saved locally and is included in the signed-in workspace allowlist.
- It is a personal tracking aid, not an official recruitment record or a source of verified allocation status.

### 3.9 Pay and working-pattern context

- Displays stated gross annual salary and, where enough data is available, gross monthly and indicative gross hourly comparisons.
- The optional take-home estimator models illustrative income tax, National Insurance, pension and Plan 5 student-loan assumptions.
- Pension assumptions include a standard qualifying-earnings contribution, an NHS pension tier estimate and a no-pension option.
- Calculation rules and rates are time-sensitive and must be checked against the current tax year and relevant employer/pension arrangements before presenting them as authoritative.
- Estimates are not payroll advice or a promise of an individual payslip; tax residency, salary sacrifice, pension scheme, loan plan and personal circumstances can change the result.

### 3.10 Locations, maps and transport

- Interactive England and Wales map, with map/list results responding to the same programme filters.
- Programme markers use setting-aware colours for hospital, GP, community and other categories; labels and legends provide non-colour context.
- Custom Editorial Light and Editorial Dark MapTiler Planet vector styles, with automatic theme switching.
- MapLibre GL JS is integrated with Leaflet. MapTiler raster tiles and OpenStreetMap Standard tiles provide fallback paths when vector rendering or the preferred provider is unavailable.
- Programme-specific location previews support programmes with multiple postcodes/training sites and controls to move between locations or open external map directions.
- Bundled Tube-station and England/Wales national-rail-station data provide nearby transport context.
- Optional home-base postcode can be saved to the applicant's profile. Postcodes.io is used for postcode lookups/coordinate resolution.
- A distance filter uses straight-line geographic distance, not a route planner. A programme can qualify when at least one known training location falls within the radius; programmes with unknown/unmapped sites cannot be reliably assessed and should be identified as such.
- Where a home postcode and training-site postcode are available, the TfL Journey Planner can provide an indicative public-transport itinerary using a consistent weekday 08:00 departure sample for comparison.
- Commute estimates depend on the service, date, route data and known training sites. They are not guarantees about an applicant's actual rota, timetable, disruption, walking tolerance or future commute.

### 3.11 Interface, appearance and installability

- Six palettes: Forest, Copper, Mauve, Amber, Cocoa and Mono.
- Light/dark modes with coordinated application and map styling.
- Responsive desktop and mobile layouts, with list/grid views, adjustable page zoom, collapsible filters, focused navigation and mobile-specific refinements.
- Installable Progressive Web App manifest and service worker.
- The service worker caches the application shell and selected local resources for repeat visits and limited offline use. Third-party maps, authentication, postcode and transport lookups still require connectivity.
- Visual refinements include consistent card hierarchy, colour-coded settings, responsive navigation, undo feedback, map fallbacks and reduced layout friction.

## 4. Accounts, persistence and privacy

- Browser storage supports the core application without requiring an account.
- Downloadable backup/restore remains available for user-controlled portability.
- Supabase Auth and a private Postgres workspace table are integrated for optional signed-in persistence. The code supports Google OAuth and passwordless email sign-in flows.
- The cloud layer synchronises an allowlist of applicant workspace keys, including saved decisions/preferences, simulation, Tinder Mode progress, appearance, outcome and other supported workspace state.
- The workspace is stored as a user-owned record. The SQL migration enables Row Level Security and policies are designed to bind reads/writes/deletes to `auth.uid()` and the authenticated `user_id`.
- The frontend uses a browser-safe publishable key; a service-role secret must never be placed in client-side code.
- Cloud availability and cross-device behaviour depend on the deployed Supabase project, applied migration, enabled auth providers, redirect configuration and correct live RLS policies. Do not claim a fully verified cross-device round trip unless it has been tested with separate accounts/browsers.
- The built-in public programme catalogue does not contain applicants' personal ranks, notes or decision states. Applicant workspace data is separate from the shared programme dataset.
- The commute starting postcode is personal information. Review the relevant provider's handling before entering it; the app's cloud and external-service behaviour should be described accurately.
- Account conflict handling is designed to ask the user which copy to keep when there are meaningful unsynchronised local changes and a different remote workspace, rather than silently overwriting either copy.

## 5. Research and measurement: implementation versus evidence

- A first-use research/measurement module and pure event-validation/aggregation code exist in `research.js` and `research-core.js`.
- The module was designed around explicit consent, local storage, user-controlled export/deletion and voluntary import of tester files for local descriptive analysis.
- The shortlist-button experiment is currently paused in the interface following usability feedback; the app states that no new study activity is recorded. Previous results can still be exported or deleted.
- The study plan explicitly states that the external applicant study has not yet been run. There are no established activation, retention, satisfaction, conversion or uplift results to report.
- Research exports are not site-wide analytics, and a browser identifier is not proof of a unique person.
- Never claim a successful A/B test, measured conversion improvement, applicant adoption, independent usability validation or statistically meaningful result without collecting and analysing the relevant evidence.
- Do not commit participant exports or identifiable interview notes to the public repository.

## 6. Technical architecture

| Layer | Current implementation |
| --- | --- |
| Frontend | HTML, CSS and modular vanilla JavaScript; static deployment, no framework build step |
| Core application | `app-base.js`, `app-product.js` and supporting feature modules |
| Onboarding and preferences | `onboarding.js`, `preferences-ui.js`, `workspace-ux.js` |
| Swipe workflow | `tinder-mode.js`, `tinder-mode.css` |
| Ranking and simulation | Core shortlist logic plus `simulator.js` |
| Map rendering | Leaflet, MapLibre GL JS and the MapLibre–Leaflet adapter |
| Basemaps | MapTiler Planet vector data, custom editorial styles, MapTiler raster and OpenStreetMap fallback |
| Location data/services | Postcodes.io, TfL Journey Planner, bundled Tube and national rail station data |
| Account/workspace | Supabase Auth, Postgres JSONB workspace record and RLS migration |
| Pay modelling | `pay-estimate.js` |
| PWA | `manifest.webmanifest`, `pwa.js` and `sw.js` |
| Catalogue preparation | Python standard-library script in `scripts/build_catalogue.py` |
| Hosting | GitHub Pages with `placementatlas.co.uk` custom domain |
| Automated QA | Node.js tests, Playwright/Chromium smoke tests and GitHub Actions |

### Key repository areas

```text
data/                  Built-in programme catalogue and geographic datasets
docs/                  Product inventory, implementation notes and research plan
map-styles/            Custom editorial light/dark map styles
scripts/               Catalogue rebuild tooling
supabase/              Workspace migration, setup notes and RLS checklist
tests/                 Data integrity, independence, location, shortlist and browser tests
index.html              Application entry point
app-base.js             Core catalogue, filters, scoring and shortlist state
app-product.js           Programme cards and preference-aware explanations
onboarding.js            Applicant personalisation setup
tinder-mode.js            Swipe-based programme decisions
simulator.js              Separate Oriel practice workflow
map-basemap.js            MapLibre/Leaflet map rendering and fallbacks
supabase-cloud.js          Account workspace synchronisation
sw.js                      PWA caching and offline application shell
```

## 7. Quality assurance and evidence

### Automated checks in the repository

- `tests/catalogue-parser.test.cjs` — CSV parsing, quoted/multiline fields and catalogue integrity.
- `tests/independence.test.cjs` — checks that the public app/dataset does not rely on the old explorer's private data/state.
- `tests/location-guidance.test.cjs` — location and programme-guidance logic.
- `tests/shortlist.test.js` — shortlist/ranking behaviour.
- `tests/research.test.js` — research event validation and aggregation logic.
- `tests/browser-smoke.cjs` — local Playwright/Chromium checks across onboarding, preferences, filtering, shortlist actions, undo/redo, comparison, exports, local persistence, backup/restore and mobile viewport behaviour.
- `tests/reliable-map-smoke.cjs`, `tests/map-theme-smoke.cjs` and `tests/shortlist-badge-smoke.cjs` — focused UI, map/theme, deployed rendering and shortlist checks.
- `.github/workflows/map-theme-smoke.yml` runs Node tests and Chromium smoke checks on relevant changes, then includes a deployed GitHub Pages smoke check after pushes to `main`.

Run the core Node suite locally from the repository root:

```bash
node --test tests/catalogue-parser.test.cjs tests/independence.test.cjs tests/location-guidance.test.cjs tests/research.test.js tests/shortlist.test.js
```

Browser checks require Playwright and Chromium; see the header of the relevant test script for setup.

### What automated tests do and do not prove

- A passing deterministic browser test proves only the paths and conditions that test exercises.
- External map tiles and postcode/transport services may be stubbed or blocked in tests; a green test is not proof that every live provider is available or visually correct.
- Chromium viewport checks do not substitute for Safari, assistive-technology or broad real-device testing.
- Code-level RLS policies do not alone prove that the production Supabase project has the correct migration, provider settings and live access behaviour.
- Automated checks do not establish usability, adoption, satisfaction or outcomes for independent applicants.

## 8. Known limitations and verification checklist

Before describing a capability as fully validated, check the relevant item:

- [ ] Refresh the Oriel catalogue only from a documented export; record its date and verify stable programme IDs and data-use terms.
- [ ] Recheck programme descriptions, training sites, salary, weekly hours, sponsorship and recruitment dates with official sources/employers.
- [ ] Test fit explanations against opposing profiles (for example, hospital-preferring versus community-preferring applicants) and confirm the reasons do not contradict the quiz.
- [ ] Confirm incomplete or missing training postcodes are clearly identified, especially for split placements.
- [ ] Test actual MapTiler vector rendering, map fallbacks and mini-map behaviour in current desktop and mobile browsers.
- [ ] Verify postcodes.io and TfL requests in the deployed site; explain the sample time and uncertainty of commute results.
- [ ] Recheck pay/tax/pension/loan assumptions against current official rates before relying on numerical examples.
- [ ] Complete Supabase sign-in, sign-out, migration, two-account isolation, conflict handling and cross-device round-trip checks against the live project.
- [ ] Test backup/restore and confirm a restored workspace retains the correct programme IDs.
- [ ] Conduct separate applicant usability sessions and document sample size, tasks, findings and changes. Do not infer results from the creator's own use.
- [ ] Test Safari, real mobile devices, keyboard-only use and screen-reader behaviour beyond the existing Chromium smoke suite.

## 9. Product-development story and professional positioning

The project's contribution is **end-to-end product ownership**, not simply a visual redesign or a list of generated code files:

1. **Problem discovery:** identifying the friction in turning thousands of professional training programme listings into a meaningful personal decision.
2. **Product strategy:** translating that problem into clear workflows, priorities, scope and trade-offs.
3. **Data work:** handling the source export, catalogue parsing, stable identifiers, data integrity and geographic context.
4. **Decision-support design:** creating preference-aware fit explanations, transparent trade-offs, filtering, comparison and ranking workflows.
5. **UX and interaction design:** shaping the onboarding, swipe workflow, responsive layouts, themes, map interactions, undo behaviour and user-controlled exports.
6. **Technical integration:** bringing together mapping, postcode resolution, transport estimates, pay modelling, PWA delivery and optional cloud workspace functionality.
7. **Quality and iteration:** using automated tests, browser inspection, issue diagnosis and repeated refinements to improve reliability and usability.

Development has involved **AI-assisted software implementation**. Describe the work accurately: Phivos drove the problem framing, requirements, product direction, feature decisions, evaluation, iteration and verification, while AI tools assisted implementation. Do not claim that every line of code was manually written without assistance.

### Credible skill themes

Product strategy and ownership · User-centred design · UX and information architecture · Data preparation and modelling · Explainable decision-support logic · Geospatial product integration · API and cloud integration · Software prototyping · AI-assisted development · QA and regression testing · Evidence-led iteration.

### Claims to avoid

- Official Oriel, NHS England or UCL partnership, endorsement or integration.
- Automatic submission or modification of official preferences.
- Reproduction of the official Oriel allocation algorithm or prediction of offers.
- Guaranteed accuracy of fit scores, commute times, take-home pay or programme details.
- Verified adoption, applicant impact, conversion uplift or research outcomes without independent evidence.
- Claims that every browser, service, account flow or device has been comprehensively tested.

## 10. Portfolio and documentation guidance

- The public README should be the concise, applicant-facing overview of what Placement Atlas does, how it works, what it does not do and how to try it.
- This inventory is the fuller internal reference for feature scope, source files, evidence, caveats and professional positioning.
- `docs/IMPLEMENTATION_NOTES.md` should capture specific engineering decisions and the exact checks run for a given iteration.
- `docs/RESEARCH_PLAN.md` should remain the source for study design and measurement definitions; it must clearly distinguish instrumentation from completed research.
- Keep the LinkedIn Projects description concise and outcome-oriented, linking to the live application and README. Use a launch post to tell the problem → product decisions → working solution story.
- Keep the CV focused on the strongest transferable evidence: product ownership, data modelling, UX, technical integration and quality assurance. Do not turn the inventory into an inflated list of unvalidated impact claims.

## 11. Useful links

- [Live application](https://placementatlas.co.uk/)
- [Public README](../README.md)
- [Comparison guide](https://placementatlas.co.uk/guide.html)
- [Catalogue provenance and update instructions](../data/README.md)
- [Implementation and verification notes](IMPLEMENTATION_NOTES.md)
- [Research plan and measurement definitions](RESEARCH_PLAN.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)
- [Supabase workspace notes](../supabase/README.md)
- [GitHub Discussions](https://github.com/phivosmichailides/Placement_Atlas/discussions)

---

**Maintenance rule:** when a material feature changes, update this inventory and the relevant implementation notes. When public-facing claims change, keep the README, LinkedIn materials and CV consistent with the evidence recorded here.