/**
 * CBS (Centraal Bureau voor de Statistiek) OData v1 API client.
 *
 * Data source: https://opendata.cbs.nl
 * API docs: https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/snelstartgids-odata-v4
 *
 * All data from CBS is published under CC-BY 4.0 license.
 * Source attribution: "Bron: CBS, StatLine"
 */

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';

interface ODataResponse<T> {
  '@odata.context'?: string;
  '@odata.nextLink'?: string;
  value: T[];
}

interface CbsObservation {
  Id: number;
  Measure: string;
  Value: number | null;
  ValueAttribute: string;
  StringValue: string | null;
  [key: string]: unknown; // Dynamic dimension fields
}

interface CbsCodeItem {
  Identifier: string;
  Index: number;
  Title: string;
  Description?: string;
  DimensionGroupId?: number;
}

/**
 * Fetch data from CBS OData API with automatic pagination.
 * CBS returns max 100,000 rows per request; this follows nextLink for full data.
 */
export async function cbsFetch<T>(url: string, maxPages: number = 50): Promise<T[]> {
  const allResults: T[] = [];
  let currentUrl: string | null = url;
  let page = 0;

  while (currentUrl && page < maxPages) {
    console.log(`[CBS] Fetching page ${page + 1}: ${currentUrl.substring(0, 120)}...`);

    let data: ODataResponse<T> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(currentUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`CBS API error: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
        break;
      } catch (err) {
        if (attempt >= 2) throw err;
        const delay = 1000 * 2 ** attempt; // 1s, 2s
        console.warn(`[CBS] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    allResults.push(...data!.value);

    currentUrl = data!['@odata.nextLink'] || null;
    page++;
  }

  console.log(`[CBS] Fetched ${allResults.length} records in ${page} page(s)`);
  return allResults;
}

/**
 * Get observations for a CBS table.
 */
export async function getObservations(tableId: string, filter?: string): Promise<CbsObservation[]> {
  let url = `${CBS_BASE_URL}/${tableId}/Observations`;
  if (filter) {
    url += `?$filter=${encodeURIComponent(filter)}`;
  }
  return cbsFetch<CbsObservation>(url);
}

/**
 * Get code descriptions (e.g., gemeente names, measure descriptions).
 */
export async function getCodes(tableId: string, dimension: string): Promise<CbsCodeItem[]> {
  const url = `${CBS_BASE_URL}/${tableId}/${dimension}`;
  return cbsFetch<CbsCodeItem>(url, 1);
}

/**
 * Get region codes (gemeente, provincie, etc.)
 */
export async function getRegioCodes(tableId: string): Promise<CbsCodeItem[]> {
  return getCodes(tableId, 'RegioSCodes');
}

/**
 * Get period codes.
 */
export async function getPeriodCodes(tableId: string): Promise<CbsCodeItem[]> {
  return getCodes(tableId, 'PeriodenCodes');
}

/**
 * Get measure codes (what metrics are available).
 */
export async function getMeasureCodes(tableId: string): Promise<CbsCodeItem[]> {
  return getCodes(tableId, 'MeasureCodes');
}

/**
 * CBS Table IDs for our data sources.
 */
export const CBS_TABLES = {
  /** Bevolking; geslacht, leeftijd, burgerlijke staat en regio, 1 januari */
  bevolking: '03759ned',

  /** Huishoudens; personen naar geslacht, leeftijd en regio, 1 januari */
  huishoudens: '71486ned',

  /** Voorraad woningen; eigendom, type verhuurder, bewoning, regio */
  woningen: '82550NED',

  /** Voorraad woningen en niet-woningen; mutaties, gebruiksfunctie, regio
   *  Contains: nieuwbouw, sloop, overige toevoegingen/onttrekkingen per gemeente */
  woningmutaties: '81955NED',

  /** Kerncijfers wijken en buurten (comprehensive local stats) */
  kerncijfers: '85385NED',

  /** Prognose bevolking; geslacht en leeftijd (national level)
   *  National population projections to 2060.
   *  Note: CBS withdrew regional prognoses (85174NED) due to reliability concerns.
   *  National level only until CBS publishes new regional forecasts. */
  prognose: '84646NED',
} as const;

/**
 * Parse CBS period string (e.g., "2024JJ00") into year number.
 */
export function parseCbsPeriod(period: string): number | null {
  // Yearly: "2024JJ00"
  const yearMatch = period.match(/^(\d{4})JJ00$/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  // Also handle "2024MM01" (monthly) — extract year
  const monthMatch = period.match(/^(\d{4})MM/);
  if (monthMatch) return parseInt(monthMatch[1], 10);

  return null;
}

/**
 * Parse CBS region code to determine level.
 */
export function parseCbsRegion(code: string): { code: string; level: string } | null {
  const trimmed = code.trim();
  if (trimmed === 'NL01') return { code: 'NL', level: 'land' };
  if (trimmed.startsWith('PV')) return { code: `NL-${trimmed.substring(2)}`, level: 'provincie' };
  if (trimmed.startsWith('CR')) return { code: trimmed, level: 'corop' };
  if (trimmed.startsWith('GM')) return { code: trimmed, level: 'gemeente' };
  if (trimmed.startsWith('WK')) return { code: trimmed, level: 'wijk' };
  if (trimmed.startsWith('BU')) return { code: trimmed, level: 'buurt' };
  return null;
}

export const CBS_ATTRIBUTION = 'Bron: CBS, StatLine (opendata.cbs.nl). Licentie: CC-BY 4.0.';
