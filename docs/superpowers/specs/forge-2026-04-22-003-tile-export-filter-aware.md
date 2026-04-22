---
Cycle: 3
Date: 2026-04-22
Size: small
---

# Forge Spec: Tile CSV/Excel export — filter-aware + authenticated

## What
`DashboardTile` menus let users export a single tile as CSV/Excel, but the current implementation in `src/client/utils/export.ts` is broken in two ways:

1. `fetchTileData()` calls `fetch('/api/data/query?source=…')` with no `Authorization` header. Since `/api/data/query` is protected by `authenticate + checkDataAccess`, the call fails with 401 and silently produces an empty download.
2. Even if the call worked, it sends no geoCode / year / dimension filters, so the export would contain the unfiltered national dataset rather than what the user actually sees on the tile.

This cycle threads the already-fetched, already-filtered tile `data` from `DashboardTile` into `exportTile`, so CSV and Excel exports reflect the on-screen view. Removes the broken `fetchTileData` path.

## Why
Tile CSV/Excel has been a silently-broken button for users (no visible error, just empty files). Fixing it unlocks the single-tile-to-spreadsheet workflow that advisors repeatedly need when composing reports.

## Success criteria
1. Clicking CSV on a dashboard tile downloads a CSV with the same rows the user sees (same `geoCode`, `year`, `dimension`, `dimensionValue`).
2. Excel export produces the same row set as CSV.
3. No more unauthenticated calls to `/api/data/query` from the export path.
4. PNG and PDF exports (DOM-based) unchanged.

## Approach
- Change `onExport` signature on `DashboardTile` from `(format) => void` to `(format, data) => void`, so the tile forwards its already-fetched data to the grid.
- `TileGrid.handleExport` forwards data to `exportTile(tile, format, data)`.
- `exportTile(tile, format, data?)`:
  - CSV/Excel branches take `data` and flatten to columns directly.
  - PNG/PDF branches are unchanged (they snapshot the DOM).
  - Drop `fetchTileData` entirely — it was broken and now has no callsite.

## Not doing
- No server-side changes.
- No changes to bulk PDF export (`exportBulkPdf`).
- No new export formats.
- No CSV-delimiter changes (keep `;` for NL locale).
