import { X, MapPin, Calendar, BarChart3, Hash } from 'lucide-react';
import type { DataPoint } from '@shared/api/contracts';
import { formatNumber, dimensionValueLabel } from '../../utils/format';

interface DataPointDetailProps {
  dataPoint: DataPoint;
  onClose: () => void;
}

/**
 * Detail popup for a selected data point.
 * Shows all available information about a specific data value.
 */
export function DataPointDetail({ dataPoint, onClose }: DataPointDetailProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg p-5 max-w-sm">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {formatNumber(dataPoint.value)}
        </h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-2">
        <DetailRow
          icon={<MapPin className="h-4 w-4 text-blue-500" />}
          label="Gebied"
          value={dataPoint.geoName || dataPoint.geoCode}
        />
        <DetailRow
          icon={<Calendar className="h-4 w-4 text-green-500" />}
          label="Jaar"
          value={String(dataPoint.year)}
        />
        {dataPoint.dimension && (
          <DetailRow
            icon={<BarChart3 className="h-4 w-4 text-purple-500" />}
            label="Dimensie"
            value={dataPoint.dimension}
          />
        )}
        {dataPoint.dimensionValue && (
          <DetailRow
            icon={<Hash className="h-4 w-4 text-orange-500" />}
            label="Categorie"
            value={dimensionValueLabel(dataPoint.dimensionValue)}
          />
        )}
        {dataPoint.label && (
          <DetailRow
            icon={<Hash className="h-4 w-4 text-gray-500" />}
            label="Label"
            value={dataPoint.label}
          />
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Gebiedscode: {dataPoint.geoCode}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-gray-500 w-20">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
