# England & Wales Oriel programme catalogue (2026 export)

**Primary source:** direct Oriel pharmacy-programmes CSV export supplied by the
Placement Desk maintainer on 7 November 2026. It contains **4,064 programme rows**
and covers **12 England & Wales regions**, including **786 London entries**.
This is a snapshot, not a live API or a guarantee of current vacancies.

The Oriel export's `Programme Number` column is blank throughout. Each
`Preference` value ends in a programme identifier (for example `/1575`).
The app currently uses that entire `Preference` value as the saved programme ID,
so this source deliberately keeps those strings unchanged. Changing them would
disconnect some existing shortlist, notes and rankings from their programmes.

The five `oriel-2026.part-XX.txt` files are **contiguous UTF-8 text parts of
one quoted CSV**. They are concatenated in order by `app-base.js`, then parsed by
the existing `rowsToPlacements` function. Part boundaries can fall inside
quoted multiline descriptions, so **do not parse individual parts as CSV**.
The files are separate solely to keep browser/GitHub transfer sizes manageable.

All 4,064 uploaded `Current Assigned Rank` entries were 0 and all `Tags`
entries were empty. This repository does not publish applicant-specific
preference rankings or personal notes through its catalogue.

## Update the catalogue yourself with Python

From the repository root:

```bash
python3 scripts/build_catalogue.py "/path/to/new/pharmacy programmes.csv"
```

This standard-library script verifies the required columns and unique IDs,
strips any personal ranks or tags, and regenerates the five parts. Check the
export date, that programme identifiers remain compatible, and whether the
row count has changed. Then update the row-count assertion in
`app-base.js` if appropriate, test locally, and commit the data changes.

## Migration status

The app now attempts this independent CSV source first, after any intentionally
uploaded personal CSV. `legacy.html` remains a **temporary compatibility fallback**
if the new catalogue cannot be fetched or its identifiers do not match saved
decisions. The fallback should only be removed after data and ranking-parity
tests pass on real existing accounts.

**Provenance:** the programme facts and descriptions originate from the Oriel
export, not from an original research effort. Downloading a public dataset
does not automatically establish unrestricted rights to redistribute it.
Check the applicable Oriel data terms before commercialising the product.
