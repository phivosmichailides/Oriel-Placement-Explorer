# Oriel Placement Desk — by Phivos

A personalised decision tool for exploring, comparing and ranking **England & Wales Foundation Pharmacy training programmes** from Oriel.

**Live app:** https://phivosmichailides.github.io/Oriel-Placement-Explorer/

## Try it in two minutes

Open the app, personalise your region and priorities, inspect a recommendation and save it with the **Prefer** button. Add two programmes to **Compare**, then use **Shortlist** to order and export choices. Preferences includes map colours and the optional study; Explore includes distance filtering.

## The problem I was trying to solve

The England & Wales Foundation Pharmacy recruitment process gives applicants a very large number of Oriel programmes to consider. The difficult part is not simply accessing the information — it is deciding what deserves attention when thousands of programmes differ across location, salary, working hours, hospital/GP/community exposure, career value and other trade-offs.

The built-in October 2026 England & Wales snapshot contains **4,064 programmes across 12 regions**, including **786 programmes labelled London**.

I have ADHD, and this kind of high-volume decision becomes much harder when every field is presented with equal visual weight and I have to keep too many criteria in my head at once. I wanted a cleaner experience that could progressively reduce the information into a decision I could actually make.

## What I built

I started with [Acid555’s open-source Oriel Placement Explorer](https://github.com/Acid555/Oriel-Placement-Explorer), which provided a useful starting dataset and explorer. I then rebuilt the active experience around the decision problem I personally needed to solve, using AI-assisted development throughout the process.

The public experience starts across England & Wales. A short setup lets each applicant choose a region, priorities and practical limits. My own search is London-focused, but personal defaults should not become product limitations.

The current Placement Desk adds:

- a five-step setup and personalised fit score driven by adjustable priorities;
- consistent salary and hours limits across exploration and recommendations;
- explicit **“why it could fit”** and **“trade-offs to check”** explanations rather than a score with no reasoning;
- region-aware recommendations across all 12 England & Wales regions;
- an interactive map kept in sync with the selected region and filtered programme list;
- on-demand postcode lookup for programme locations not already cached;
- filtering for hospital, GP, hospital+GP, industry, lower-community exposure, desk/independent-work signals, CV-building signals, hours and pay;
- salary and effective hourly-pay comparisons;
- training-place counts where Oriel states them;
- shortlist, exclusion and decision states such as **Love, Strong yes, Maybe, Backup and Absolutely not**;
- ratings, notes and manual priority numbers;
- side-by-side programme comparison;
- ranked-shortlist export;
- local backup and restore;
- session undo/redo for decisions and preferences;
- custom map colours and a straight-line radius filter around a postcode or chosen map point;
- archived local study exports/imports; the previous button experiment is paused following usability feedback;
- CSV upload so a newer England & Wales Oriel export can replace the built-in snapshot.

The scoring is deliberately a **heuristic, not a black-box prediction**. It uses the available programme text and structured fields to surface options worth looking at, while keeping the user in control of the final decision.

## Real use, not a theoretical portfolio project

I am using the product during my own live Oriel application.

My 13 October export contained **25 programmes already saved in an official preference order** and **566 programmes still marked “No Preference”**. I imported those states into the tool so that the product reflects the actual stage of my application rather than a fabricated demo.

Using it myself has repeatedly exposed problems that I then fixed. Recent iterations have included:

- rebuilding the personalised Placement Desk from scratch;
- restoring the interactive map and a reliable shortlist workflow;
- improving mobile cards;
- making map pins keyboard accessible;
- refining recommendation filters and recommendation UX;
- importing my current ranked Oriel choices;
- adding a dedicated review filter for the 566 programmes I still need to classify;
- separating my **London default** from the underlying product logic so the same experience works across every region in the England & Wales dataset.

That feedback loop is the part of the project I find most valuable: **use the product, notice where the decision still feels difficult, then redesign that part.**

## Product principles

### 1. Reduce overload
The interface should surface the information most relevant to the current decision instead of treating every field as equally important.

### 2. Explain recommendations
A user should be able to understand why an option is being surfaced. The app therefore shows positive signals and trade-offs alongside the fit score.

### 3. Personalisation should change the product
Location, pay, hospital/GP exposure, lifestyle, transferable career value, independence and community-pharmacy exposure feed into adjustable scoring rather than existing as decorative preferences.

### 4. Personal defaults should not become product limitations
My own application is London-focused. The product itself works across the full England & Wales dataset and adapts recommendations, statistics and mapping to the region being explored.

### 5. Preserve user control
The tool can recommend, but it should not silently make a high-stakes career choice. Users can override, shortlist, exclude, annotate, compare and manually rank programmes.

### 6. Build from real behaviour
The product is being designed around an actual live decision process, not around a hypothetical persona.

## Measurement and independent user testing

The project now includes the infrastructure to test whether new applicants can reach a useful shortlist. **External usability testing has not yet been run, and no activation uplift or retention result is claimed.** My own use remains discovery evidence, separate from independent validation.

The first planned round is five applicant sessions, measuring independent task completion, time to first save, understanding of trade-offs and points of friction. The previous “Prefer” versus “Save to shortlist” experiment is paused. All visitors now see “Add to shortlist”; historical results remain exportable, and new events are not added to those sessions. QA sessions are excluded from historical reports.

Reported usability feedback prompted clearer shortlisting, fewer decorative emojis and explanations of export and backup. This feedback does not establish an activation or retention improvement.

Study data stays in the participant’s browser unless they deliberately export and share it. It contains action names and timing, not programme IDs, notes, searches or postcodes. The local report deduplicates browser IDs and makes pending observation windows explicit. This is a recruited-study tool, not site-wide analytics.

- [Research plan, PRD, metrics and experiment rules](docs/RESEARCH_PLAN.md)
- [Implementation decisions, AI-assisted workflow and verification](docs/IMPLEMENTATION_NOTES.md)
- After deployment: [join the optional study](https://phivosmichailides.github.io/Oriel-Placement-Explorer/?study=1). Use `?study=qa` for practice runs.

## What I want to build next

The next stage is deeper personalisation and clearer decision support:

- run the first independent usability sessions and prioritise observed friction;
- assess whether applicants understand the existing reasons and trade-offs;
- cleaner commute and area context rather than postcode alone;
- better distinction between **unknown data** and a genuinely negative signal;
- stronger explanation of how each recommendation score was formed;
- a clearer final-review mode for resolving remaining undecided programmes.

The long-term goal is simple: a user should be able to open a programme and quickly understand **why it may suit them, what they would be compromising on, and what still needs checking before they rank it**.

## Data and technical notes

The current site is a static GitHub Pages app with no build step.

Active interface files:

- `index.html`
- `app.js`
- `app-base.js`, `app-product.js`, `generic-public.js`
- `onboarding.js`, `sector-map.js`, `deadline-dates.js`
- `desk-enhancements.js`
- `research-core.js`, `research.js`
- `desk.css`

Leaflet 1.9.4 powers the map and OpenStreetMap provides background tiles. The October 2026 project includes a cache of resolved programme postcodes, with additional locations resolved on demand through postcodes.io when a user explores another region.

Decisions are stored locally in the browser under the `phivos-desk-v2` key. They are not synced to GitHub or submitted to Oriel. Backup/restore is available before changing devices or clearing browser data. Optional study data uses a separate `oriel-research-v1` key and separate export; it is not included in ordinary desk backups. Radius centres and undo history last only for the current page session.

## Important limitations

This project covers the **England & Wales programme dataset supplied to the app**. It should not be presented as a complete UK pharmacy training directory.

This is a personal decision-support tool, not an official NHS or Oriel service. Recommendation scores are based on available structured fields and text signals. They are **not** verified predictions of workload, autonomy, culture, commute quality or programme eligibility. Salary, sponsorship and programme details should be checked against the current Oriel listing and employer information before making a final decision.
