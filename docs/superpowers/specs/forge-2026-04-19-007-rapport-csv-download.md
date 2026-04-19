---
name: Rapport CSV download
description: Add /api/reports/:source/csv route and a CSV download button on the Rapport page
---

# Forge Spec: Rapport CSV download

**Cycle:** 7 | **Clock:** 0.6h elapsed | **Size:** small

## What
- Backend: `GET /api/reports/:source/csv` returns the same report data flattened into a CSV (section, label, value, unit, change).
- Frontend: Rapport page adds a "CSV" button next to "Afdrukken" that triggers the download with a filename like `{source}-{geoCode}-{year}.csv`.

## Why
Advisors who generate a Rapport want to paste the numbers into emails, slack, or powerpoint. Today the only export path is `window.print()` → PDF, which is fine for archival but useless for composing a message. A one-click CSV closes the missing export path.

## Success criteria
1. `curl -o report.csv http://…/api/reports/bevolking/csv?geoCode=NL&year=2024` produces a readable CSV.
2. Clicking the CSV button on the Rapport page downloads a file with a sensible name.
3. Works for all 8 sources (including the 4 added in cycle 1).

## Approach
- Reuse `generateReport()` from report.service.ts.
- Flatten sections into one row per section.data item; include section title as a column.
- Follow the existing CSV-escape pattern from `export.controller.ts`.
- Frontend: use `fetch` + blob download (common pattern, no library needed).

## Not doing
- Not adding xlsx export.
- Not adding client-side CSV generation (server-side keeps the source of truth).
- Not bundling multiple sources into one file.
