# Riens-Sales-Viewer Map Analysis for Ruimtemeesters Dashboard

**Date:** 2026-03-24
**Purpose:** Evaluate Riens-Sales-Viewer's map and animation capabilities for reuse in the demographic dashboard.

## Tech Stack

- React 18.3 + TypeScript + Vite + Tailwind CSS
- **Leaflet 1.9.4** + React-Leaflet 4.2.1 (map rendering)
- **Framer Motion 12.23** (UI animations)
- **D3.js** (color scales, choropleth classification)
- **Recharts** (dashboard charts — same as our dashboarding repo)
- **leaflet.heat** (heatmap layer)
- **polylabel** (label positioning via Pole of Inaccessibility)
- html-to-image, html2canvas, jsPDF (export)

## What We Can Reuse

### 1. GeoJSON Boundaries (Direct Copy)
- `gemeenten_boundaries_official.geojson` — 4.3MB, 342 gemeenten with MultiPolygon geometries
- Properties: `statcode` (GM codes), `statnaam` (names)
- Province boundaries GeoJSON also available
- **Action:** Copy GeoJSON files directly into our public/assets

### 2. Map Infrastructure (Adapt)
- Leaflet + React-Leaflet setup with Netherlands bounds (49.5-54.5N, 1.5-9.5E)
- CARTO Light tile layer (no labels) — clean base for choropleth
- Zoom range 6-19, default 7.5
- **Boundary styling:** Active = blue (#2A5298, 12% fill), hover/click callbacks
- **Action:** Create a LeafletMap component wrapping this setup

### 3. Choropleth Coloring Pattern
- `styleFeature()` callback applies colors based on data values per gemeente
- D3 color scales (sequential for quantitative, categorical for ordinal)
- Dynamic fill opacity based on data values
- **Action:** Wire to CBS population/household data with D3 quantize scales

### 4. Label System (Adapt)
- Three-tier labels: municipality, partner, combined
- Zoom-dependent visibility (threshold zoom 7)
- Smart deduplication: buckets nearby labels at low zoom
- **Imperative rendering** via Leaflet markers (not React) for performance
- Drag-to-reposition with position persistence
- **Action:** Simplified version — just gemeente labels at appropriate zoom

### 5. Timeline + Animation (Adapt)
- `TimelineSlider` with play/pause/speed controls
- Monthly granularity (we'd use yearly for demographics)
- `filterAtDate()` / `filterByRange()` for temporal data filtering
- **SplinePlayer:** Catmull-Rom spline camera animation between waypoints
- Waypoint-based animation scripts (fly-to sequences between gemeenten)
- **Action:** Adapt TimelineSlider for year-based period selection with play/pause (Primos "Afspelen" feature)

### 6. Heatmap Layer
- leaflet.heat plugin with `[lat, lng, intensity]` arrays
- Radius 25, blur 15 — configurable
- **Action:** Population density heatmap overlay option

### 7. Geometry Utilities (Direct Copy)
- `geometry.ts`: metric projection (lat/lon to meters), POI calculation, polygon operations
- Properly accounts for latitude-dependent longitude scaling at 52N
- **Action:** Copy utility file for label positioning

### 8. Export Infrastructure
- PNG via html-to-image (2x pixel ratio for quality)
- PDF reports via jsPDF + html2canvas (multi-page)
- Filter logic to exclude controls from export
- **Action:** Already have similar in our repo, but the map-specific export logic is useful

## Integration Plan for Demographic Dashboard

### Phase 1: Static Choropleth (Priority)
1. Copy GeoJSON boundaries to `public/geo/`
2. Create `<ChoroplethMapView>` component using Leaflet + React-Leaflet
3. Wire to CBS data: color each gemeente by selected metric (population, growth rate, tekort %)
4. D3 quantize color scale with legend
5. Click gemeente -> drilldown to gemeente detail
6. Hover tooltip with key stats

### Phase 2: Animated Timeline Map
1. Adapt TimelineSlider for year navigation (2000-2024 actuals, 2025-2060 prognose)
2. Play/pause animation through years
3. Smooth color transitions between years using requestAnimationFrame
4. Overlay showing current year + selected metric

### Phase 3: Advanced Features
1. Point map variant (graduated circles at gemeente centroids via polylabel)
2. Heatmap layer toggle
3. Province boundary overlay toggle
4. Comparison mode (side-by-side maps or split coloring)
5. Camera animation scripts for presentations (fly-to sequences)

## Key Files to Reference

| File | What to take |
|------|-------------|
| `src/components/Map/MapView.tsx` | Map setup, bounds, tile layer, zoom config |
| `src/components/Map/Boundaries.tsx` | GeoJSON rendering, styleFeature, hover/click |
| `src/utils/geometry.ts` | Metric projection, POI, polygon utilities |
| `src/components/AnimationView/SplinePlayer.tsx` | Animation playback engine |
| `src/hooks/useTimelineFilter.ts` | Temporal filtering logic |
| `src/components/Legend/Legend.tsx` | Draggable legend with persistence |
| `src/components/Map/HeatmapLayer.tsx` | leaflet.heat integration |
| `public/gemeenten_boundaries_official.geojson` | Municipality polygons |
