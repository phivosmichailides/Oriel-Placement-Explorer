#!/usr/bin/env python3
"""Build the five public programme-data chunks from a fresh Oriel CSV export.

Requires only Python's standard library. Usage:
    python3 scripts/build_catalogue.py "pharmacy programmes.csv"

Keeps the original Preference string intact: these are the identifiers currently
used by the application and in applicants' saved decisions. Never publish
applicant-specific Current Assigned Rank or Tags values.
"""
from __future__ import annotations

import argparse
import csv
import io
import math
from pathlib import Path


REQUIRED = {
    "Preference", "Employer Name", "Programme Title",
    "Programme Description", "Region", "Area(Sector)",
    "Salary", "Hours Per Week", "Setting 1", "Length 1",
}
PART_COUNT = 5


def build(source: Path, destination: Path) -> None:
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        missing = REQUIRED.difference(headers)
        if missing:
            raise SystemExit("Not an Oriel programme export; missing: " + ", ".join(sorted(missing)))
        rows = list(reader)

    if not rows:
        raise SystemExit("No programmes in CSV.")

    # Never commit an individual's private application choices to the
    # public GitHub Pages dataset, even if an export happens to contain them.
    for row in rows:
        if "Current Assigned Rank" in row:
            row["Current Assigned Rank"] = "0"
        if "Tags" in row:
            row["Tags"] = ""

    ids = [row.get("Programme Number") or row.get("Preference") or "" for row in rows]
    if "" in ids or len(ids) != len(set(ids)):
        raise SystemExit("Missing/duplicate programme identifiers. No files written.")

    destination.mkdir(parents=True, exist_ok=True)
    per_part = math.ceil(len(rows) / PART_COUNT)
    for i in range(PART_COUNT):
        group = rows[i * per_part:(i + 1) * per_part]
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=headers, quoting=csv.QUOTE_ALL, lineterminator="\n")
        if i == 0:
            writer.writeheader()
        writer.writerows(group)
        path = destination / f"oriel-2026.part-{i+1:02}.txt"
        path.write_text(buffer.getvalue(), encoding="utf-8", newline="")
        print(f"{path}: {len(group)} programme rows")

    print(f"Validated {len(rows)} unique programmes.")
    print("Remember to update the app's required row-count check if the catalogue changes size.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Oriel programmes CSV export")
    parser.add_argument("--output", type=Path, default=Path("data"))
    args = parser.parse_args()
    build(args.csv, args.output)
