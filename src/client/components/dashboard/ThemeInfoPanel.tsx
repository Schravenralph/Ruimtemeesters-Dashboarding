import { useState } from 'react';
import { Info, X, ExternalLink, Database, Calendar, Map } from 'lucide-react';
import type { ThemeConfig } from '@shared/api/contracts';
import { Button } from '../ui/Button';

interface ThemeInfoPanelProps {
  theme: ThemeConfig;
}

export function ThemeInfoPanel({ theme }: ThemeInfoPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
      >
        <Info className="h-4 w-4" />
        Meer informatie over dit thema
      </button>
    );
  }

  const dataSources = [...new Set(theme.tiles.map(t => t.dataSource))];
  const chartTypes = [...new Set(theme.tiles.map(t => t.chartType))];

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 mb-6 relative">
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-3 right-3 rounded-lg p-1.5 hover:bg-blue-100"
      >
        <X className="h-4 w-4 text-blue-600" />
      </button>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{theme.name}</h3>
      {theme.description && (
        <p className="text-sm text-gray-600 mb-4">{theme.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Data Sources */}
        <div className="rounded-lg bg-white p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Databronnen</span>
          </div>
          <ul className="space-y-1">
            {dataSources.map(ds => (
              <li key={ds} className="text-sm text-gray-600 capitalize">{ds}</li>
            ))}
          </ul>
        </div>

        {/* Visualizations */}
        <div className="rounded-lg bg-white p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Map className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Visualisaties</span>
          </div>
          <ul className="space-y-1">
            {chartTypes.map(ct => (
              <li key={ct} className="text-sm text-gray-600 capitalize">
                {ct.replace('-', ' ')}
              </li>
            ))}
          </ul>
        </div>

        {/* Tiles */}
        <div className="rounded-lg bg-white p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Tegels</span>
          </div>
          <p className="text-sm text-gray-600">{theme.tiles.length} tegels beschikbaar</p>
          <p className="text-sm text-gray-600 mt-1">
            {theme.tiles.filter(t => t.dimensions.length > 0).length} met dimensie-uitsplitsing
          </p>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Thema-ID: {theme.id} · Type: {theme.isSystem ? 'Systeem' : 'Aangepast'}
      </div>
    </div>
  );
}
