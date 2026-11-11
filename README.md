<div align='center'>
  <img src='icons/placement-atlas-192.png' width='88' alt='Placement Atlas logo'>
  <h1>Placement Atlas</h1>
  <p><strong>Explore more clearly. Compare what matters. Rank with confidence.</strong></p>
  <p>An independent decision-support platform for exploring, personalising and comparing Foundation Pharmacist Training programmes across England and Wales.</p>
  <p>
    <a href='https://placementatlas.co.uk/'><strong>Open Placement Atlas</strong></a>
    &nbsp;·&nbsp;
    <a href='https://placementatlas.co.uk/guide.html'>Explore the comparison guide</a>
    &nbsp;·&nbsp;
    <a href='https://github.com/phivosmichailides/Placement_Atlas/discussions'>Share feedback</a>
  </p>
</div>

> **Independent project.** Placement Atlas is not affiliated with, endorsed by, or connected to UCL, NHS England or the Oriel recruitment service. It does not submit, edit or change official Oriel preferences.

## A better way to make a consequential choice

Foundation training applicants face thousands of programme details, different employers and training settings, uneven descriptions, pay and hours, multiple locations and competing personal priorities. A spreadsheet can list those details; it is much harder to use one to understand the trade-offs and build a considered shortlist.

Placement Atlas turns that process into an interactive workspace. Applicants can explore the catalogue, define what matters to them, understand why a programme may or may not suit them, inspect locations, compare options and organise their own ranking — while keeping the final decision in their hands.

## At a glance

| Programme catalogue | Coverage | Decision tools | Experience |
| --- | --- | --- | --- |
| **4,064 programmes** | **12 regions** across England and Wales | Explore, personalise, shortlist, compare and simulate | Responsive, installable web app |

The built-in catalogue is based on an **Oriel data export supplied to the project on 7 November 2026**. It is a dated snapshot, not a live vacancy feed or a statement of current offer availability.

## What you can do

### 1. Explore the full programme catalogue

- Browse the included England and Wales catalogue or search by programme, employer, location and descriptive details.
- Filter by region, training setting, salary, weekly hours, sponsorship information and other programme characteristics.
- Explore hospital, general practice, community, industry and mixed or split-setting programmes.
- Narrow results using specialist-setting indicators, location preferences, postcode information and distance filters.
- Switch between list and grid layouts, sort results and collapse the filter workspace when you want more room to browse.
- Scan compact programme cards with gross salary, estimated monthly take-home, training setting, recorded rotations and available places. Expand a programme into five sections: **Overview**, **Training & dates**, **Pay & eligibility**, **Locations & commute** and **My assessment**.
- Reveal the original Oriel programme title on demand when a concise display title is used.

### 2. Personalise recommendations — and understand the reasons

A guided setup lets applicants describe the things that matter to them, including preferred region, training environment, community-pharmacy exposure, salary, working hours, location and wider career priorities. The profile can be revisited as priorities change, and preference weights can be adjusted.

The **For You** experience ranks relevant programmes across England and Wales against those choices and explains the signals behind each recommendation. It is not restricted to a fixed city.

A key design decision is that the explanation changes with the applicant:

- **Before personalisation:** programme cards show general programme highlights and potential trade-offs, rather than pretending to know what an individual wants or presenting an unearned personal-fit score.
- **After personalisation:** the card changes to **Why it fits you** and **Trade-offs for you**. Positive signals and cautions are selected in relation to the applicant’s stated preferences.
- **Preference-aware explanations:** for example, substantial GP exposure is not presented as a benefit to someone who has said they do not want GP training; a hospital-heavy programme can instead be identified as a trade-off for someone seeking community-heavy experience.

Personal fit is a transparent heuristic based on available programme information and the applicant’s own settings. It is not a verified rating of an employer or a guarantee of workplace quality.

### 3. Explore training locations and commutes

- Interactive map and programme results stay connected as filters change; changing the selected region fits the map to the matching programme locations.
- Setting-aware programme markers help distinguish hospital, GP, community and other placement types.
- Custom editorial light and dark map styles, with fallback rendering paths when a map provider or renderer is unavailable.
- Programme-specific location previews for multi-site and split placements, with controls to move between training locations and open external map directions.
- Tube and rail-station context to help applicants understand the surrounding transport network.
- Optional home-postcode profile, postcode lookup and straight-line distance filtering.
- Where the relevant postcodes and service are available, indicative public-transport comparisons use a typical weekday 08:00 journey through the TfL Journey Planner.

Distance filtering and journey estimates are deliberately treated as different things: a straight-line radius is not a journey time, and a sample itinerary is not a promise about a future rota.

### 4. Make decisions in a swipe-based workflow

**Tinder Mode** presents one programme at a time so applicants can make decisions without repeatedly scanning a long list. It combines swipe interactions with clear on-screen controls, distinct visual feedback, decision filters and an undo path.

Applicants can organise programmes into states such as **Love**, **Strong yes**, **Maybe**, **Only if needed**, **No** and **Absolutely not**. The focused workflow can also filter by setting, minimum salary, maximum hours, split placements and whether a programme has already been decided.

### 5. Build and manage a ranked shortlist

- Save, exclude and revisit programmes without losing the wider catalogue.
- Assign decision states, add personal notes and set manual priorities.
- Reorder the shortlist and review the current ranking.
- Compact shortlist cards keep priority, status, notes and comparison controls accessible; rotation facts and fit explanations can be expanded when needed.
- Compare up to five selected programmes side by side.
- Hide already-shortlisted or excluded items when you want a cleaner discovery view.
- Undo and redo recent changes, with saved decisions kept separately from the temporary browsing session.
- Export ranked preferences or decisions, and create a downloadable backup that can later be restored.

### 6. Plan the application process

**Oriel Simulation** provides a separate practice workspace for organising programmes into preferred, neutral and unwanted groups. Applicants can move programmes between columns, reorder their choices, import shortlisted programmes and export a hypothetical ranking. The simulation is kept separate from the main shortlist and does not communicate with or update Oriel.

**My Outcome** provides a private place to record an application outcome, relevant programme, dates, response deadline and personal notes. It is a tracking aid, not an official recruitment record.

### 7. Compare pay and working patterns

Programme cards surface stated salary and weekly hours, with gross hourly comparisons where the source data permits. An optional take-home-pay estimator provides illustrative calculations using configurable pension and student-loan assumptions. These figures are estimates, not payroll advice or a promise of an individual payslip.

### 8. Make the workspace your own

- Six restrained editorial palettes, light and dark appearance modes, neutral charcoal or warm off-white surfaces, and coordinated map styling.
- The main navigation prioritises Explore, Shortlist and My Outcome, with Oriel Simulation, Tinder Mode and Preferences available under **More**.
- Responsive layouts for desktop and mobile, with list/grid controls and adjustable workspace zoom.
- An installable Progressive Web App, with a service worker that caches the application shell and selected resources for more reliable repeat visits and limited offline use.
- Local browser saving, downloadable backup/restore and optional signed-in Supabase cloud synchronisation for supported workspace data.

Live maps, postcode and transport lookups, authentication and other third-party services may still require an internet connection.

## How it works

1. **Start broad.** Explore all included programmes or select a region and a few initial filters.
2. **Set your priorities.** Complete the personalisation setup and adjust the criteria that matter to you.
3. **Review the evidence.** Read programme details, location information, fit explanations and trade-offs.
4. **Make decisions.** Use Explore or Tinder Mode to classify programmes and build a shortlist.
5. **Compare and rank.** Review up to five programmes together, add notes, set priorities and export your decisions.
6. **Keep control.** Save locally, create a backup, or use optional account-based synchronisation where enabled.

## Why I built it

I am a UCL MPharm student, and I built Placement Atlas after experiencing first-hand how difficult it can be to make a well-informed foundation-training decision from thousands of programme listings. The information existed, but the process of comparing it, relating it to personal priorities and turning it into a coherent ranking was fragmented.

I wanted to approach that problem as a product-design and decision-support challenge, not simply create another spreadsheet or static directory. The project brings together pharmacy and healthcare context with data preparation, structured programme modelling, product strategy, interaction design, geospatial exploration, pay and commute calculations, workflow design and software quality assurance.

I lead the product direction: identifying friction, defining requirements, deciding what the experience should do, prioritising changes, evaluating outputs and iterating against real use. Development has involved **AI-assisted software implementation**, alongside hands-on testing and refinement. The emphasis is on the problem, the product decisions and the working experience — not on claiming that every line of code was written manually.

The principle behind the product is simple: **make the options easier to understand, make the trade-offs visible, and leave the decision with the applicant.**

## Data, privacy and limitations

- **Catalogue source:** an October 2026 Oriel export compiled into the public programme dataset. The catalogue contains 4,064 programmes across 12 England and Wales regions; it is not a live feed.
- **Always verify:** programme descriptions, salaries, places, sponsorship information, training sites and recruitment dates can change. Applicants should check current details with the official listing and employer before making decisions.
- **Fit explanations:** scores and supporting signals are generated from available programme fields and user-defined priorities. They cannot establish actual workload, autonomy, supervision, culture, eligibility or the quality of a placement.
- **Incomplete locations:** a programme may include several rotations or sites, and not every site may have a usable postcode. A map pin or distance filter may therefore show only part of the picture.
- **Commute guidance:** straight-line distances are not journey times. TfL estimates use a consistent sample journey and may differ from a real commute, timetable, rota or service disruption.
- **Pay estimates:** calculations depend on the assumptions selected and the tax, pension and student-loan rules used. Individual circumstances and employer arrangements can produce different payslips.
- **Simulation:** the Oriel Simulation is an independent practice tool. It is not the official Oriel allocation algorithm, a prediction of an offer or an integration with the recruitment service.
- **Applicant decisions:** the built-in public catalogue does not contain applicants’ private shortlist rankings, notes or personal tags. The application does not submit or change official Oriel preferences.

Without cloud synchronisation, supported decisions are saved in the current browser. Optional Supabase account synchronisation stores supported workspace data against the signed-in account; local backups remain useful and should be kept separately. Postcode, map, transport and authentication requests may be processed by the relevant external providers. See [third-party notices](THIRD_PARTY_NOTICES.md) and the [cloud account notes](supabase/README.md).

## Technology and implementation

| Area | Technologies and approach |
| --- | --- |
| Frontend | HTML, CSS and modular vanilla JavaScript; no framework build step |
| Mapping | Leaflet, MapLibre GL, custom MapTiler styles and fallback map rendering |
| Location and transport | Postcodes.io lookups, TfL Journey Planner, bundled Tube and rail-station data |
| Accounts and persistence | Supabase Auth, Postgres workspace storage and Row Level Security policies |
| Data preparation | Python 3 catalogue-processing script; stable Oriel programme identifiers |
| Hosting and delivery | GitHub Pages, custom domain and installable PWA/service worker |
| Quality assurance | Node.js integrity tests, GitHub Actions and Playwright browser smoke tests |

### Repository structure

```text
data/                 Programme catalogue and supporting geographic data
map-styles/           Custom editorial light and dark map styles
supabase/             Workspace database migration and RLS verification notes
tests/                Catalogue, independence, location, shortlist and browser tests
docs/                 Implementation, deployment and product notes
index.html             Application entry point
app-base.js            Core catalogue, filtering and shortlist logic
app-product.js         Programme cards and preference-aware fit explanations
tinder-mode.js         Swipe-based decision workflow
simulator.js           Separate Oriel practice simulation
sw.js                  Offline application-shell caching
```

### Local preview

The frontend is a static application. To run a local preview:

```bash
git clone https://github.com/phivosmichailides/Placement_Atlas.git
cd Placement_Atlas
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Optional account sign-in, postcode lookups, map tiles and transport features depend on their respective service configuration and availability.

### Automated checks

GitHub Actions runs catalogue-integrity and application tests, followed by Chromium browser checks for key programme, shortlist, map and theme interactions. The current Node test suite can also be run locally:

```bash
node --test tests/catalogue-parser.test.cjs tests/independence.test.cjs tests/location-guidance.test.cjs tests/research.test.js tests/shortlist.test.js
```

Passing automated checks is useful evidence of tested behaviour, not a claim that every browser, device, external service or applicant workflow is flawless. See [implementation notes](docs/IMPLEMENTATION_NOTES.md) for the scope and limitations of the checks.

## Status and feedback

Placement Atlas is a working, actively refined independent product. The core experience is functional, and I continue to improve the data presentation, usability, reliability and personalisation. It is not presented as a finished official recruitment platform.

Feedback is welcome — particularly from foundation-training applicants, pharmacists, educators and people working in product, data or software. Suggestions, usability observations and bug reports help identify what should improve next.

- [Try the live application](https://placementatlas.co.uk/)
- [Read the comparison guide](https://placementatlas.co.uk/guide.html)
- [Open GitHub Discussions](https://github.com/phivosmichailides/Placement_Atlas/discussions)
- [Connect on LinkedIn](https://www.linkedin.com/in/phivos-michailides-601b0329b/)

## Credits and notices

Placement Atlas is developed and maintained by **Phivos Michailides**. It uses third-party libraries, geographic datasets and external services; relevant licences, attribution and service notes are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

<div align='center'>
  <strong>Placement Atlas</strong><br>
  Explore more clearly. Compare what matters. Rank with confidence.
</div>