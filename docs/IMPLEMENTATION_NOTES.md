# Implementation and verification notes

## AI-assisted development

This iteration used Codex to inspect the running product and source, propose a measurable first-use journey, implement changes, and author regression checks. Product direction came from Phivos: make the desk clearer and more personal, add reversibility and geographic discovery, and build evidence relevant to product-builder roles.

The inherited explorer and dataset are credited in the README. New work is visible in this change's diff. Generated code is not evidence of impact: actual applicant sessions and experiment results must be collected separately. Reviewers can inspect the event schema, tests and trade-offs rather than relying on an unsupported “AI-built” claim.

## Design decisions

- Saved region preferences influence scoring; temporary exploration filters do not change a programme's personal fit score.
- Salary/hours are hard limits in both Explore and For You. Unknown hours do not satisfy a maximum-hours limit.
- The introduction becomes compact after setup. Personalisation has one main intro action.
- Undo/redo retains at most 30 changes in memory. Rapid edits to the same note, priority or slider are grouped. New edits discard redo. Reloading clears history; normal saved decisions persist. Dataset replacement resets the history boundary.
- Sector colours live in `state.prefs.mapColours` and travel in the existing backup. Legend and pin text still identify settings; colour is not the sole cue.
- Radius centre and postcode exist only in memory. A successful postcode lookup uses [postcodes.io](https://postcodes.io/docs/postcode/lookup/); map-point selection does not require a postcode request. Distances use Leaflet's geographical `distanceTo`, not routing. Any mapped rotation inside the radius qualifies. Other filters remain active, and unknown locations are excluded with an explanation.
- Freehand polygon drawing is deferred until the first sessions establish a need. It adds drawing, editing and mobile accessibility complexity beyond a radius filter.
- Study results stay local with no analytics vendor or backend. Manual exports permit a small recruited pilot but introduce missingness and selection bias. They are not site-wide acquisition analytics.
- The experiment intentionally tests button copy and prominence as one package. Cohorts, exposure, pending windows and QA exclusion are explicit.

## Files

`app.js` loads the existing base/product/public/map/onboarding/date layers. `research-core.js` contains pure event validation and aggregation. `research.js` handles consent, study events and local reports. `desk-enhancements.js` adds session history and distance discovery. These new scripts are included by `index.html` without a build step.

## Verification

Run pure measurement tests with `node --test tests/research.test.js`. Browser regression checks live in `tests/browser-smoke.cjs`; see its header for setup. External postcode and map requests are stubbed in that automated test, so it checks application behaviour rather than availability or correctness of third-party services.

Before merging, review automated results and check actual map tiles/postcode lookup in the deployed browser. Safari and real-device screen-reader testing remain separate from Chromium viewport checks. Passing a narrow regression suite is not a claim that every legacy feature or browser is flawless.

### Checks run for this iteration

- Pure measurement tests: 5 passed (metadata allowlist, activation timing, deduplication/cohort exclusions, return-use eligibility, invalid imports).
- Headless Chromium: consent, Wales onboarding, salary/hour limits, stable recommendation scores, shortlist undo/redo, colour undo, radius filtering, two-programme comparison, ranked export, study events, reload persistence, report imports, withdrawal and backup restoration passed.
- A 390-pixel viewport had no horizontal page overflow. Desktop and mobile screenshots were inspected; map tiles were intentionally blocked by the deterministic test and are not a visual validation of the live map service.
- JavaScript syntax and Git whitespace checks passed.

These are software checks, not independent applicant sessions.
