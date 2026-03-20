/**
 * CBS Data Sync Service.
 *
 * Pulls real data from CBS StatLine into our PostgreSQL database.
 * All data is sourced from CBS (Centraal Bureau voor de Statistiek).
 *
 * Tables synced:
 * - 03759ned: Bevolking per geslacht, leeftijd, regio (population)
 * - 71486ned: Huishoudens per samenstelling, regio (households)
 * - 82550NED: Woningvoorraad per eigendom, type, regio (housing stock)
 *
 * Attribution: Bron: CBS, StatLine. Licentie: CC-BY 4.0.
 */

import { getClient, query } from '../../db/pool.js';
import {
  getObservations, getCodes, getRegioCodes, getMeasureCodes,
  parseCbsPeriod, parseCbsRegion,
  CBS_TABLES, CBS_ATTRIBUTION,
  type CbsCodeItem,
} from './cbs-client.js';

interface SyncResult {
  source: string;
  cbsTable: string;
  rowsFetched: number;
  rowsInserted: number;
  errors: string[];
  duration: number;
  attribution: string;
}

/**
 * Sync population data from CBS table 03759ned.
 *
 * Dimensions: Geslacht (gender), Leeftijd (age), BurgerlijkeStaat, RegioS, Perioden
 * Measure: M000352 = "Bevolking op 1 januari (aantal)"
 */
export async function syncBevolking(yearFilter?: number): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let rowsFetched = 0;
  let rowsInserted = 0;

  try {
    // Fetch code lookups
    const [geslachtCodes, leeftijdCodes, regioCodes] = await Promise.all([
      getCodes(CBS_TABLES.bevolking, 'GeslachtCodes'),
      getCodes(CBS_TABLES.bevolking, 'LeeftijdCodes'),
      getRegioCodes(CBS_TABLES.bevolking),
    ]);

    const geslachtMap = new Map(geslachtCodes.map(c => [c.Identifier, c.Title]));
    const leeftijdMap = new Map(leeftijdCodes.map(c => [c.Identifier, c.Title]));
    const regioMap = new Map(regioCodes.map(c => [c.Identifier, c.Title]));

    // Build filter: only yearly data, total marital status, gemeente + national level
    let filter = "Measure eq 'M000352' and BurgerlijkeStaat eq 'T001019'";
    if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    const observations = await getObservations(CBS_TABLES.bevolking, filter);
    rowsFetched = observations.length;

    /**
     * Map CBS individual age codes (10000=total, 10010=0yr, 10100=1yr, ...) to age groups.
     * CBS codes: 10000=totaal, 10010=0, 10100=1, 10200=2, ... 11400=14, 11500=15, etc.
     * The pattern is: 10000 + (age * 100), except age 0 = 10010.
     */
    function codeToAge(code: string): number | null {
      const num = parseInt(code, 10);
      if (num === 10000) return -1; // totaal
      if (num === 10010) return 0;
      if (num >= 10100 && num <= 20500) return Math.round((num - 10000) / 100);
      return null;
    }

    function ageToGroup(age: number): string | null {
      if (age === -1) return 'totaal';
      if (age >= 0 && age <= 14) return '0-14';
      if (age >= 15 && age <= 24) return '15-24';
      if (age >= 25 && age <= 44) return '25-44';
      if (age >= 45 && age <= 64) return '45-64';
      if (age >= 65 && age <= 79) return '65-79';
      if (age >= 80) return '80+';
      return null;
    }

    const genderMapping: Record<string, string> = {
      'T001038': 'totaal',
      '3000': 'man',
      '4000': 'vrouw',
    };

    // Aggregate: region+year+ageGroup+gender -> sum
    const aggregated = new Map<string, { geoCode: string; geoName: string; geoLevel: string; year: number; ageGroup: string; gender: string; value: number }>();

    for (const obs of observations) {
      if (obs.Value === null) continue;

      const year = parseCbsPeriod(obs.Perioden as string);
      const region = parseCbsRegion(obs.RegioS as string);
      if (!year || !region) continue;
      if (region.level !== 'gemeente' && region.level !== 'land') continue;

      const age = codeToAge(obs.Leeftijd as string);
      if (age === null) continue;
      const ageGroup = ageToGroup(age);
      const gender = genderMapping[obs.Geslacht as string];
      if (!ageGroup || !gender) continue;

      const geoName = regioMap.get((obs.RegioS as string).trim()) || region.code;
      const key = `${region.code}|${year}|${ageGroup}|${gender}`;

      const existing = aggregated.get(key);
      if (existing) {
        existing.value += obs.Value;
      } else {
        aggregated.set(key, {
          geoCode: region.code,
          geoName: geoName.trim(),
          geoLevel: region.level,
          year,
          ageGroup,
          gender,
          value: obs.Value,
        });
      }
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const entry of aggregated.values()) {
        await client.query(
          `INSERT INTO geo_areas (code, name, level, parent_code)
           VALUES ($1, $2, $3, NULL)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
          [entry.geoCode, entry.geoName, entry.geoLevel],
        );

        await client.query(
          `INSERT INTO data_bevolking (geo_code, year, age_group, gender, value)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (geo_code, year, age_group, gender)
           DO UPDATE SET value = EXCLUDED.value`,
          [entry.geoCode, entry.year, entry.ageGroup, entry.gender, Math.round(entry.value)],
        );
        rowsInserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      client.release();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to fetch CBS data');
  }

  return {
    source: 'bevolking',
    cbsTable: CBS_TABLES.bevolking,
    rowsFetched,
    rowsInserted,
    errors,
    duration: Date.now() - startTime,
    attribution: CBS_ATTRIBUTION,
  };
}

/**
 * Sync household data from CBS table 71486ned.
 */
export async function syncHuishoudens(yearFilter?: number): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let rowsFetched = 0;
  let rowsInserted = 0;

  try {
    const [measureCodes, regioCodes] = await Promise.all([
      getMeasureCodes(CBS_TABLES.huishoudens),
      getRegioCodes(CBS_TABLES.huishoudens),
    ]);

    const measureMap = new Map(measureCodes.map(c => [c.Identifier, c.Title]));
    const regioMap = new Map(regioCodes.map(c => [c.Identifier, c.Title]));

    // Key measures for household types
    const householdMeasures: Record<string, string> = {};
    for (const [id, title] of measureMap) {
      const lower = title.toLowerCase();
      if (lower.includes('eenpersoons')) householdMeasures[id] = 'eenpersoons';
      else if (lower.includes('niet-gehuwd') && lower.includes('zonder kind')) householdMeasures[id] = 'paar_zonder_kinderen';
      else if (lower.includes('gehuwd') && lower.includes('zonder kind')) householdMeasures[id] = 'paar_zonder_kinderen';
      else if (lower.includes('met kinderen') || lower.includes('met kind')) householdMeasures[id] = 'paar_met_kinderen';
      else if (lower.includes('eenouder')) householdMeasures[id] = 'eenouder';
      else if (lower.includes('totaal') && lower.includes('huishouden')) householdMeasures[id] = 'totaal';
    }

    let filter = "LeeftijdReferentiepersoon eq '10000'"; // All ages
    if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    const observations = await getObservations(CBS_TABLES.huishoudens, filter);
    rowsFetched = observations.length;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const obs of observations) {
        if (obs.Value === null) continue;

        const year = parseCbsPeriod(obs.Perioden as string);
        const region = parseCbsRegion(obs.RegioS as string);
        const hhType = householdMeasures[obs.Measure];
        if (!year || !region || !hhType) continue;
        if (region.level !== 'gemeente' && region.level !== 'land') continue;

        const geoName = regioMap.get((obs.RegioS as string).trim()) || region.code;
        await client.query(
          `INSERT INTO geo_areas (code, name, level, parent_code)
           VALUES ($1, $2, $3, NULL)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
          [region.code, geoName.trim(), region.level],
        );

        await client.query(
          `INSERT INTO data_huishoudens (geo_code, year, household_type, value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (geo_code, year, household_type)
           DO UPDATE SET value = EXCLUDED.value`,
          [region.code, year, hhType, Math.round(obs.Value)],
        );
        rowsInserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      client.release();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to fetch CBS data');
  }

  return {
    source: 'huishoudens',
    cbsTable: CBS_TABLES.huishoudens,
    rowsFetched,
    rowsInserted,
    errors,
    duration: Date.now() - startTime,
    attribution: CBS_ATTRIBUTION,
  };
}

/**
 * Sync housing stock data from CBS table 82550NED.
 */
export async function syncWoningen(yearFilter?: number): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let rowsFetched = 0;
  let rowsInserted = 0;

  try {
    const [measureCodes, woningtypeCodes, regioCodes] = await Promise.all([
      getMeasureCodes(CBS_TABLES.woningen),
      getCodes(CBS_TABLES.woningen, 'WoningtypeCodes'),
      getRegioCodes(CBS_TABLES.woningen),
    ]);

    const regioMap = new Map(regioCodes.map(c => [c.Identifier, c.Title]));

    // Filter for total building year class (all years)
    let filter = "Bouwjaarklasse eq 'T001018'"; // Totaal
    if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    const observations = await getObservations(CBS_TABLES.woningen, filter);
    rowsFetched = observations.length;

    // Map woningtype to our categories
    const woningtypeMapping: Record<string, string> = {};
    for (const code of woningtypeCodes) {
      const lower = code.Title.toLowerCase();
      if (lower.includes('eengezins')) woningtypeMapping[code.Identifier] = 'eengezins';
      else if (lower.includes('meergezins')) woningtypeMapping[code.Identifier] = 'meergezins';
      else if (lower.includes('totaal')) woningtypeMapping[code.Identifier] = 'totaal';
    }

    // Map measures to tenure type
    const measureMapping: Record<string, string> = {};
    for (const code of measureCodes) {
      const lower = code.Title.toLowerCase();
      if (lower.includes('koopwoning') || lower.includes('eigen')) measureMapping[code.Identifier] = 'eigendom';
      else if (lower.includes('huurwoning') || lower.includes('huur')) measureMapping[code.Identifier] = 'huur';
      else if (lower.includes('totaal') && lower.includes('woning')) measureMapping[code.Identifier] = 'totaal';
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const obs of observations) {
        if (obs.Value === null) continue;

        const year = parseCbsPeriod(obs.Perioden as string);
        const region = parseCbsRegion(obs.RegioS as string);
        if (!year || !region) continue;
        if (region.level !== 'gemeente' && region.level !== 'land') continue;

        const dwellingType = woningtypeMapping[obs.Woningtype as string] || 'onbekend';
        const tenureType = measureMapping[obs.Measure] || 'onbekend';

        const geoName = regioMap.get((obs.RegioS as string).trim()) || region.code;
        await client.query(
          `INSERT INTO geo_areas (code, name, level, parent_code)
           VALUES ($1, $2, $3, NULL)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
          [region.code, geoName.trim(), region.level],
        );

        await client.query(
          `INSERT INTO data_woningen (geo_code, year, tenure_type, dwelling_type, value)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (geo_code, year, tenure_type, dwelling_type)
           DO UPDATE SET value = EXCLUDED.value`,
          [region.code, year, tenureType, dwellingType, Math.round(obs.Value)],
        );
        rowsInserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      client.release();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to fetch CBS data');
  }

  return {
    source: 'woningen',
    cbsTable: CBS_TABLES.woningen,
    rowsFetched,
    rowsInserted,
    errors,
    duration: Date.now() - startTime,
    attribution: CBS_ATTRIBUTION,
  };
}

/**
 * Run full sync of all CBS data sources.
 */
export async function syncAllCbsData(yearFilter?: number): Promise<SyncResult[]> {
  console.log(`[CBS Sync] Starting full sync${yearFilter ? ` for year ${yearFilter}` : ''}...`);
  console.log(`[CBS Sync] ${CBS_ATTRIBUTION}`);

  const results: SyncResult[] = [];

  results.push(await syncBevolking(yearFilter));
  console.log(`[CBS Sync] Bevolking: ${results[0].rowsInserted} rows (${results[0].duration}ms)`);

  results.push(await syncHuishoudens(yearFilter));
  console.log(`[CBS Sync] Huishoudens: ${results[1].rowsInserted} rows (${results[1].duration}ms)`);

  results.push(await syncWoningen(yearFilter));
  console.log(`[CBS Sync] Woningen: ${results[2].rowsInserted} rows (${results[2].duration}ms)`);

  const totalInserted = results.reduce((sum, r) => sum + r.rowsInserted, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  console.log(`[CBS Sync] Complete: ${totalInserted} total rows, ${totalErrors} errors`);

  return results;
}
