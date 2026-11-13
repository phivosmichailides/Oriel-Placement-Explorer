# Placement Atlas product vision — 12 November 2026

This is a **product specification**, not a list of shipped features.

## Product experience
Editorial, smooth, concise; rounded components; calm accents; mobile and dark/light parity. Avoid duplicated navigation and unnecessary account copy. Signed-in avatar/name is the single header route to Profile. Keep Learning Hub in the main navigation; make the original Oriel advice a secondary Guidance & advice view.

## Member identity
- First and last names allow Unicode (at least two characters).
- Username: globally unique lowercase Latin letters, numerals, underscores; 5–15 characters, starts with a letter. DB uniqueness authoritative; inline availability, suggestions and race error handling.
- DOB, university and study year (Year 1–4 and Pre-Reg); these are **private**. The username is a public handle for eventual discovery, messaging, sharing and forums.
- Avatar photo optional now; future interactive character creator (hair, eyes, skin tones, hair coverings including hijabs, clothes). "Pharmatar" is a working title, not final.
- Later member discovery, chat, moderation, reporting/blocking and optional shared overhead 3D world. Privacy/consent controls before any networking launch.

## Learning Hub
- Landing supports pharmacy education throughout MPharm and the foundation training year, with eventual GPhC registration assessment preparation.
- Study spaces planned: year-specific contents and obligations, reminders, flashcards, drug formulary exercises, quiz answer validation with green/near-correct/red feedback, pharmacy counter and OSCE simulations, patient counselling, prescription checking, reflective portfolio and a **private autosaving rich-text diary**. Diary should have dated titled entries, font choices, formatting, reliable draft recovery, safe HTML sanitisation, account sync and portfolio export.
- Original Oriel and training-setting guidance is a **secondary** view.

## Source documents supplied for clinical learning design
1. **UCL MPharm Top 100 Drugs 2025–26** — 100-drug teaching list grouped by Years 1, 2 and 3, with NEW replacements identified; stray "#REF!" cell is not a medicine.
2. **UCL Top 100 Drugs Formulary Template (2024–25)** — drug class, specific mechanism of action, physicochemical property, indications, adult dose, frequency, formulations, adverse effects, cautions, contraindications, similar drugs, counselling, paediatric dosing/uses, mode of action (overlaps with specific mechanism), guidelines and references. Preserve all prompts until overlap resolved.
3. **GPhC Standards for Pharmacy Professionals (May 2017)** — nine professional standards, including person-centred care, working with others, communication, knowledge, judgement, professional behaviour, confidentiality, raising concerns and leadership. These professional standards are not a current assessment blueprint.

Clinically grading drug answers requires a reviewed, versioned answer key referencing appropriate current sources; do not rely on fuzzy matching where dose, units, formulations, contraindications or clinical contexts differ. Never encourage patient-identifying details in diary entries.

## Delivery stages
- Stage 1: sign-in polish, database-enforced unique handles, member onboarding, single header profile entry, Learning Hub home and Guidance view.
- Stage 2: reliable autosaving diary and drug-formulary drafts, private cloud sync, backup/restore and accessibility tests.
- Stage 3: vetted clinical answer keys, flashcards, OSCE, prescription and pharmacy-service simulations.
- Stage 4: avatar character editor and opt-in social network once safe messaging and privacy infrastructure exists.

Keep user rankings, placement identifiers, Oriel simulator and cloud workspaces unchanged by the member rollout.
