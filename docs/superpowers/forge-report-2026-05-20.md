# Forge Report — 2026-05-20

**Wall clock:** 82 min
**Cycles completed:** 7
**Features shipped:** 7 merged, 0 pending

## Shipped Features

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 1 | Economie scaffold — Bedrijvigheid theme (CBS 81575NED) | [#174](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/174) | merged | medium |
| 2 | afval-circulair 2→5 tiles + per_inwoner_kg metric fix | [#175](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/175) | merged | small |
| 3 | Economie — Inkomen theme (CBS 86161NED) | [#176](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/176) | merged | medium |
| 4 | Inkomen value × 1000 magnitude correction (#177) | [#178](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/178) | merged | small |
| 5 | Mobiliteit scaffold — Voertuigenpark theme (CBS 85236NED) | [#179](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/179) | merged | medium |
| 6 | Veiligheid scaffold — Criminaliteit theme (CBS 83648NED) | [#180](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/180) | merged | medium |
| 7 | Economie — Werkgelegenheid theme (CBS 86276NED) | [#181](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/181) | merged | medium |

## Impact

### New use cases enabled

- **Full Stage-4 supercategory coverage**: Wonen + Duurzaamheid + Economie + Mobiliteit + Veiligheid are all represented now. The platform answers "overstijgend monitorend systeem" — the explicit user feedback from 2026-05-15.
- **Economie has 3 themes** (Bedrijvigheid + Inkomen + Werkgelegenheid) telling a coherent economic story per gemeente — werkgevers, verdiensten, werkers.
- Each new theme ships with realistic gemeente-level data verified against Amsterdam — vestigingen 120K→216K, inkomen €24K→€44K, personenauto's 235K→260K, misdrijven 82K, werkzame personen 425K→553K.

### Existing UX enriched

- afval-circulair from 2 to 5 tiles, surfacing the wind/biomass/biogas/etc. waste stream comparisons that the data already supported.
- Default afval metric switched from `kg_per_inwoner` (which held totals — wrong) to `per_inwoner_kg` (realistic per-capita kilos). Amsterdam restafval now reads 345 → 185 kg/inwoner over 2001-2030.

### Infrastructure expanded

- `valueScale` config in cbs-generic-sync — handles CBS's published-in-thousands metrics (inkomen, werkgelegenheid) so the stored values match the unit string and downstream formatters work without per-tile scaling logic.
- New CBS data sources: vestigingen (81575NED), inkomen (86161NED), voertuigen (85236NED), veiligheid_misdrijven (83648NED), werkgelegenheid (86276NED).
- 4 new icons registered in Sidebar (Briefcase, Banknote, Car, Shield).
- 11 migrations applied (056-066): scaffolds, data fixes, KPI fixes.

## Issues closed

- #88 (scaffold Economie), #89 (scaffold Mobiliteit), #90 (scaffold Veiligheid) — the original "Theme audit" stubs.
- #177 (Inkomen magnitude follow-up from cycle 3).

## Unfinished / Next session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | Cohort references on time-series tiles | Most line tiles say "cohort/provincie/landelijk volgt zodra de reference-pipeline aangesloten is" — the snapshot path supports it but `/api/data/timeseries` doesn't yet. High value-per-line-of-code. | M |
| 2 | Cross-domain "Brede welvaart" overzicht theme | One tile per supercategory, mosaic view of where a gemeente sits on every domain. Synthesizes today's work into a single landing. | M |
| 3 | Veiligheid per-1000-inwoners rate | Absolute counts make Amsterdam look "worse" than Drenthe — switch the default to M004200_4. | S |
| 4 | Mobiliteit second theme — verkeersveiligheid (verkeersdoden, ongevallen) | Same supercategory needs depth like Economie got. | M |
| 5 | Werkloze beroepsbevolking tile in werkgelegenheid theme | Unemployment narrative complements the employment count. Same source. | S |
| 6 | ADR-005 follow-up — consolidate `tiles` ↔ `dashboard_templates.tiles` | Two-store divergence keeps biting (had to write 054+055 for the same logical tile in cycle 2). | M |

## Observations

### What went well
- The scaffold pattern from cycle 1 (Bedrijvigheid) was clean enough to replicate 4 more times without significant rework. Migration files are largely declarative SQL — easy to read in PRs.
- Bugbot found real bugs early (Briefcase casing, KPI deltaDirection enum, currency format, magnitude scaling). Each fix took <10 min. The 2-round cap held — only one PR needed round-3 (#178 — and even that was a follow-up issue, not a third round on the same PR).
- `valueScale` introduced in cycle 4 paid for itself by cycle 7 — werkgelegenheid wouldn't have rendered correctly without it.

### What surfaced
- Two-store tile divergence (`tiles` table vs. `dashboard_templates.tiles` jsonb) — cycle 2 had to write two migrations for one logical change.
- KPI schema is enforced in code (deltaDirection enum, format enum) but not in SQL. The seed migrations had no compile-time check. Probably worth a CHECK constraint or a typed seed-helper.
- CBS publishes some measures in thousands without flagging it in the OData metadata — caught by visual eyeball ("44 is wrong for Amsterdam income"), not by tooling. A simple sanity-check ("does the headline value pass smell test for the focal-gemeente?") would catch this.

### Cycle rhythm
Average cycle: 11.7 min wall-clock (82 min / 7). Range: 4 min (cycle 4 magnitude fix) to 13 min (cycles 1+5+6 scaffolds with sync). Healthy.

The session hit a natural stopping point — the major breadth narrative (4 supercategories + Economie at 3 themes) closed at cycle 7. Continuing would have started to feel like padding rather than building.
