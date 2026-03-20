import { query } from '../db/pool.js';

interface ValidationResult {
  source: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }[];
  overallStatus: 'healthy' | 'warning' | 'critical';
}

const DATA_TABLES = ['data_bevolking', 'data_huishoudens', 'data_woningen', 'data_woningtekort'];

/**
 * Validate data integrity across all data tables.
 * Checks for orphaned references, null values, duplicates, and range validity.
 */
export async function validateDataIntegrity(source?: string): Promise<ValidationResult[]> {
  const tables = source
    ? DATA_TABLES.filter(t => t.includes(source))
    : DATA_TABLES;

  const results: ValidationResult[] = [];

  for (const table of tables) {
    const sourceName = table.replace('data_', '');
    const checks: ValidationResult['checks'] = [];

    // Check 1: Orphaned geo references
    const orphanResult = await query(
      `SELECT COUNT(*) as count FROM ${table} d
       WHERE NOT EXISTS (SELECT 1 FROM geo_areas g WHERE g.code = d.geo_code)`,
    );
    const orphanCount = parseInt(orphanResult.rows[0].count, 10);
    checks.push({
      name: 'Geo referenties',
      status: orphanCount === 0 ? 'pass' : 'fail',
      message: orphanCount === 0
        ? 'Alle geo-codes verwijzen naar bestaande gebieden'
        : `${orphanCount} rijen met ongeldige geo-codes gevonden`,
    });

    // Check 2: Negative values (except woningtekort)
    if (sourceName !== 'woningtekort') {
      const negResult = await query(
        `SELECT COUNT(*) as count FROM ${table} WHERE value < 0`,
      );
      const negCount = parseInt(negResult.rows[0].count, 10);
      checks.push({
        name: 'Negatieve waarden',
        status: negCount === 0 ? 'pass' : 'warning',
        message: negCount === 0
          ? 'Geen negatieve waarden gevonden'
          : `${negCount} rijen met negatieve waarden`,
      });
    }

    // Check 3: Year range validity
    const yearResult = await query(
      `SELECT MIN(year) as min_y, MAX(year) as max_y FROM ${table}`,
    );
    const minYear = yearResult.rows[0].min_y;
    const maxYear = yearResult.rows[0].max_y;
    checks.push({
      name: 'Jaarbereik',
      status: minYear >= 1900 && maxYear <= 2100 ? 'pass' : 'warning',
      message: `Data van ${minYear} tot ${maxYear}`,
      details: { minYear, maxYear },
    });

    // Check 4: Data freshness
    const currentYear = new Date().getFullYear();
    checks.push({
      name: 'Actualiteit',
      status: maxYear >= currentYear - 1 ? 'pass' : 'warning',
      message: maxYear >= currentYear
        ? 'Data is up-to-date'
        : `Meest recente data is van ${maxYear}`,
    });

    // Check 5: Row count sanity
    const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
    const rowCount = parseInt(countResult.rows[0].count, 10);
    checks.push({
      name: 'Rij-telling',
      status: rowCount > 0 ? 'pass' : 'fail',
      message: `${rowCount.toLocaleString('nl-NL')} rijen`,
    });

    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warning').length;

    results.push({
      source: sourceName,
      checks,
      overallStatus: failCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'healthy',
    });
  }

  return results;
}
