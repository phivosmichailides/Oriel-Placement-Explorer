# Oriel Placement Desk

**Explore more clearly. Compare what matters. Rank with confidence.**

A personalised, independent decision-support web app for applicants comparing **England & Wales Foundation Pharmacist Training programmes**. Built around the real challenges of choosing between thousands of placements—not just displaying a spreadsheet.

**[Open the live app](https://phivosmichailides.github.io/Oriel-Placement-Explorer/)** · [How it works](#how-it-works) · [Data and limitations](#data-and-limitations) · [Technical overview](#technical-overview)

> **Independent project.** Not affiliated with, endorsed by, or connected to NHS England or the Oriel recruitment service. This tool does not submit or change official preferences.

## At a glance

| Programme catalogue | Personalisation | Your decisions |
| --- | --- | --- |
| **4,064** programmes across **12** England & Wales regions | Adjustable priorities, settings, pay, hours and location | Shortlist, exclude, compare, annotate, rank and export |

The catalogue is an **October 2026 Oriel export** supplied directly to the project maintainer. It is a snapshot, **not live vacancies or offer availability**.

## How it works

1. **Explore.** Browse the complete catalogue or narrow it by region, setting, salary, weekly hours, sponsorship and other criteria.
2. **Personalise.** Complete a short setup and adjust what you value—from hospital/GP exposure to pay, career development and working environment.
3. **Understand the trade-offs.** Each fit score is accompanied by plain-English supporting signals and limitations to investigate. Scores are heuristics, not verified workplace reviews.
4. **Use the map.** Inspect training locations, filter by straight-line distance and switch between key-free light, detailed and dark basemap styles.
5. **Make your shortlist.** Save, exclude, reorder, compare and export programmes. Keep a restorable backup of your work.

### Features

- **Flexible discovery:** England & Wales coverage, text search, specialist-setting controls and filters for hospital, GP, community, industry and multi-sector rotations.
- **Transparent comparisons:** salary, effective hourly pay, programme details, stated training sites, reasons to consider and trade-offs to check.
- **Location-aware exploration:** interactive map, postcode lookup, mapped rotation sites and distance filtering. Commute and neighbourhood information is supporting context, not a promise.
- **Decision workspace:** Love / Strong yes / Maybe / Only if needed / No states, manual priority order, notes, side-by-side comparisons, undo/redo and ranked shortlist exports.
- **Portability:** browser storage, downloadable backup/restore, and optional **signed-in Supabase cloud synchronisation** for supported workspace data.
- **Application-stage tools:** a clearly labelled Oriel outcome simulation for exploring hypothetical ranking scenarios; it is not an official allocation model.
- **Customisation:** theme preferences, map appearance, layout controls and editable personal priorities.

## Why I built this

I was trying to make a consequential career decision from thousands of listings with uneven descriptions and many competing priorities. A conventional spreadsheet could show the information, but it didn't help me progressively narrow down *why* I would actually want one programme over another.

I built and iterated this tool around my own live application: identify friction, redesign the workflow, test it on real choices and preserve the user's final say. It has become a broader product-design and software project, developed through extensive **AI-assisted implementation, technical iteration and first-hand user testing**.

The guiding principle is simple: **recommendations should explain themselves, while the applicant stays in control.**

## Privacy and saving

The site runs as a static application on GitHub Pages. A signed-in user can optionally use Supabase to synchronise supported workspace information between devices; without cloud sync, decisions remain in that browser. Users can export and restore a local backup. Cloud account data and local storage should be treated as distinct backup mechanisms.

The app does **not** submit preferences to Oriel. The public built-in dataset contains **no applicant-specific ranks or private tags**. External providers may receive location lookups or map requests; see [service and software notices](THIRD_PARTY_NOTICES.md).

## Data and limitations

- **Source:** the maintainer's 2026 pharmacy programme CSV export, covering England & Wales, not every UK training region.
- **Freshness:** programme descriptions, salaries, available places and recruitment dates may change. Always verify the latest official listing and employer details.
- **Fit scores:** based on structured fields, descriptions and user-configurable weights. They cannot establish actual autonomy, workload, supervisory culture, commute time or eligibility.
- **Location:** a split placement can contain sites beyond the first map pin or distance radius. Straight-line distance is not a journey-time estimate.
- **Simulation:** hypothetical, educational decision support—not a forecast or reproduction of the Oriel allocation algorithm.

The source catalogue is split into five files under [`data/`](data/README.md). Stable Oriel `Preference` identifiers are preserved to keep existing shortlist and cloud records connected. To regenerate the catalogue from a new export, run:

```bash
python3 scripts/build_catalogue.py "pharmacy programmes.csv"
```

## Technical overview

**Frontend:** vanilla JavaScript, HTML and CSS · **Maps:** Leaflet, MapLibre GL and OpenFreeMap · **Optional accounts/sync:** Supabase · **Hosting:** GitHub Pages · **Dataset preparation:** Python 3.

No framework build is required to run the static frontend. Programme records are parsed from the owner-provided CSV; applicant decisions are maintained separately from the public catalogue.

**Validation:** GitHub Actions runs dataset-integrity, shortlist, privacy and source-independence tests, followed by Playwright browser checks covering map rendering, themes and programme interactions.

```bash
node --test tests/catalogue-parser.test.cjs tests/independence.test.cjs tests/shortlist.test.js tests/research.test.js
```

The original development history is preserved in Git; ongoing maintenance, technical dependencies and relevant attribution are documented in [third-party notices](THIRD_PARTY_NOTICES.md) and [implementation notes](docs/IMPLEMENTATION_NOTES.md).

For a safe repository rename or future custom domain, see [deployment and URL migration](docs/DEPLOYMENT_AND_RENAME.md).

The full feature and development scope is in the [portfolio and LinkedIn feature inventory](docs/PRODUCT_FEATURE_INVENTORY.md).

## Product direction

Next priorities include improving commute comparisons, distinguishing missing data from negative signals, further explaining score components and conducting structured usability sessions with other applicants. These are future goals, **not features or research outcomes being claimed today**.

---

**Developed and maintained by Phivos Michailides.** Created through iterative product design, real applicant feedback and AI-assisted software development.
