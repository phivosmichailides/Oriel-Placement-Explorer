# Placement Desk: first-use study and experiment

Status: implemented instrumentation; external user study not yet run. No activation, retention, satisfaction or uplift result is claimed.

## Product question and PRD

Can a first-time pharmacy applicant move from an overwhelming programme list to one option they would seriously consider, understand its trade-offs, and keep it for later?

**Audience:** England & Wales Foundation Pharmacy applicants. Recruit across at least two regions and include mobile users. The creator's personal use is useful discovery evidence but does not substitute for independent testing.

**Primary journey:** consent to optional study → personalise → see matches → inspect a programme → save to shortlist → compare → export. Users can skip setup and still participate; successful activation does not require completing every preceding step.

**Scope:** correct region and hard-limit handling, stable fit scores, a smaller post-setup introduction, reversible decisions, configurable map colours, radius-based discovery, and local opt-in study logging. No accounts, automatic submission to Oriel, automatic research uploads, commute estimates or invented user outcomes.

**Acceptance criteria:**

- Salary and hours limits constrain both Explore and For You; an empty recommendation set explains how to broaden it.
- Opening a recommendation preserves its score and applicable region/limits.
- Undo and redo reverse decisions, notes, manual ranks, comparison selections and preferences during the current session. A new edit clears redo. Dataset changes reset history.
- Map colour choices persist with preferences. A postcode or map point can centre a straight-line radius; any known rotation inside qualifies, and unlocated programmes are explicitly excluded.
- No study recording before consent; no programme, search, postcode, note, address, preference or uploaded-CSV content appears in study exports.
- QA and returning-user sessions do not enter the new-user experiment denominator. Repeated exports of one browser ID are deduplicated.

## Run the first five usability sessions

Use the live app with `?study=1` after this version is deployed. Use `?study=qa` for development checks; these exports are excluded from experiment analysis. Recruit five actual applicants for 15–20 minute sessions. Do not claim the five-person pilot is a statistically powered A/B test.

1. Explain what is recorded and let the participant choose whether to join. Recording the screen or conversation requires separate agreement; the app does neither.
2. Ask: “Find a programme you would seriously consider. Tell me what you are thinking as you go.” Do not explain which button to press.
3. Ask them to set their real preferences, explain one positive and one caution, save an option, compare two options, undo an accidental choice, and export a shortlist.
4. Separately ask them to try a map colour and a distance filter. Check whether they understand straight-line distance and multi-site rotations. These are secondary tasks after the main activation task.
5. If stuck, record the point of difficulty before helping. Record assistance as assistance, not independent success.
6. Ask the two in-app feedback questions. Ask verbally: “What almost made you stop?” and “What would you change first?” Keep identifying details out of the repository.
7. Ask for a study export even if the task failed. Keep a recruitment log of everyone who started, including people who do not send a file. Missing exports create selection bias.
8. Invite a fresh export at least 14 days later. A return is only observable if the participant comes back with the same browser storage and shares a later export.

A participant can export via Preferences → Help improve this desk. The researcher can import several files in the same panel; analysis happens locally. Do not commit participant exports or identifiable interview notes to this public repository.

### Observation template

| Field | Record after each real session |
|---|---|
| Participant code | A non-identifying code; store contact details separately |
| Date, device, region breadth | Context without address or exact postcode |
| Prior use | First-time / returning |
| Task result | Independent success / assisted / partial / blocked |
| Time to first useful save | Measured value, or not completed |
| Understanding | Can explain score limits and one trade-off? |
| Main friction | Observed action and short consented quote |
| Feedback | Ease 1–5, seriously-consider answer |
| Export received | Yes / no; retain missingness in the denominator log |
| Next decision | Specific fix, hypothesis, or no change |

## Measurement dictionary

Study unit: one consented browser installation, identified by a random ID, not a verified unique person. Clearing storage or changing browser can produce another unit. A session ID lasts in tab session storage, including reloads, and renews when an app load or action follows at least 30 minutes of study inactivity. Event times are wall-clock times and include inactive time.

| Event / metric | Exact meaning |
|---|---|
| `session_started` | First study event in a tab session; only after consent |
| `onboarding_started`, `onboarding_skipped` | Setup opened or dismissed |
| `onboarding_step_completed` | Continue used on steps 1–5; does not contain answers |
| `onboarding_completed` | Setup answers applied |
| `matches_viewed` | For You tab selected; not merely rendered offscreen |
| `programme_opened` | Recommendation opened in Explore |
| `experiment_exposed` | At least half a shortlist button becomes visible; once per study |
| `shortlist_added`, `shortlist_removed` | Decision changes between non-shortlisted and shortlisted states; no programme ID |
| `comparison_viewed` | Compare opened with at least two selected programmes |
| `shortlist_exported` | Nonempty ranked-shortlist download initiated; does not prove a file was kept or submitted to Oriel |
| `feedback` | Ease 1–5 and seriously-consider answer yes/partly/no |
| Activation | First `shortlist_added` within 30 minutes of enrolment; a behavioural proxy, not proof of a good career decision |
| Time to activation | Elapsed seconds from enrolment to first save, among activated participants only |
| Return use | Any `session_started` 7 to under 14 days after enrolment, assessed only on an export at least 14 days after enrolment |

New-user cohort operationally means no completed onboarding and no saved shortlist at enrolment. It cannot prove the person has never visited. All other consenting users can provide usability feedback but are excluded from the new-user experiment table. App reloads preserve assignment and identity. Study logs cap at 5,000 events; truncated records are excluded from comparison.

## Experiment: shortlist-cta-v1

**Hypothesis:** replacing the ambiguous “Prefer” button with a more prominent “Save to shortlist” button helps new visitors recognise how to keep an option, increasing first-save activation without reducing decision confidence.

**Control:** existing “♡ Prefer” button. **Treatment:** “Save to shortlist” with primary styling and “✓ Saved · undo” after selection. This tests copy and prominence together; it cannot isolate which caused a difference. Other scoring and programme data are identical between arms.

Assignment: 50/50 using browser cryptographic randomness after consent; stable for the browser study. No query parameter forces an arm. A tester may clear local data for QA, but such repeat units must not enter a real study.

Primary metric: activated / assessable new-user units in each arm. Early exports without a save remain pending until the 30-minute window expires. Primary reporting is by assignment, including units without observed button exposure; report exposure separately. Report enrolled, pending and missing exports beside rates. Do not selectively remove difficult sessions.

Guardrails: observed accidental saves and undo/removal behaviour, ability to explain trade-offs, feedback ease and seriously-consider answers, comparison and export completion, and functional errors. A clearer button should not merely produce meaningless clicks.

Pilot decision rule: after five usability sessions, fix blocking defects and misunderstood actions first. Report qualitative findings and raw counts only. Do not choose an A/B winner from a handful of participants.

Before a larger experiment, use pilot baseline activation, a practically worthwhile minimum effect and recruitment capacity to set sample size, end date and an analysis plan **before** starting. Freeze this version during that run. Review both arms at the planned endpoint; do not repeatedly check and stop when one happens to lead. The built-in table is descriptive and does not calculate significance or declare uplift.

## Evidence and iteration log

| Date | Evidence | Interpretation | Action / status |
|---|---|---|---|
| 2026-10-15 | Review found score changes on opening recommendations, ignored salary/hours limits in For You, and leftover personal-export wording | Trust and first-use clarity risks; not a measured conversion effect | Fixes implemented; regression checks documented separately |
| Not run | Independent applicant sessions | No external usability conclusion yet | Recruit five applicants after release |
| Not run | Controlled experiment | No uplift or winning variant established | Pilot instrumentation, then predefine a larger test if recruitment supports it |
| Not observed | Return-use cohort | No retention claim | Invite follow-up exports after 14 days |

After each round, add actual sample size, date, task results, missing exports, observed failures, what changed and what remains uncertain. An honest small study is stronger evidence than fabricated traction.
