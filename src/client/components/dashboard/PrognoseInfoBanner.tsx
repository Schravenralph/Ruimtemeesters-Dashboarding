import { useState, useEffect } from 'react';
import { Brain, Database, Calendar, MapPin } from 'lucide-react';
import { api } from '../../services/api/client';

interface PrognoseMeta {
  gemeenten: number;
  yearRange: [number, number] | null;
  totalRows: number;
  lastRun: string | null;
  source: string;
  models: number;
}

export function PrognoseInfoBanner() {
  const [meta, setMeta] = useState<PrognoseMeta | null>(null);

  useEffect(() => {
    api.get<PrognoseMeta>('/data/prognose-meta')
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  if (!meta || meta.totalRows === 0) return null;

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-white p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-5 w-5 text-purple-600" />
        <h4 className="text-sm font-semibold text-purple-800">Over de prognose</h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Modellen</p>
            <p className="font-medium text-gray-900">{meta.models} ML modellen</p>
            <p className="text-xs text-gray-400">Prophet, SARIMA, XGBoost, LSTM, ...</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Dekking</p>
            <p className="font-medium text-gray-900">{meta.gemeenten} gemeenten</p>
            <p className="text-xs text-gray-400">{meta.totalRows.toLocaleString('nl-NL')} datapunten</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Prognose periode</p>
            <p className="font-medium text-gray-900">
              {meta.yearRange ? `${meta.yearRange[0]}–${meta.yearRange[1]}` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Brain className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Laatste run</p>
            <p className="font-medium text-gray-900">
              {meta.lastRun ? new Date(meta.lastRun).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Nog niet gedraaid'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
