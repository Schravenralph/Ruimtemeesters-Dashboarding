# System Template Audit — 2026-05-14

Pass over every system theme to assess what's wired, what's missing, and which enrichment is worth doing next. Companion to forge-report-2026-05-14 (which closed EPIC #107 and enriched `woningen`); this document is the source of truth for which template to pick up next.

## Data warehouse inventory (what we have to draw from)

### Registered data sources (`data_sources` table)

| Key | Supercat | CBS table | Unit | Dims (cardinality from real data) | Real rows | Geos | Year range | Prognose? |
|---|---|---|---|---|---:|---:|---|---|
| `bevolking` | wonen | 03759NED | aantal | age_group {0-14,15-29,30-44,45-64,65-74,75+,totaal} × gender {man,vrouw,totaal} | 153 643 | 836 | 1988–2060 | ✅ TSA + CBS |
| `huishoudens` | wonen | 71486NED | aantal | household_type {eenpersoons, paar_met_kinderen, eenouder, 0-29, 30-44, 45-64, 65-74, 75+, totaal} | 97 614 | 606 | 2000–2025 | ❌ |
| `woningen` | wonen | 82550NED | aantal | tenure_type **{totaal}** ⚠ × dwelling_type {eengezins, meergezins, totaal} | 16 740 | 443 | 2012–2026 | ❌ |
| `woningtekort` | wonen | — (derived) | percentage | metric {tekort, tekort_percentage, woningbehoefte, voorraad_begin, voorraad_eind, nieuwbouw, sloop, saldo, overige_toevoeging, overige_onttrekking} | 18 073 | 442 | 2012–2025 | ❌ |
| `85640ned` | wonen | 85640NED | aantal | geboorteland × geslacht × herkomstland × postcode | 829 260 | 4 065 (postcode) | 2024 only | ❌ |
| `energie` | duurz. | 83867NED | TJ | sector {verwarming, woningen} × fuel_type {aardgas, elektriciteit, elektriciteit_netto, elektrisch, stadsverwarming, totaal} | 38 060 | 465 | 2010–2030 | ✅ |
| `afval` | duurz. | 83452NED | kg | waste_type {gft, glas, grof_restafval, kunststof, papier, restafval, textiel, totaal} | 124 567 | 615 | 1998–2030 | ✅ |
| `hernieuwbaar` | duurz. | 84518NED | kW | energy_source **{zonnepanelen}** ⚠ | 20 650 | 396 | 2012–2031 | ✅ |
| `emissies` | duurz. | 85668NED | ton CO2-eq | sector **{totaal}** ⚠ × emission_type {ch4, co2, n2o, nh3, nmvos, nox, pm10, so2} | 216 | 1 (NL only!) ⚠ | 1990–2024 | ❌ |

### Critical data-quality gaps (must fix before enrichment is useful)

| Source | Gap | Severity | Impact |
|---|---|---|---|
| **`woningen.tenure_type`** | Only `totaal` present, no huur/koop split | **P0** | Blocks the most-asked Woningen tile (huur vs koop). Every template referencing `tenure_type` is broken today. |
| **`emissies.sector`** | Only `totaal` present, no per-sector split | **P0** | Blocks Emissies theme entirely (which is *also* at 0 tiles). |
| **`emissies` geo coverage** | 1 geo (NL only), no per-gemeente data | **P0** | Emissies template can't be a gemeente dashboard at all. |
| **`hernieuwbaar.energy_source`** | Only `zonnepanelen`, no wind/biomassa | **P1** | Hernieuwbare-energie theme is single-source-driven; can't tell a "mix" story. |

These are sync-routine issues, not schema issues. Each `data_sources.sync_config` would need a re-pull from the matching CBS table; the table columns already accept the missing values.

## Per-theme audit + priority list

**Legend.** ✅ = currently used in the template. ➕ = recommended addition. 🆕 = not yet registered as a data source.

---

### `woningen` — Wonen — ✅ already enriched in PR #131

7 tiles, 7 layout items, 3 KPIs. Follow-ups: see `tenure_type` data-quality fix (P0) for the stacked-bar tile to be useful, and register **CBS 83487NED Nieuwbouw** as a new source for a "supply rate" tile.

---

### `bevolking` — Wonen — **Priority P0**

**Current.** 6 tiles all `bevolking`-only. 3 KPIs. 0 layout. Chart variety is OK (bar, line, pie, choropleth, stacked-bar, table) but **all six tiles answer the same question** (how many people of which kind).

**Advisor questions.** (1) Hoe oud wordt mijn gemeente? (2) Hoeveel migratie? (3) Hoe vergelijk ik me met cohort/provincie/NL? (4) Hoe staat de prognose?

**Enriched template (~8 tiles, ~30 min):**
- ✅ Bevolking naar leeftijd (`bevolking`, dim age_group, stacked-bar)
- ✅ Bevolkingsontwikkeling (`bevolking`, line + references)
- ✅ Bevolking naar geslacht (`bevolking`, dim gender, pie)
- ✅ Leeftijdsopbouw (`bevolking`, dim age_group × gender, stacked-bar)
- ➕ Bevolkingsprognose tot 2030 met envelope (`bevolking`, dataOrigin=ruimtemeesters_prognose, line+envelope) — the only TSA forecast source today
- ➕ Migratiesaldo (binnen NL + buitenland) — *needs* new CBS source: **CBS 60032NED** (Bevolkingsontwikkeling: regio per maand) 🆕
- ➕ Gemiddelde gezinsgrootte = `bevolking / huishoudens` — derived; either back-end metric or two tiles side-by-side
- ➕ Vergrijzingsindex = (`age_group=65+ / age_group=0-14`) per gemeente — derived

**KPI strip:** Inwoners totaal, Vergrijzingsindex (75+/totaal), Migratiesaldo, Prognose 2030 absolute groei.

---

### `huishoudens` — Wonen — **Priority P0**

**Current.** 4 tiles all `huishoudens`-only. 1 KPI. 0 layout. The `household_type` dim has 9 values including age slices — barely used.

**Advisor questions.** (1) Eenpersoons vs gezin: hoe verschuift de samenstelling? (2) Hoeveel gezinnen met kinderen krijgen we in 2030? (3) Hoe zit het verhouding huishoudens/woningen?

**Enriched template (~7 tiles):**
- ✅ Huishoudens naar samenstelling (`huishoudens`, dim household_type, pie/stacked-bar)
- ✅ Huishoudensontwikkeling (`huishoudens`, line + references)
- ➕ Huishoudens naar leeftijdsgroep referentiepersoon (`huishoudens`, dim household_type filter=age slices, bar)
- ➕ Gemiddelde huishoudensgrootte over tijd (derived: `bevolking / huishoudens`, line)
- ➕ Eenpersoonshuishoudens-aandeel (`huishoudens`, dim=household_type, filter=eenpersoons, line + references — vergrijzings-/scheidingsindex)
- ➕ Huishoudens per gemeente choropleth
- ➕ "Wat betekent dit voor woningvraag?" — link/cross-tile naar woningtekort tile

**KPI strip:** Huishoudens totaal, % eenpersoons, gemiddelde grootte, % gezinnen met kinderen.

---

### `woningtekort` — Wonen — **Priority P0**

**Current.** 4 tiles, woningtekort-only, 1 KPI, 0 layout. Hugely undersold given `metric` has **10 values** (tekort, tekort_percentage, woningbehoefte, voorraad_begin, voorraad_eind, nieuwbouw, sloop, saldo, overige_toevoeging, overige_onttrekking).

**Advisor questions.** (1) Hoeveel woningen tekort en in welke richting beweegt het? (2) Hoeveel nieuwbouw zit er in de pipeline? (3) Wat is per saldo de groei van de voorraad?

**Enriched template (~8 tiles):**
- ✅ Woningtekort percentage over tijd (`woningtekort`, metric=tekort_percentage, line + references)
- ✅ Woningtekort absoluut (`woningtekort`, metric=tekort, line)
- ➕ Voorraad begin/eind (`woningtekort`, metric=voorraad_begin + voorraad_eind, two-line)
- ➕ Nieuwbouw vs Sloop (`woningtekort`, metric=nieuwbouw vs sloop, stacked-bar)
- ➕ Saldo voorraadmutatie (`woningtekort`, metric=saldo, bar)
- ➕ Woningbehoefte (`woningtekort`, metric=woningbehoefte, line)
- ➕ Overige toevoeging/onttrekking (woningverbouw, splitsing) — stacked-bar
- ➕ Choropleth tekort_percentage 2025

**KPI strip:** Tekort (%), Tekort (abs), Nieuwbouw laatste jaar, Saldo voorraadmutatie.

---

### `overzicht` — Wonen — **Priority P0**

**Current.** Already uses all 4 wonen sources (`bevolking + huishoudens + woningen + woningtekort`). 4 KPIs ✅. But 0 layout, 4 tiles only.

**Enriched template (~6 tiles):** Cross-source 1-tile-per-source over time + references. Plus a "narrative" small KPI strip. This is the *demo* template — the one to show wethouders.

---

### `prognose` — Wonen — **Priority P1**

**Current.** Single source (`bevolking`), 4 tiles. The "prognose" theme conceptually should pull from every prognose-eligible source.

**Enriched template:**
- ✅ Bevolkingsprognose tot 2060 (the long-range record)
- ➕ Hernieuwbaar prognose (`hernieuwbaar`, ruimtemeesters_prognose — to 2031)
- ➕ Energie prognose (`energie`, ruimtemeesters_prognose — to 2030)
- ➕ Afval prognose (`afval`, ruimtemeesters_prognose — to 2030)
- ➕ Envelope (p25/p75) per tile — only TSA-Engine source supports this; CBS-prognose does not (per `project_forecast_confidence.md`).

**Blocker.** Today only bevolking has both TSA *and* a confidence interval. Hernieuwbaar/energie/afval have prognose rows but without populated `confidence_lower/upper`. Need to backfill.

---

### `groeianalyse` — Wonen — **Priority P1**

**Current.** Single source (`bevolking`), 4 tiles. The "compare gemeenten op groei" angle.

**Enriched template:**
- ✅ Top-10 groeigemeenten bevolking
- ➕ Top-10 groeigemeenten huishoudens — same shape, different driver
- ➕ Top-10 groeigemeenten woningvoorraad — supply side
- ➕ Krimpgemeenten tabel (negative growth)
- ➕ Cohort scatter: bevolkingsgroei vs woningvoorraadsgroei — *real* policy lens
- ➕ Net migratie als drijver (needs migratie source 🆕)

---

### `energie` — Duurzaamheid — **Priority P1**

**Current.** 3 tiles, `energie`-only, 4 KPIs, 0 layout. The dim cardinality is rich: sector × fuel_type (5 fuels).

**Enriched template (~7 tiles):**
- ✅ Energieverbruik naar brandstof (`energie`, dim fuel_type, stacked-bar)
- ✅ Energieverbruik totaal over tijd (`energie`, line + references)
- ➕ Aardgasverbruik per woning (`energie`, fuel_type=aardgas, sector=woningen, line) — affordability indicator
- ➕ Elektriciteit per woning (idem)
- ➕ Energieprognose 2030 met envelope (`energie`, ruimtemeesters_prognose)
- ➕ Choropleth aardgasverbruik per gemeente
- ➕ Verhouding aardgas vs elektriciteit — energietransitie-indicator

**KPI strip:** TJ totaal, % aardgas, % elektriciteit, gemiddelde TJ per woning.

---

### `hernieuwbare-energie` — Duurzaamheid — **Priority P1**

**Current.** 2 tiles. Data is **single energy_source (zonnepanelen)** — see data-quality gap above.

**Blocker.** Until `data_hernieuwbaar` is re-synced with wind/biomassa/warmtepompen, this theme can't tell a "mix" story. Either fix the sync or limit the template to zonnepanelen-only and rename it "Zonne-energie" until then.

**Plan if data fixed:**
- Hernieuwbare mix per jaar (stacked-bar energy_source)
- Zonnepanelen per gemeente choropleth
- Prognose tot 2031 met envelope
- KPI: % hernieuwbaar, kW zon, kW wind, kW totaal.

---

### `emissies` — Duurzaamheid — **BLOCKED**

**Current.** 0 tiles, 0 KPIs. Data is **1 geo (NL only) and sector=totaal only**. Can't make a gemeente dashboard from it.

**Action.** Either (a) backfill `data_emissies` from CBS 85668NED at gemeente level with per-sector splits, or (b) deprecate the theme and merge into `duurzaamheid-overzicht`. The CBS table itself may not provide gemeente-level data — needs verification on statline.cbs.nl.

---

### `afval-circulair` & `circulair` — Duurzaamheid — **Priority P2** (overlap concern)

**Current.** Both pull from `afval` only. `afval-circulair` has 2 tiles, `circulair` has 4. **Two themes that share a single source** — feels like a duplicate. Pick one canonical template; the other should redirect or merge.

**Enriched template (whichever survives, ~6 tiles):**
- ✅ Afval naar type (waste_type stacked-bar)
- ➕ Restafval per inwoner (derived: `afval[restafval] / bevolking[totaal]`) — top indicator
- ➕ Scheidingspercentage over tijd
- ➕ Choropleth scheidingspercentage
- ➕ Prognose afval 2030
- ➕ Gemeente top-10 hoogste scheidingspercentage

---

### `energietransitie` & `duurzaamheid-overzicht` — Duurzaamheid — **Priority P2**

Cross-source themes pulling from 2–3 duurzaamheid sources. Same pattern as `overzicht` for wonen — the "demo" template for the supercategory.

---

### `85640ned` — Wonen — **Priority P3** (postcode-level niche)

Postcode-level migration breakdown. 4 065 geos covers all NL postcodes for 2024 only. Specialist tool for population/migration analyses. Keep as-is unless a specific advisor flow needs it; not worth enrichment now.

---

## High-priority work list (sprint plan)

| # | Theme / Task | Type | Est. | Why now |
|---|---|---|---|---|
| 1 | **Fix `woningen.tenure_type` sync** — re-pull CBS 82550NED with huur/koop split | data-quality | M | Blocks the woningen template I just shipped (#131); biggest single-tile usefulness lift across the warehouse |
| 2 | **Enrich `bevolking` template** (8 tiles) | template enrichment | M | Flagship of wonen-supercategory; matches the woningen shape just shipped |
| 3 | **Enrich `woningtekort` template** (8 tiles using the 10-metric goldmine) | template enrichment | M | Most-requested gemeente concern; data already present, dramatically underused |
| 4 | **Enrich `huishoudens` template** (7 tiles) | template enrichment | M | Drives housing demand; pairs naturally with the `bevolking` + `woningen` enrichments above |
| 5 | **Enrich `energie` template** (7 tiles) | template enrichment | M | Most-asked sustainability question (gas costs / electrification); data already exists |
| 6 | **Enrich `overzicht` template** (cross-source 6 tiles) | template enrichment | S-M | The "show-the-wethouder" template — once #2/#3/#4 ship, this is a small remix |
| 7 | **Fix `data_emissies` per-gemeente + per-sector**, then enrich theme | data-quality + template | L | Currently empty; needs CBS data verification first |
| 8 | **Enrich `prognose` template** with all 4 prognose-capable sources | template enrichment | M | Differentiates Ruimtemeesters from pure-CBS dashboards |
| 9 | **Register `nieuwbouw` (CBS 83487NED)** as new data source | data-source registration | L | Forward-looking supply indicator; complements `woningtekort.metric.nieuwbouw` |
| 10 | **Merge `afval-circulair` + `circulair`** into one theme | content consolidation | S | Reduces duplicate-template churn |
| 11 | **Register `WOZ-waarde` (CBS 85036NED)** | data-source registration | L | Affordability metric advisors keep asking for |
| 12 | **Register `bouwvergunningen` (CBS 83451NED)** | data-source registration | L | Forward indicator complementing nieuwbouw |
| 13 | **Register `energielabel` (RVO)** | data-source registration | L | Energie ↔ Wonen crossover; high political salience |
| 14 | **Verify cohort assignments** so cohort-references work for gemeenten that returned `[provincie, land]` only | data-quality | S-M | Surfaced during the woningen enrichment smoke (Almere missing cohort) |

## Recommended order (by dev-min-per-advisor-value, descending)

P0 = "do next, every minute pays off"
- #1 (data-quality unblocks already-shipped template)
- #2, #3, #4 (template enrichments — repeatable 20-min cycles using only existing data)
- #5 (energie — same shape, different supercategory)

P1 = "do once P0 cleared"
- #6 (small remix), #14 (cohort assignment)
- #8 (prognose), #7 (emissies fix)

P2 = "longer-horizon, but each unlocks a real advisor question"
- #9 (nieuwbouw), #11 (WOZ), #13 (energielabel), #10 (theme dedup)

## Notes for the agent picking this up

- The woningen enrichment from #131 is the template-pattern to copy: single idempotent SQL migration in `src/server/db/migrations/` that UPDATEs both `themes.kpi_config` (3–4 entries) and `dashboard_templates.{tiles, layout}` for the matching `theme_slug`. Tile JSON shape: `{id, order, title, description, chartType, dataSource, dimensions, defaultGeoLevel, config}`. Layout JSON shape: `{i, x, y, w, h}` on a 12-col grid.
- References (cohort/provincie/land) are already default-on per `PresentationContext.DEFAULT_REFERENCE_VISIBILITY` — no per-tile flag needed (ADR-003).
- Confidence-bound envelope (p25/p75) is **only** available on `ruimtemeesters_prognose` source rows. The other prognose-capable tables (`energie`, `hernieuwbaar`, `afval`) have prognose rows but with empty confidence columns until those forecast pipelines populate them.
- Smoke each new tile via `curl /api/data/query?source=X&geoCode=GM0034&...` before committing — saves the discover-the-bug-in-PR roundtrip (caught the bevolking-not-NL prognose issue in the #131 cycle).
