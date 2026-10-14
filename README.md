# Phivos’ Placement Desk

A personalised decision tool for choosing and ranking NHS pharmacy foundation training programmes through Oriel.

**Live app:** https://phivosmichailides.github.io/Oriel-Placement-Explorer/

## The problem I was trying to solve

Oriel is the NHS recruitment platform pharmacy students use to preference foundation training programmes. The underlying information is extensive, but the difficult part is not finding more data — it is deciding what deserves attention when thousands of programmes differ across location, salary, working hours, hospital/GP/community exposure, career value and other trade-offs.

The built-in October 2026 snapshot contains **4,064 programmes**, including **786 labelled London**. **760 London postcode locations** have been resolved for the map.

I have ADHD, and this kind of high-volume decision becomes much harder when every field is presented with equal visual weight and I have to keep too many criteria in my head at once. I wanted a cleaner experience that could progressively reduce the information into a decision I could actually make.

## What I built

I started with [Acid555’s open-source Oriel Placement Explorer](https://github.com/Acid555/Oriel-Placement-Explorer), which provided a useful starting dataset and explorer. I then rebuilt the active experience around the decision problem I personally needed to solve, using AI-assisted development throughout the process.

The current Placement Desk adds:

- a personalised fit score driven by adjustable priorities;
- explicit **“why it could fit”** and **“trade-offs to check”** explanations rather than a score with no reasoning;
- an interactive London map kept in sync with the filtered programme list;
- filtering for hospital, GP, hospital+GP, industry, lower-community exposure, desk/independent-work signals, CV-building signals, hours and pay;
- salary and effective hourly-pay comparisons;
- training-place counts where Oriel states them;
- shortlist, exclusion and decision states such as **Love, Strong yes, Maybe, Backup and Absolutely not**;
- ratings, notes and manual priority numbers;
- side-by-side programme comparison;
- ranked-shortlist export;
- local backup and restore;
- CSV upload so a newer Oriel export can replace the built-in snapshot.

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
- adding a dedicated review filter for the 566 programmes I still need to classify.

That feedback loop is the part of the project I find most valuable: **use the product, notice where the decision still feels difficult, then redesign that part.**

## Product principles

### 1. Reduce overload
The interface should surface the information most relevant to the current decision instead of treating every field as equally important.

### 2. Explain recommendations
A user should be able to understand why an option is being surfaced. The app therefore shows positive signals and trade-offs alongside the fit score.

### 3. Personalisation should change the product
Location, pay, hospital/GP exposure, lifestyle, transferable career value, independence and community-pharmacy exposure feed into adjustable scoring rather than existing as decorative preferences.

### 4. Preserve user control
The tool can recommend, but it should not silently make a high-stakes career choice. Users can override, shortlist, exclude, annotate, compare and manually rank programmes.

### 5. Build from real behaviour
The product is being designed around an actual live decision process, not around a hypothetical persona.

## What I want to build next

The next stage is deeper personalisation and clearer decision support:

- a lightweight onboarding flow that asks what matters most before showing recommendations;
- more explicit programme-level pros and cons based on the user’s own criteria;
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
- `app-base.js`
- `desk.css`

Leaflet 1.9.4 powers the map and OpenStreetMap provides background tiles. London postcode coordinates were resolved using postcodes.io for the October 2026 update.

Decisions are stored locally in the browser under the `phivos-desk-v2` key. They are not synced to GitHub or submitted to Oriel. Backup/restore is available before changing devices or clearing browser data.

## Important limitations

This is a personal decision-support tool, not an official NHS or Oriel service.

Recommendation scores are based on available structured fields and text signals. They are **not** verified predictions of workload, autonomy, culture, commute quality or programme eligibility. Salary, sponsorship and programme details should be checked against the current Oriel listing and employer information before making a final decision.
