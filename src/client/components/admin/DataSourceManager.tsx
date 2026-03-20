import { useState, useEffect } from 'react';
import { Database, Map, BarChart3, Calendar, Hash } from 'lucide-react';
import { LoadingOverlay } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { api } from '../../services/api/client';
import { formatNumber } from '../../utils/format';

interface DataSourceStat {
  source: string;
  table: string;
  rowCount: number;
  minYear: number;
  maxYear: number;
  geoCount: number;
}

interface GeoAreaStat {
  level: string;
  count: number;
}

const sourceDescriptions: Record<string, string> = {
  bevolking: 'Bevolkingsgegevens per gemeente, leeftijdsgroep en geslacht',
  huishoudens: 'Huishoudenssamenstelling per gemeente',
  woningen: 'Woningvoorraad naar eigendomsvorm en woningtype',
  woningtekort: 'Woningtekort, vraag en aanbod per gemeente',
};

const levelLabels: Record<string, string> = {
  land: 'Land',
  provincie: 'Provincies',
  corop: 'COROP-regio\'s',
  gemeente: 'Gemeenten',
  wijk: 'Wijken',
  buurt: 'Buurten',
};

export function DataSourceManager() {
  const [dataSources, setDataSources] = useState<DataSourceStat[]>([]);
  const [geoAreas, setGeoAreas] = useState<GeoAreaStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ dataSources: DataSourceStat[]; geoAreas: GeoAreaStat[] }>('/datasources/stats')
      .then(({ dataSources, geoAreas }) => {
        setDataSources(dataSources);
        setGeoAreas(geoAreas);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingOverlay />;

  const totalRows = dataSources.reduce((sum, ds) => sum + ds.rowCount, 0);
  const totalGeo = geoAreas.reduce((sum, ga) => sum + ga.count, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
            <Database className="h-4 w-4" /> Databronnen
          </div>
          <p className="text-2xl font-bold text-gray-900">{dataSources.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
            <Hash className="h-4 w-4" /> Totaal rijen
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(totalRows)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
            <Map className="h-4 w-4" /> Geografische gebieden
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(totalGeo)}</p>
        </div>
      </div>

      {/* Data Sources */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Databronnen</h3>
        <div className="space-y-3">
          {dataSources.map(ds => (
            <Card key={ds.source}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-gray-900 capitalize">{ds.source}</h4>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Actief
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {sourceDescriptions[ds.source] || ds.table}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Rijen</p>
                  <p className="text-sm font-semibold text-gray-700">{formatNumber(ds.rowCount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Periode</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {ds.minYear} – {ds.maxYear}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Gebieden</p>
                  <p className="text-sm font-semibold text-gray-700">{ds.geoCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tabel</p>
                  <p className="text-sm font-mono text-gray-700">{ds.table}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Geographic Areas */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Geografische gebieden</h3>
        <Card>
          <div className="space-y-2">
            {geoAreas.map(ga => (
              <div key={ga.level} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700">{levelLabels[ga.level] || ga.level}</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(ga.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
