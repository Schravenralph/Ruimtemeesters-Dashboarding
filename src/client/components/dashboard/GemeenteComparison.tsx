import { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Plus, X } from 'lucide-react';
import { api } from '../../services/api/client';
import { formatCompact } from '../../utils/format';
import { listAreas } from '../../services/api/geo';
import { SearchInput } from '../ui/SearchInput';
import type { GeoArea } from '@shared/api/contracts';

interface AreaTrend {
  name: string;
  data: { year: number; value: number }[];
}

interface CompareResponse {
  source: string;
  areas: Record<string, AreaTrend>;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const G4_CODES = ['GM0363', 'GM0599', 'GM0518', 'GM0344'];

interface GemeenteComparisonProps {
  source?: string;
}

export function GemeenteComparison({ source = 'bevolking' }: GemeenteComparisonProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>(G4_CODES);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allAreas, setAllAreas] = useState<GeoArea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Load all gemeenten for the picker
  useEffect(() => {
    listAreas({ level: 'gemeente' }).then(({ areas }) => setAllAreas(areas));
  }, []);

  // Fetch comparison data when selection changes
  useEffect(() => {
    if (selectedCodes.length < 2) return;
    setIsLoading(true);
    api.get<CompareResponse>(`/trends/${source}/compare`, {
      geoCodes: selectedCodes.join(','),
    })
      .then(setCompareData)
      .catch(() => setCompareData(null))
      .finally(() => setIsLoading(false));
  }, [selectedCodes, source]);

  const filteredAreas = useMemo(() => {
    if (!searchQuery) return allAreas.slice(0, 20);
    return allAreas
      .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 20);
  }, [allAreas, searchQuery]);

  // Build chart data: x-axis = year, one key per gemeente
  const { chartData, areaNames } = useMemo(() => {
    if (!compareData) return { chartData: [], areaNames: {} as Record<string, string> };

    const names: Record<string, string> = {};
    const yearMap = new Map<number, Record<string, number>>();

    for (const [code, area] of Object.entries(compareData.areas)) {
      names[code] = area.name;
      for (const { year, value } of area.data) {
        const entry = yearMap.get(year) || {};
        entry[code] = value;
        yearMap.set(year, entry);
      }
    }

    const sorted = [...yearMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, values]) => ({ year: String(year), ...values }));

    return { chartData: sorted, areaNames: names };
  }, [compareData]);

  const addGemeente = (code: string) => {
    if (selectedCodes.length >= 6 || selectedCodes.includes(code)) return;
    setSelectedCodes([...selectedCodes, code]);
    setShowPicker(false);
    setSearchQuery('');
  };

  const removeGemeente = (code: string) => {
    if (selectedCodes.length <= 2) return;
    setSelectedCodes(selectedCodes.filter(c => c !== code));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Gemeentevergelijking</h3>
        </div>
        <span className="text-xs text-gray-400">{selectedCodes.length} gemeenten</span>
      </div>

      {/* Selected gemeenten chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedCodes.map((code, i) => (
          <span
            key={code}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          >
            {areaNames[code] || code}
            {selectedCodes.length > 2 && (
              <button onClick={() => removeGemeente(code)} className="hover:bg-white/20 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {selectedCodes.length < 6 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              <Plus className="h-3 w-3" /> Gemeente toevoegen
            </button>
            {showPicker && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-30 p-2">
                <SearchInput
                  placeholder="Zoek gemeente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {filteredAreas
                    .filter(a => !selectedCodes.includes(a.code))
                    .map(area => (
                      <button
                        key={area.code}
                        onClick={() => addGemeente(area.code)}
                        className="w-full rounded px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-blue-50"
                      >
                        {area.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCompact} />
            <Tooltip formatter={(value: number) => formatCompact(value)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {selectedCodes.map((code, i) => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                name={areaNames[code] || code}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">Selecteer minimaal 2 gemeenten om te vergelijken</p>
      )}
    </div>
  );
}
