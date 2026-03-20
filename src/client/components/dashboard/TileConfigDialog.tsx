import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import type { TileConfig, ChartType, GeoLevel } from '@shared/api/contracts';

interface TileConfigDialogProps {
  tile: TileConfig;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<TileConfig>) => void;
}

const chartTypeOptions = [
  { value: 'bar', label: 'Staafdiagram' },
  { value: 'stacked-bar', label: 'Gestapeld staafdiagram' },
  { value: 'line', label: 'Lijndiagram' },
  { value: 'pie', label: 'Taartdiagram' },
  { value: 'radar', label: 'Radardiagram' },
  { value: 'table', label: 'Tabel' },
  { value: 'choropleth', label: 'Kaart' },
];

const geoLevelOptions = [
  { value: 'land', label: 'Land' },
  { value: 'provincie', label: 'Provincie' },
  { value: 'gemeente', label: 'Gemeente' },
];

export function TileConfigDialog({ tile, isOpen, onClose, onUpdate }: TileConfigDialogProps) {
  const [title, setTitle] = useState(tile.title);
  const [chartType, setChartType] = useState<ChartType>(tile.chartType as ChartType);
  const [defaultGeoLevel, setDefaultGeoLevel] = useState<GeoLevel>(tile.defaultGeoLevel as GeoLevel);
  const [description, setDescription] = useState(tile.description || '');

  function handleSave() {
    onUpdate({
      title,
      chartType: chartType as ChartType,
      defaultGeoLevel: defaultGeoLevel as TileConfig['defaultGeoLevel'],
      description: description || undefined,
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tegel configureren" maxWidth="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <Select
          label="Grafiektype"
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          options={chartTypeOptions}
        />

        <Select
          label="Standaard gebiedsniveau"
          value={defaultGeoLevel}
          onChange={(e) => setDefaultGeoLevel(e.target.value as GeoLevel)}
          options={geoLevelOptions}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="Optionele beschrijving..."
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          <p><strong>Databron:</strong> {tile.dataSource}</p>
          <p><strong>Dimensies:</strong> {tile.dimensions.join(', ') || 'Geen'}</p>
          <p><strong>ID:</strong> {tile.id}</p>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave}>Opslaan</Button>
        </div>
      </div>
    </Modal>
  );
}
