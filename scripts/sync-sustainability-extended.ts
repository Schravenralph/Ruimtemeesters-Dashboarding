/**
 * Extended sustainability CBS sync — adds energy consumption, newer solar data,
 * heating installations, and income context data.
 *
 * Sources:
 * 1. 81528NED — Gas & electricity per dwelling per gemeente
 * 2. 85005NED — Zonnestroom 2019+ per gemeente (extends 84518NED)
 * 3. 84948NED — Heating installations per gemeente
 * 4. 85064NED — Household income per gemeente (socio-economic context)
 *
 * Usage: npx tsx scripts/sync-sustainability-extended.ts
 */

import { getClient, pool, query } from '../src/server/db/pool.js';
import { getObservations, getCodes, parseCbsPeriod, parseCbsRegion, CBS_ATTRIBUTION } from '../src/server/services/cbs/cbs-client.js';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════
// 1. ENERGY CONSUMPTION — 81528NED (gas + electricity per dwelling)
// ═══════════════════════════════════════════════════════════════════

async function syncEnergieVerbruik() {
  console.log('\n═══ Syncing Energieverbruik woningen (81528NED) ═══');

  const measureMap: Record<string, { fuelType: string; unit: string }> = {
    'M000219': { fuelType: 'aardgas', unit: 'm3' },
    'M000221': { fuelType: 'elektriciteit', unit: 'kWh' },
    'M007944': { fuelType: 'elektriciteit_netto', unit: 'kWh' },
    'M002874': { fuelType: 'stadsverwarming', unit: 'GJ' },
  };

  // Get housing type codes
  let woningMap: Record<string, string> = {};
  try {
    const codes = await getCodes('81528NED', 'WoningkenmerkenCodes');
    for (const c of codes) {
      const id = c.Identifier?.trim();
      const title = (c.Title as string)?.toLowerCase() || '';
      if (title.includes('totaal')) woningMap[id] = 'totaal';
      else if (title.includes('tussenwoning')) woningMap[id] = 'tussenwoning';
      else if (title.includes('hoekwoning')) woningMap[id] = 'hoekwoning';
      else if (title.includes('twee-onder-een-kap')) woningMap[id] = 'twee_onder_een_kap';
      else if (title.includes('vrijstaand')) woningMap[id] = 'vrijstaand';
      else if (title.includes('appartement') || title.includes('meergezins')) woningMap[id] = 'appartement';
      console.log(`    Woning: ${id} = ${c.Title} -> ${woningMap[id] || '(skip)'}`);
    }
  } catch { console.log('  Could not load woningkenmerken codes'); }

  for (const [measureCode, mapping] of Object.entries(measureMap)) {
    console.log(`  Fetching ${mapping.fuelType} (${measureCode})...`);
    const filter = `Measure eq '${measureCode}'`;
    const obs = await getObservations('81528NED', filter);
    console.log(`    ${obs.length} observations`);

    const rows: Array<[string, number, string, string, number]> = [];
    for (const o of obs) {
      if (o.Value === null) continue;
      const year = parseCbsPeriod(o.Perioden as string);
      const region = parseCbsRegion(o.RegioS as string);
      if (!year || !region || (region.level !== 'gemeente' && region.level !== 'land')) continue;

      const woningCode = (o.Woningkenmerken as string)?.trim();
      const woningType = woningMap[woningCode] || null;
      // Only store totaal to avoid complexity
      if (woningType !== 'totaal' && Object.keys(woningMap).length > 0) continue;

      rows.push([region.code, year, 'woningen', mapping.fuelType, o.Value]);
    }

    if (rows.length === 0) { console.log('    No rows mapped'); continue; }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const [geoCode, year, sector, fuelType, value] of rows) {
        await client.query(
          `INSERT INTO data_energie (geo_code, year, sector, fuel_type, value, source)
           VALUES ($1, $2, $3, $4, $5, 'cbs_actuals')
           ON CONFLICT (geo_code, year, sector, fuel_type, source) DO UPDATE SET value = EXCLUDED.value`,
          [geoCode, year, sector, fuelType, value],
        );
      }
      await client.query('COMMIT');
      console.log(`    Inserted ${rows.length} rows`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`    Error: ${err}`);
    } finally {
      client.release();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. ZONNESTROOM 2019+ — 85005NED (extends 84518NED which has 2012-2018)
// ═══════════════════════════════════════════════════════════════════

async function syncZonnestroomNieuw() {
  console.log('\n═══ Syncing Zonnestroom 2019+ (85005NED) ═══');

  const measureMap: Record<string, string> = {
    'M002460': 'aantal_installaties',
    'M002463': 'capaciteit_mw',
  };

  let sectorMap: Record<string, string> = {};
  try {
    const codes = await getCodes('85005NED', 'SectorEnVermogensklasseCodes');
    for (const c of codes) {
      const id = c.Identifier?.trim();
      const title = (c.Title as string)?.toLowerCase() || '';
      if (title.includes('totaal') || title.includes('alle')) sectorMap[id] = 'totaal';
      else if (title.includes('woning')) sectorMap[id] = 'woningen';
      console.log(`    Sector: ${id} = ${c.Title} -> ${sectorMap[id] || '(skip)'}`);
    }
  } catch { console.log('  Could not load sector codes'); }

  const obs = await getObservations('85005NED');
  console.log(`  Fetched ${obs.length} observations`);

  const rows: Array<[string, number, string, number]> = [];
  for (const o of obs) {
    if (o.Value === null) continue;
    const year = parseCbsPeriod(o.Perioden as string);
    const region = parseCbsRegion(o.RegioS as string);
    if (!year || !region || (region.level !== 'gemeente' && region.level !== 'land')) continue;

    const metric = measureMap[o.Measure as string];
    if (!metric) continue;

    const sectorCode = (o.SectorEnVermogensklasse as string)?.trim();
    const sector = sectorMap[sectorCode];
    if (sector !== 'totaal') continue;

    const value = metric === 'capaciteit_mw' ? o.Value / 1000 : o.Value;
    rows.push([region.code, year, metric, value]);
  }

  console.log(`  Mapped ${rows.length} rows`);

  if (rows.length === 0) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const [geoCode, year, metric, value] of rows) {
      await client.query(
        `INSERT INTO data_hernieuwbaar (geo_code, year, energy_source, metric, value, source)
         VALUES ($1, $2, 'zonnepanelen', $3, $4, 'cbs_actuals')
         ON CONFLICT (geo_code, year, energy_source, metric, source) DO UPDATE SET value = EXCLUDED.value`,
        [geoCode, year, metric, value],
      );
    }
    await client.query('COMMIT');
    console.log(`  Inserted ${rows.length} rows`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  Error: ${err}`);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. HEATING INSTALLATIONS — 84948NED
// ═══════════════════════════════════════════════════════════════════

async function syncVerwarming() {
  console.log('\n═══ Syncing Verwarmingsinstallaties (84948NED) ═══');

  let installMap: Record<string, string> = {};
  try {
    const codes = await getCodes('84948NED', 'TypeVerwarmingsinstallatieCodes');
    for (const c of codes) {
      const id = c.Identifier?.trim();
      const title = (c.Title as string)?.toLowerCase() || '';
      if (title.includes('totaal')) installMap[id] = 'totaal';
      else if (title.includes('cv-ketel') || title.includes('gasketel')) installMap[id] = 'gasketel';
      else if (title.includes('warmtepomp')) installMap[id] = 'warmtepomp';
      else if (title.includes('stadsverwarming') || title.includes('blokverwarming')) installMap[id] = 'stadsverwarming';
      else if (title.includes('elektrisch')) installMap[id] = 'elektrisch';
      console.log(`    Install: ${id} = ${c.Title} -> ${installMap[id] || '(skip)'}`);
    }
  } catch { console.log('  Could not load installatie codes'); }

  const obs = await getObservations('84948NED');
  console.log(`  Fetched ${obs.length} observations`);

  if (obs.length > 0) {
    console.log(`  Sample: ${JSON.stringify(obs[0]).substring(0, 200)}`);
  }

  const rows: Array<[string, number, string, number]> = [];
  for (const o of obs) {
    if (o.Value === null) continue;
    const year = parseCbsPeriod(o.Perioden as string);
    const region = parseCbsRegion(o.RegioS as string);
    if (!year || !region || (region.level !== 'gemeente' && region.level !== 'land')) continue;

    const installCode = (o.TypeVerwarmingsinstallatie as string)?.trim();
    const installType = installMap[installCode];
    if (!installType) continue;

    rows.push([region.code, year, installType, o.Value]);
  }

  console.log(`  Mapped ${rows.length} rows`);

  if (rows.length === 0) return;

  // Store in data_energie with sector='verwarming'
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const [geoCode, year, fuelType, value] of rows) {
      await client.query(
        `INSERT INTO data_energie (geo_code, year, sector, fuel_type, value, source)
         VALUES ($1, $2, 'verwarming', $3, $4, 'cbs_actuals')
         ON CONFLICT (geo_code, year, sector, fuel_type, source) DO UPDATE SET value = EXCLUDED.value`,
        [geoCode, year, fuelType, value],
      );
    }
    await client.query('COMMIT');
    console.log(`  Inserted ${rows.length} rows`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  Error: ${err}`);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Extended Sustainability CBS Sync                    ║');
  console.log('║  Energy, Solar 2019+, Heating                        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const start = Date.now();

  await syncEnergieVerbruik();
  await syncZonnestroomNieuw();
  await syncVerwarming();

  // Summary
  const counts = await query(`
    SELECT 'energie' as tbl, COUNT(*) as cnt, COUNT(DISTINCT geo_code) as geos, MIN(year) as min_yr, MAX(year) as max_yr FROM data_energie
    UNION ALL
    SELECT 'hernieuwbaar', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_hernieuwbaar
    UNION ALL
    SELECT 'afval', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_afval
    UNION ALL
    SELECT 'emissies', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_emissies
  `);

  console.log('\n═══ All Sustainability Data ═══');
  for (const r of counts.rows) {
    console.log(`  ${r.tbl}: ${r.cnt} rows, ${r.geos || 0} areas, ${r.min_yr || '-'}-${r.max_yr || '-'}`);
  }

  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(0)}s`);
  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
