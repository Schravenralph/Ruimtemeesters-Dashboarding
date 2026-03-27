/**
 * Sync sustainability CBS data into the new tables.
 *
 * Sources:
 * 1. Zonnestroom (84518NED) — solar per gemeente: installations, capacity
 * 2. Afval (83452NED) — waste per gemeente per inwoner by type
 * 3. Afval totals (70072ned) — from regionale kerncijfers
 *
 * Usage: npx tsx scripts/sync-sustainability.ts
 */

import { getClient, pool, query } from '../src/server/db/pool.js';
import { getObservations, getCodes, parseCbsPeriod, parseCbsRegion, CBS_ATTRIBUTION } from '../src/server/services/cbs/cbs-client.js';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════
// 1. ZONNESTROOM — 84518NED
// ═══════════════════════════════════════════════════════════════════

async function syncZonnestroom() {
  console.log('\n═══ Syncing Zonnestroom (84518NED) ═══');

  const obs = await getObservations('84518NED');
  console.log(`  Fetched ${obs.length} observations`);

  // Log a sample to understand structure
  if (obs.length > 0) {
    console.log(`  Sample: ${JSON.stringify(obs[0]).substring(0, 200)}`);
  }

  const measureMap: Record<string, string> = {
    'M002460': 'aantal_installaties',
    'M002463': 'capaciteit_mw',
  };

  const sectorMap: Record<string, string> = {};
  // Try to get sector codes
  try {
    const codes = await getCodes('84518NED', 'BedrijfstakkenWoningenCodes');
    for (const c of codes) {
      const id = c.Identifier?.trim();
      const title = (c.Title as string)?.toLowerCase() || '';
      if (title.includes('totaal')) sectorMap[id] = 'totaal';
      else if (title.includes('woning')) sectorMap[id] = 'woningen';
      else if (title.includes('bedrijf') || title.includes('landbouw')) sectorMap[id] = 'bedrijven';
      console.log(`    Sector code: ${id} = ${c.Title} -> ${sectorMap[id] || '(skipped)'}`);
    }
  } catch {
    console.log('  Could not load sector codes, using all observations');
  }

  const rows: Array<{ geoCode: string; year: number; energySource: string; metric: string; value: number }> = [];

  for (const o of obs) {
    if (o.Value === null) continue;
    const year = parseCbsPeriod(o.Perioden as string);
    const region = parseCbsRegion(o.RegioS as string);
    if (!year || !region || (region.level !== 'gemeente' && region.level !== 'land')) continue;

    const metric = measureMap[o.Measure as string];
    if (!metric) continue;

    const sectorCode = (o.BedrijfstakkenWoningen as string)?.trim();
    const sector = sectorMap[sectorCode] || 'totaal';

    // Only store totaal to avoid duplicates
    if (sector !== 'totaal' && Object.keys(sectorMap).length > 0) continue;

    const value = metric === 'capaciteit_mw' ? o.Value / 1000 : o.Value;
    rows.push({ geoCode: region.code, year, energySource: 'zonnepanelen', metric, value });
  }

  console.log(`  Mapped ${rows.length} rows`);

  if (rows.length === 0) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const r of rows) {
      await client.query(
        `INSERT INTO data_hernieuwbaar (geo_code, year, energy_source, metric, value, source)
         VALUES ($1, $2, $3, $4, $5, 'cbs_actuals')
         ON CONFLICT (geo_code, year, energy_source, metric, source) DO UPDATE SET value = EXCLUDED.value`,
        [r.geoCode, r.year, r.energySource, r.metric, r.value],
      );
      inserted++;
    }
    await client.query('COMMIT');
    console.log(`  Inserted ${inserted} rows`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  Error: ${err}`);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. AFVAL — 83452NED (per inwoner) + 70072ned (totals)
// ═══════════════════════════════════════════════════════════════════

async function syncAfvalPerInwoner() {
  console.log('\n═══ Syncing Afval per inwoner (83452NED) ═══');

  // Get waste type codes first
  let afvalMap: Record<string, string> = {};
  try {
    const codes = await getCodes('83452NED', 'AfvalsoortCodes');
    for (const c of codes) {
      const id = c.Identifier?.trim();
      const title = (c.Title as string)?.toLowerCase() || '';
      if (title.includes('totaal')) afvalMap[id] = 'totaal';
      else if (title.includes('huishoudelijk rest') && !title.includes('grof')) afvalMap[id] = 'restafval';
      else if (title.includes('grof')) afvalMap[id] = 'grof_restafval';
      else if (title.includes('gft')) afvalMap[id] = 'gft';
      else if (title.includes('oud papier')) afvalMap[id] = 'papier';
      else if (title.includes('glas')) afvalMap[id] = 'glas';
      else if (title.includes('textiel')) afvalMap[id] = 'textiel';
      else if (title.includes('kunststof') || title.includes('pmd')) afvalMap[id] = 'kunststof';
      console.log(`    Afval code: ${id} = ${c.Title} -> ${afvalMap[id] || '(skipped)'}`);
    }
  } catch (err) {
    console.log(`  Could not load afval codes: ${err}`);
  }

  const obs = await getObservations('83452NED');
  console.log(`  Fetched ${obs.length} observations`);

  if (obs.length > 0) {
    console.log(`  Sample: ${JSON.stringify(obs[0]).substring(0, 200)}`);
  }

  const rows: Array<{ geoCode: string; year: number; wasteType: string; metric: string; value: number }> = [];

  for (const o of obs) {
    if (o.Value === null) continue;
    const year = parseCbsPeriod(o.Perioden as string);
    const region = parseCbsRegion(o.RegioS as string);
    if (!year || !region || region.level !== 'gemeente') continue;

    const afvalCode = (o.Afvalsoort as string)?.trim();
    const wasteType = afvalMap[afvalCode];
    if (!wasteType) continue;

    rows.push({ geoCode: region.code, year, wasteType, metric: 'per_inwoner_kg', value: o.Value });
  }

  console.log(`  Mapped ${rows.length} rows`);

  if (rows.length === 0) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      await client.query(
        `INSERT INTO data_afval (geo_code, year, waste_type, metric, value, source)
         VALUES ($1, $2, $3, $4, $5, 'cbs_actuals')
         ON CONFLICT (geo_code, year, waste_type, metric, source) DO UPDATE SET value = EXCLUDED.value`,
        [r.geoCode, r.year, r.wasteType, r.metric, r.value],
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

async function syncAfvalFromRegionaal() {
  console.log('\n═══ Syncing Afval totals from 70072ned ═══');

  const measures: Record<string, string> = {
    'A025448': 'totaal',
    'A025450': 'restafval',
    'A025454': 'gft',
  };

  let totalInserted = 0;
  for (const [code, wasteType] of Object.entries(measures)) {
    console.log(`  Fetching ${wasteType} (${code})...`);
    const filter = `Measure eq '${code}'`;
    const obs = await getObservations('70072ned', filter);

    const rows: Array<[string, number, number]> = [];
    for (const o of obs) {
      if (o.Value === null) continue;
      const year = parseCbsPeriod(o.Perioden as string);
      const region = parseCbsRegion(o.RegioS as string);
      if (!year || !region || (region.level !== 'gemeente' && region.level !== 'land')) continue;
      rows.push([region.code, year, o.Value]);
    }

    if (rows.length === 0) continue;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const [geoCode, year, value] of rows) {
        await client.query(
          `INSERT INTO data_afval (geo_code, year, waste_type, metric, value, source)
           VALUES ($1, $2, $3, 'kg_per_inwoner', $4, 'cbs_actuals')
           ON CONFLICT (geo_code, year, waste_type, metric, source) DO UPDATE SET value = EXCLUDED.value`,
          [geoCode, year, wasteType, value],
        );
      }
      await client.query('COMMIT');
      totalInserted += rows.length;
      console.log(`    ${rows.length} rows`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`    Error: ${err}`);
    } finally {
      client.release();
    }
  }
  console.log(`  Total: ${totalInserted} rows`);
}

// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Sustainability CBS Data Sync                    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const start = Date.now();

  await syncZonnestroom();
  await syncAfvalPerInwoner();
  await syncAfvalFromRegionaal();

  // Verify
  const counts = await query(`
    SELECT 'hernieuwbaar' as tbl, COUNT(*) as cnt, COUNT(DISTINCT geo_code) as geos, MIN(year) as min_yr, MAX(year) as max_yr FROM data_hernieuwbaar
    UNION ALL
    SELECT 'afval', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_afval
    UNION ALL
    SELECT 'energie', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_energie
    UNION ALL
    SELECT 'emissies', COUNT(*), COUNT(DISTINCT geo_code), MIN(year), MAX(year) FROM data_emissies
  `);

  console.log('\n═══ Summary ═══');
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
