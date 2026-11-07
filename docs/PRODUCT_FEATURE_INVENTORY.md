# Oriel Placement Desk — feature and development inventory

**Purpose:** maintain a complete, credible record of product decisions for the public README, a LinkedIn Projects entry, CV and launch posts. Based on the current application modules and the creator's first-hand description. Do not mistake a feature list for proven research outcomes.

## What the product does

Independent applicant decision-support application for the 2027/28 England & Wales Foundation Pharmacist Training recruitment cycle. The built-in catalogue contains **4,064 programmes across 12 regions**, sourced from a direct Oriel CSV export. It does **not** update, rank or submit real Oriel preferences.

### Applicant experience and filtering
- Multi-step personalisation using preferred region, settings, salary/hours, career and lifestyle priorities, and comfort with community pharmacy.
- Full-programme browsing, adjustable fit-scoring signals and clearly presented reasons to consider / trade-offs to check.
- Search, quick filters, region and sector filters; hospital, general practice, hospital + GP, industry, multi-setting, community and lower-community exposure.
- Specialist exclusion controls for prison/custody, mental health/forensics, hospice, rehabilitation and substance-misuse environments, using descriptive programme text as clues rather than verified workplace classifications.
- Salary and hours constraints, sponsorship context, commute-location and radius filters.
- List and grid layouts, sorting controls, ascending/descending ordering where exposed, collapsible sidebar and focused result browsing.
- Expandable programme cards, direct links to the official Oriel entry where available, and fast-copy programme IDs / preference codes where exposed.

### Placement locations and commute
- Interactive England & Wales location map, configurable map appearance, sector-coloured markers distinguishing hospital, GP, community and other settings.
- Synchronised filtered map/list results; postcode lookup and an optional straight-line distance radius.
- Programme-specific mini-maps displaying training sites or rotations, directional controls, and external map/directions links.
- Saved starting point / home postcode; indicative journey advice and comparison based on known locations. Actual journeys depend on dates, transport services, complete rotation sites and conditions.
- Technical mapping stack: Leaflet + MapLibre GL / OpenFreeMap with OpenStreetMap fallback; the actual vector-map render path must be separately verified in real browsers.

### Comparison, decisions and ranking
- Saved and excluded programme states including Love, Strong yes, Maybe, Only if needed, No and Absolutely not.
- Manual shortlist priority ordering, reverse/ascending/descending review controls where applicable, notes, programme comparison and decisions export.
- Session undo/redo, downloadable backup/restore, and safeguards intended to preserve stable programme IDs during CSV updates.
- Dedicated **Oriel Simulation** and outcome views for practising a ranking workflow and reasoning about hypothetical allocation. They are not connected to the official Oriel allocation service and must not be represented as its algorithm.
- Copying a programme's Oriel code to simplify locating it on the official website, rather than claiming automatic official submission or integration.
- Split view / external Oriel navigation shortcuts designed to compare the desk with official entries while building a preference list.

### Financial context
- Advertised gross annual pay, monthly gross pay and indicative effective hourly rates.
- Illustrative income-tax, National Insurance, pension and student-loan assumptions producing estimated annual and monthly take-home pay; tax assumptions and individual circumstances must always be disclosed.

### Interface, accessibility and refinement
- Cohesive design system and six interface palettes where supported, dark/light modes, responsive phone and desktop layouts, list/grid view, and collapsible panels.
- Different map pin colours by setting, expandable detail panels, visual hierarchy and keyboard interactions.
- Iterative corrections to visual alignment, map rendering, mobile usability, card spacing, browser caching and other issues encountered during real use.
- Controls to hide excluded items, focus on shortlisted items, and tailor how much information is shown at once.

### Accounts, synchronisation and privacy
- Sign-in via Google OAuth or passwordless email magic link using Supabase Auth; no separate Placement Desk password form.
- Opt-in signed-in workspace storage and synchronisation across devices, layered on top of browser storage.
- Row-level security policies restrict workspace reads, writes and deletes to the authenticated workspace owner.
- App does not submit official Oriel preferences or publish applicants' personal ranks/notes inside the built-in programme CSV.
- Local backup remains important before domain migrations or device changes.

## Product-development story for LinkedIn

The important contribution is not merely a visual redesign. It is **end-to-end iterative product ownership**: discovering a decision bottleneck during a live professional recruitment process, defining user needs, shaping personalised scoring and filtering, working through data and programme-ID integrity, building simulator and ranking workflows, integrating mapping/commute/pay insights, adding authentication and cloud persistence, and testing browser behaviour, security and reliability.

This was **AI-assisted software development**. Present it accurately: the owner drove requirements, product decisions, use-case evaluation, iteration and verification, with AI tools assisting implementation. Avoid claiming all code was manually programmed without assistance, independent external usability impact that wasn't measured, or an official Oriel partnership.

## Evidence and validation

- **Data:** 4,064 rows, 12 regions, unique preference identifiers, no exported personal ranks/tags.
- **Tests:** `tests/catalogue-parser.test.cjs`, `tests/independence.test.cjs`, `tests/shortlist.test.js`, `tests/research.test.js` and Playwright browser smoke tests.
- **Live deployment:** GitHub Pages; optional Supabase cloud workspace.
- **Limitations to verify before launch:** completed Google OAuth cross-device round trip; user backup and restore; actual MapLibre vector rendering instead of raster fallback; public map use and Oriel data terms; optional pay calculation assumptions; separate applicant usability sessions.

## Suggested professional skill themes

Product strategy and ownership · UX and information architecture · Data analysis / data modelling · Software prototyping and AI-assisted development · Quality assurance / regression testing · API & cloud integration · Evidence-led problem-solving · User-centred design.

**Portfolio note:** Keep this detailed inventory as source material; a LinkedIn project description should select the five or six highest-impact feature groups and link to a working demo and readable README. A launch post can tell the before/after story and demonstrate the simulator and cloud accounts visually.
