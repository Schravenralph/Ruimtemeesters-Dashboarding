---
Cycle: 2
Date: 2026-04-22
Size: small
---

# Forge Spec: DataDownloadPage — dynamic sources & years

## What
Replace the hardcoded `dataSources` array and hardcoded year dropdown on `DataDownloadPage` with data fetched from the server. Add a lightweight `GET /api/data/sources` endpoint that returns the data-source registry. Wire the page to it and to the existing `/api/data/years/:source` endpoint.

## Why
Today `DataDownloadPage` is out of sync with reality:
- Its hardcoded `dataSources` array is missing `emissies`, which is present in the registry, `ReportPage`, and the dashboards.
- The year dropdown hardcodes `2020-2040`, so users see years for which no data exists, and any newly-loaded CBS table outside that window is invisible here.
- Whenever a new source is added to the registry (see cycle 1 of 2026-04-19's forge session — `ruimtemeesters_prognose` and the duurzaamheid tables), `DataDownloadPage` silently diverges.

Adding the registry endpoint also unlocks future clients (admin tools, catalogue picker, API consumers) that currently have no single place to discover sources.

## Success criteria
1. `GET /api/data/sources` returns `{sources: [{key, name, supercategory, unit, cbsTableId}]}` sourced from the registry.
2. `DataDownloadPage` renders source radio cards from the endpoint, grouped by supercategory (current UX preserved).
3. `emissies` (and any other registry source not in the old list) appears without code changes.
4. The year dropdown is populated by `/api/data/years/:source` per the currently-selected source; if a source has no years, the dropdown hides itself.
5. Build + existing tests unchanged.

## Approach
- New route in `data.routes.ts`: `router.get('/sources', authenticate, listSources)`.
- New controller method `listSources` in `data.controller.ts` that calls `getDataSources()` and projects the public shape.
- Client: new helper `listDataSources()` in `services/api/data.ts`.
- Client: `DataDownloadPage` uses `useEffect` to fetch sources on mount, then fetch years whenever the selected source changes. Keep the radio-card group layout; group by `supercategory`.
- Graceful fallback: if the sources call fails, show an error banner instead of the radios.

## Not doing
- No format changes (CSV/JSON still the only two).
- No export pipeline changes.
- No supercategory → human label mapping changes (`Wonen`, `Duurzaamheid` already flow from registry).
