# Primos Datawonen — Complete Feature Inventory

**Source**: https://primos.datawonen.nl/viewer/
**Platform**: Swing Viewer 7.0.9564 (by ABF Research / Swing EU)
**Owner**: Ministerie van Volkshuisvesting en Ruimtelijke Ordening
**Data**: ABF Research Primos-prognose 2025
**Investigated**: 2026-03-20 via Playwright browser automation

---

## 1. MAIN MENU (hamburger)

| Feature | Description |
|---------|-------------|
| Selectie-assistent | Guided wizard for building presentations step-by-step |
| Inloggen | Authentication system (user accounts) |
| Help | Links to Swing Viewer documentation |
| Over Swing Viewer | About/version dialog (Swing 7.0.9564) |

## 2. TOOLBAR (top bar)

| Button | Function |
|--------|----------|
| Open menu | Hamburger menu (see above) |
| Open presentatie bestand | Open a saved .xml workspace file |
| Bestand downloaden | Export dialog (see §10) |
| Afdrukken | Print dialog with paper format selection (see §11) |
| Delen via link | Share current presentation via URL, email, or social media (see §12) |
| Presentatie tabs | Multiple presentation tabs, each deletable |
| Nieuwe presentatie (+) | Create additional presentation tab |
| Weergave volledig scherm | Fullscreen mode toggle |

## 3. LEFT PANEL — INHOUD (Content/Variables)

### 3.1 Variable Tree (hierarchical)
Expandable/collapsible tree with categories and leaf variables.

**Top-level categories:**
- Bevolking (Population)
- Huishoudens (Households)
- Woningvoorraad (Housing Stock)

**Bevolking > Absoluut:**
| Variable | Type | Description |
|----------|------|-------------|
| Bevolking | stock | Total population forecast |
| Bevolking 14 jaar en jonger | stock | Age 0-14 |
| Bevolking 15-29 jaar | stock | Age 15-29 |
| Bevolking 30-44 jaar | stock | Age 30-44 |
| Bevolking 45-64 jaar | stock | Age 45-64 |
| Bevolking 65-74 jaar | stock | Age 65-74 |
| Bevolking 75 jaar en ouder | stock | Age 75+ |

**Bevolking > Relatief:**
Same 6 age groups as percentages of total population.

**Huishoudens > Absoluut:**
| Variable | Type | Description |
|----------|------|-------------|
| Huishoudens | stock | Total households |
| Huishoudens 29 jaar en jonger | stock | Reference person age ≤29 |
| Huishoudens 30-44 jaar | stock | Reference person age 30-44 |
| Huishoudens 45-64 jaar | stock | Reference person age 45-64 |
| Huishoudens 65-74 jaar | stock | Reference person age 65-74 |
| Huishoudens 75 jaar en ouder | stock | Reference person age 75+ |
| Alleenstaand | stock | Single-person households |
| Paar zonder thuiswonend(e) kind(eren) | stock | Couples without children |
| Gezin met thuiswonend(e) kind(eren) | stock | Families with children |
| Eenoudergezin | stock | Single-parent families |
| Overig huishouden | stock | Other households |

**Huishoudens > Relatief:**
Same breakdown as percentages.

**Woningvoorraad > Ontwikkeling woningvoorraad:**
| Variable | Type | Description |
|----------|------|-------------|
| Woningvoorraad | stock | Total housing stock |
| Nieuwbouw (cumulatief komende 5 jaren) | flow | New construction, 5yr cumulative |
| Onttrekkingen (cumulatief komende 5 jaren) | flow | Demolitions, 5yr cumulative |
| Woningvoorraadontwikkeling (cumulatief 5 jaar) | flow | Net stock change, 5yr |

**Woningvoorraad > Woningtekort > Vraag en aanbod:**
| Variable | Type | Description |
|----------|------|-------------|
| Urgente BAR-huishoudens | stock | Urgent households (25+, living in non-dwelling) |
| Saldo van starters en woningverlaters | stock | Net starters vs. leavers |
| Langdurige leegstand | stock | Long-term vacancy (≥1yr) |
| Woningbehoefte | stock | Housing demand |
| Gewenste woningvoorraad | stock | Desired housing stock |

**Woningvoorraad > Woningtekort > Tekort of overschot:**
| Variable | Type | Description |
|----------|------|-------------|
| Woningtekort (absoluut) | stock | Housing shortage, absolute |
| Woningtekort (percentage) | percentage | Housing shortage as % of stock |

### 3.2 Variable Selection Features
| Feature | Description |
|---------|-------------|
| Search box | "Zoeken in onderwerpen" — text search across all variables |
| Expand/collapse categories | Click to open/close tree nodes |
| Select all in category | "Alle onderwerpen in dit thema selecteren" button per category |
| Multi-select | Can select multiple variables for combined presentations |
| Selected count badge | "1 Geselecteerde onderwerpen" indicator in toolbar |
| External links | "Rapportage Primos-prognose 2025" links to ABF publication |

## 4. GEOGRAPHIC LEVELS (Niveau)

| Level | Code | Description |
|-------|------|-------------|
| Nederland | NL | National level (single area) |
| Gemeente (2023) | GM | Municipalities (342 gemeenten) |
| COROP-gebied | CR | Statistical COROP regions |
| Provincie | PV | Provinces |
| Woningmarktregio ABF (2025-) | — | ABF housing market regions |
| Woningwetregio | — | Housing act regions |
| Krimp- en anticipeerregio | — | Shrinkage and anticipation regions |
| Landsdeel | — | Parts of the country |
| Krimp- en anticipeer | — | Shrinkage subregions |
| Landsdeel ABF (2025-) | — | ABF parts of the country |

### 4.1 Geographic Selection Features
| Feature | Description |
|---------|-------------|
| Level selector | Dropdown/list to switch geographic level |
| Area count badge | "342 Geselecteerde gebieden" indicator |
| Individual area toggle | Click gemeente names in list to select/deselect |
| Select all areas | Button to select all areas within a level |
| Vergelijkingsniveau | Comparison level — compare against a reference geography |
| Vergelijkingsgebieden | "0 Geselecteerde vergelijkingsgebieden" — select areas to compare against |

## 5. PERIODS (Perioden)

| Feature | Description |
|---------|-------------|
| Period bar | Bottom bar showing available years as buttons |
| Available years | 2025, 2030, 2035, 2040, 2045, 2050 (5-year intervals for prognosis) |
| Single period selection | Click a year to view that period |
| Multi-period selection | "Alle selecteren" button to show all periods at once |
| "Meest recente" | Quick button to jump to most recent period |
| Period slider | Draggable slider ("Klik om te slepen") for quick year navigation |
| Afspelen (Play) | Animation button — auto-plays through periods |
| Show/hide period bar | "Toon periodes" / "Verberg periodes" toggle |
| Period type label | Shows "Jaar" as the period type |

## 6. PRESENTATION TYPES (Presentatievorm)

### 6.1 View Types
| Type | Description |
|------|-------------|
| Tabel | Data table with rows (areas) × columns (periods) |
| Kleurentabel | Color-coded table (cells colored by value) |
| Kaart | Choropleth map (filled polygons) |
| Kaart (punten) | Point map (graduated symbols) |

### 6.2 Table Features
| Feature | Description |
|---------|-------------|
| Column sorting | "Klik om oplopend te sorteren" — click headers to sort |
| Column resizing | "Sleep om de grootte van de kolom aan te passen" |
| Kolomtotalen | Toggle to show/hide column totals |
| Row links | Clicking a gemeente name in the table does something (likely drilldown) |
| Scrollable | Large table with scrolling |

### 6.3 Map Features
| Feature | Description |
|---------|-------------|
| Choropleth fill | Colored polygon fill based on data values |
| Zoom controls | "+ Inzoomen" and "Uitzoomen" buttons |
| Map layers | "Kaartlagen" toggle for additional map layers |
| Map labels | "Toon labels" toggle for area name labels |
| Legend | Color-coded legend with class ranges |
| Point map | Alternative visualization with graduated circles |

## 7. FORMATTING (Opmaakinstellingen)

### 7.1 Tabs
| Tab | Content |
|-----|---------|
| Titel | Edit presentation title |
| Klassenindeling | Choropleth class breaks configuration |
| Gebied | Area display settings |
| Labels | Label display settings |
| Kaartlagen | Map layer configuration |

### 7.2 Klassenindeling (Class Classification)
| Setting | Options |
|---------|---------|
| Handmatige labels | Toggle manual label editing |
| Handmatige grenzen | Toggle manual break points |
| Gelijke klassen | Toggle equal-interval classification |
| Aantal klassen | 2–15 classes (dropdown) |
| Kleurenschema | Color scheme picker button |
| Kleuren omdraaien | Reverse color scheme |
| Handmatige kleuren | Toggle manual color entry per class |
| Class table | Editable table with: Color hex, Label, Ondergrens (lower bound), Bovengrens (upper bound), Aantal (count) |
| Standaardinstellingen | Reset to default settings |

## 8. DATA TRANSFORMATIONS (Transformaties)

| Transformation | Options |
|----------------|---------|
| Percenteren | Calculate percentages (with dimension selector) |
| Groeicijfers | Growth rates — with Type dropdown and Basisperiode (base period) |
| Z-Scores | Statistical Z-scores — with Type dropdown and Basisperiode |

## 9. LEGEND (Legenda)

| Feature | Description |
|---------|-------------|
| Color classes | Clickable legend items (e.g., "< 30.000", "30.000 < 60.000") |
| Eenheid (Unit) | Shows data unit (e.g., "aantal") |
| Bron (Source) | Shows data source (e.g., "ABF - Primos 2024", "ABF - Primos Demografie 2024") |
| Show/hide | "Verberg legenda" / "Toon legenda" toggle |
| Resizable | Draggable splitter to resize legend panel |

## 10. EXPORT / DOWNLOAD (Bestand downloaden)

### 10.1 File Formats
| Format | Status |
|--------|--------|
| Afbeelding (Image) | Disabled for table view, enabled for map/chart |
| Microsoft Excel werkblad (.xlsx) | Default, enabled |
| Video (mp4) | Disabled (for animations) |
| OpenOffice Calc bestand | Enabled |
| CSV bestand | Enabled |
| PDF bestand | Enabled |
| Microsoft Word bestand (.docx) | Enabled |
| Microsoft Powerpoint bestand (.pptx) | Disabled for some views |
| Swing werkruimte bestand (xml) | Enabled — saves full workspace state |

### 10.2 Excel Sub-options
| Werkbladtype | Description |
|--------------|-------------|
| Standaard | Standard table layout |
| Draaitabel | Pivot table format |
| Metadata | Metadata export |

### 10.3 Export Features
| Feature | Description |
|---------|-------------|
| Multi-presentation select | Export multiple presentations at once |
| Select all | "Alle selecteren" for batch export |
| Custom filename | Editable filename field |
| File extension display | Shows the extension (e.g., ".xlsx") |

## 11. PRINT (Afdrukken)

| Feature | Description |
|---------|-------------|
| Paper format | A5 Liggend/Staand, A4 Liggend/Staand, A3 Liggend/Staand, Handmatig |
| Multi-presentation | Select which presentations to print |
| Browser print dialog | Triggers native browser print |

## 12. SHARING (Delen via link)

| Channel | Description |
|---------|-------------|
| Direct URL | Copyable workspace URL with `?workspace_guid=...` |
| Copy button | "Kopieer url" button |
| Email | "Stuur via mail" — opens mailto: with subject and URL |
| Facebook | Share on Facebook |
| X (Twitter) | Share on X/Twitter with title |
| LinkedIn | Share on LinkedIn with title |

## 13. PRESENTATION MANAGEMENT

| Feature | Description |
|---------|-------------|
| Multiple tabs | Multiple presentation tabs in the tab bar |
| Tab naming | Auto-named from variable + period + level (e.g., "Bevolking - 2050 - Gemeenten (2023)") |
| Delete tab | "(klik om te verwijderen)" X button per tab |
| New tab (+) | "Nieuwe presentatie" button |
| Open workspace | Load saved .xml workspace files |
| Title editing | "Titel aanpassen" button on each presentation |
| Presentation title | Editable title shown above the data view |

## 14. ACCESSIBILITY & UI

| Feature | Description |
|---------|-------------|
| Keyboard navigation | ARIA labels, keyboard shortcuts referenced |
| Screen reader support | "Toon toegankelijke tabelgegevens" link for accessible table data |
| Panel resizing | Draggable splitters for left panel, legend panel, period bar |
| Panel show/hide | "Toon/Verberg linker paneel", "Toon/Verberg legenda", "Toon/Verberg periodes" |
| Toegankelijkheidsverklaring | Link to accessibility statement |
| Responsive sizechecker | "sizechecker" element for responsive layout |

## 15. NAVIGATION LINKS (skip links)

| Link | Target |
|------|--------|
| Inhoud | Jump to content panel |
| Menu Swing Viewer | Jump to menu |
| Kenmerken | Jump to variable characteristics |
| Niveau | Jump to geographic level |
| Presentatie | Jump to presentation view |
| Startpagina | Jump to start page |
| Rapport | Jump to report view |
| Legenda | Jump to legend |
| Periode | Jump to period selector |

## 16. DATA SOURCE METADATA

| Field | Value |
|-------|-------|
| Data source label | "ABF - Primos Demografie 2024" / "ABF - Primos 2024" |
| Unit display | "aantal" (count), "percentage" |
| Copyright | "copyright url" link |
| Powered by | "Powered by Swing 7.0.9564" |

## 17. STARTPAGE

| Feature | Description |
|---------|-------------|
| "Al ervaring?" | "Direct aan de slag" button — quick start |
| "Eerste bezoek?" | "Volg instructies" button — guided tutorial |
| "Hulp nodig?" | Links to help topics: Presentatie maken, Onderwerpen, Gebieden wijzigen, Perioden wijzigen, Presentatievorm wijzigen, Datatransformaties, Exporteren, Gebiedsgroepen |
| "Vragen en/of opmerkingen?" | "Neem contact met ons op" — mailto link to primos@abfresearch.nl |

## 18. COMPARISON FEATURES

| Feature | Description |
|---------|-------------|
| Vergelijkingsniveau | Select a comparison geographic level (different from main level) |
| Vergelijkingsgebieden | Select specific areas to compare against |
| Multi-period comparison | Select "Alle selecteren" to show all periods as columns |

## 19. CHART TYPES (from ABF Charts CDN)

The platform loads these chart libraries from `cdn.abf.nl/abfcharts/release_7.0/`:
| Chart Type | JS File |
|-----------|---------|
| Area chart | chart.area.min.js |
| Bar chart | chart.bar.min.js |
| Benchmark pie | chart.benchmarkpie.min.js |
| Column chart | chart.column.min.js |
| Empty (placeholder) | chart.empty.min.js |
| Line chart | chart.line.min.js |
| Pie chart | chart.pie.min.js |
| Radar chart | chart.radar.min.js |
| Sankey diagram | chart.sankey.min.js |
| Scatter plot | chart.scatter.min.js |
| Treemap | chart.treemap.min.js |

Note: These chart types are loaded as JavaScript libraries but may not all be available for every data configuration. The table/map views are the primary presentation types visible in the UI.

## 20. MAP TECHNOLOGY

| Component | Details |
|-----------|---------|
| Map library | OpenLayers 9.1.0 (from cdn.abf.nl) |
| Turf.js | Bezier curves (turf_bezier.min.js) |
| D3.js | v5.5.0 for additional visualizations |
| D3-Sankey | v0.12.3 for Sankey diagrams |

## 21. SEARCH & AUTOCOMPLETE

| Feature | Description |
|---------|-------------|
| Variable search | "Zoeken in onderwerpen" text input in left panel |
| ABF Search | Autocomplete component from cdn.abf.nl/abfsearch/release_7.0/ |

---

## SUMMARY: Feature Count

| Category | Count |
|----------|-------|
| Data variables | 29 (across Bevolking, Huishoudens, Woningvoorraad) |
| Geographic levels | 10 |
| Period options | 6 years (2025–2050) + animation |
| Presentation types | 4 (Table, Color table, Map, Point map) |
| Chart libraries loaded | 11 |
| Export formats | 9 |
| Data transformations | 3 (Percenteren, Groeicijfers, Z-Scores) |
| Share channels | 5 (URL, Email, Facebook, X, LinkedIn) |
| Print formats | 7 (A3/A4/A5 × landscape/portrait + manual) |
| Formatting tabs | 5 (Title, Classification, Area, Labels, Map layers) |
| Classification options | 8 settings (manual labels/bounds, equal classes, 2-15 classes, color scheme, reverse, manual colors) |
| Accessibility features | 6+ (skip links, screen reader, keyboard, ARIA) |
