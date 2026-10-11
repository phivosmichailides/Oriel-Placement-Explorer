# Phivos’ Placement Desk

A personal Oriel decision tool based on [Acid555’s Oriel Placement Explorer](https://github.com/Acid555/Oriel-Placement-Explorer).

**Live app:** https://phivosmichailides.github.io/Oriel-Placement-Explorer/

## Using it

- Explore starts with London selected and hides excluded programmes and your avoided areas. Filters can reveal them again.
- The interactive map and list use the same filters. Click a pin to see all programmes at that location. Multiple sites are shown where postcodes are supplied.
- **Prefer** adds a programme to your shortlist; **Exclude** removes it from active results and recommendations. The decision dropdown also offers Love, Maybe, Backup and Absolutely not.
- Use up/down arrows or positive priority numbers to arrange the shortlist. **Export ranked shortlist** preserves that displayed order. Transfer final choices into Oriel yourself; this app does not submit them.
- Compare up to five programmes; annotate decisions and give personal ratings.
- **Backup** downloads decisions and any uploaded data. **Restore backup** validates and merges a v2 backup; matching decisions and preferences use the backup values.
- Upload a recent Oriel CSV to replace the built-in snapshot. Programme IDs anchor saved decisions.

## Personalisation and limits

Salary and hourly pay, hospital/GP exposure, hours, London area preferences, transferable experience and independent-work keywords contribute to adjustable scores. The score is a heuristic, not a prediction of workload, job quality, autonomy, or eligibility. Missing salary is marked as unknown.

The sponsorship filter reports the CSV field only. It does not determine personal visa eligibility. Area matching uses programme title and area rather than incidental mentions in long descriptions. It is approximate, not a transport-zone or commute calculation. Hospital, GP and industry quick filters are OR alternatives; the other filters are combined with AND.

The original snapshot contains 4,064 programmes, including 786 labelled London. 760 London postcode coordinates were resolved using postcodes.io for the October 2026 update. Unknown/retired postcodes remain visible in the list. **Locate missing** requests remaining postcode coordinates, including for newly uploaded files or other regions. The background map uses OpenStreetMap; the list and cached pins remain usable if tiles fail.

## Storage and deployment

Static GitHub Pages site from `main`, no build step. `index.html`, `app.js` and `desk.css` form the active interface; `vendor/` contains Leaflet 1.9.4 and its licence. `legacy.html` preserves the original interface and CSV snapshot. Older `core.js`, `ui.js`, and `styles.css` are retained but are not loaded by the current page.

Decisions are stored under the existing `phivos-desk-v2` browser key. They are local to the browser, not synced to GitHub or Oriel. Use Backup before changing devices or clearing browser data. No personal decisions or notes are committed to this public repository.
