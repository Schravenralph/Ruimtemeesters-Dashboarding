---
Cycle: 6
Date: 2026-04-22
Size: small
---

# Forge Spec: Admin Data Quality tab

## What
Expose the fully-built-but-unreached data quality feature. `data-quality.service.ts` computes completeness, year/geo coverage and null counts per source; `GET /api/quality` and `GET /api/quality/:source` serve it (admin-only); `DataQualityBadge` renders the per-source summary — nothing calls any of it.

Add a **Datakwaliteit** tab to `AdminPage` that lists every source with its badge and the supporting numbers. Extend the service so it derives source list + tables from the data-source registry instead of a hardcoded map (currently misses all duurzaamheid sources).

## Why
- Admins have no visibility into data-source health; coverage gaps and null spikes land silently.
- Three already-built pieces wired together; cheap win.
- Hardcoded `DATA_TABLES` diverges from the registry every time a new source is added (emissies, energie, hernieuwbaar, afval are all invisible here).

## Success criteria
1. New admin tab "Datakwaliteit" (icon: Activity) between existing tabs.
2. The tab fetches `/api/quality` on mount and shows one row per source with:
   - Name + supercategory
   - `DataQualityBadge` for completeness
   - Year range and count of covered years
   - Geo coverage count
   - Null-value count
3. The service iterates the registry rather than a hardcoded map, so duurzaamheid sources appear too.
4. Loading skeleton + error banner.
5. Builds + tests pass.

## Approach
- `data-quality.service.ts`: replace the `DATA_TABLES` map with a call to `getDataSources()`; treat `dimensionColumns` as the null-check columns.
- New `DataQualityPanel` component (`src/client/components/admin/DataQualityPanel.tsx`).
- `AdminPage`: add tab key `quality`, icon, and render the panel.

## Not doing
- No changes to `DataQualityBadge`.
- No `lastUpdated` tracking (service still returns `null` for it — scope creep).
- No drill-down per-source detail page; this cycle is list-only.
