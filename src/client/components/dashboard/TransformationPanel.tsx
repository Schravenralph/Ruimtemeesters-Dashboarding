import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { TransformationType } from '../../utils/transformations';

interface TransformationPanelProps {
  activeTransformation: TransformationType;
  onApply: (type: TransformationType, options?: {
    groeicijferType?: 'absoluut' | 'relatief' | 'index';
    baseYear?: number;
  }) => void;
  availableYears?: number[];
}

/**
 * Transformation panel matching Primos's "Transformaties" dialog.
 * Allows users to apply Percenteren, Groeicijfers, or Z-Scores to the data.
 */
export function TransformationPanel({
  activeTransformation,
  onApply,
  availableYears = [],
}: TransformationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<TransformationType>(activeTransformation);
  const [groeicijferType, setGroeicijferType] = useState<'absoluut' | 'relatief' | 'index'>('relatief');
  const [baseYear, setBaseYear] = useState<number | undefined>(availableYears[0]);

  function handleApply() {
    onApply(selected, { groeicijferType, baseYear });
    setIsOpen(false);
  }

  function handleReset() {
    setSelected('none');
    onApply('none');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
          activeTransformation !== 'none'
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        <Calculator className="h-3.5 w-3.5" />
        {activeTransformation === 'none' ? 'Transformaties' : transformationLabel(activeTransformation)}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Calculator className="h-4 w-4" />
          Transformaties
        </h4>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Percenteren */}
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="transformation"
            checked={selected === 'percenteren'}
            onChange={() => setSelected('percenteren')}
            className="text-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Percenteren</p>
            <p className="text-xs text-gray-500">Waarden als percentage van het totaal per gebied</p>
          </div>
        </label>

        {/* Groeicijfers */}
        <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="transformation"
            checked={selected === 'groeicijfers'}
            onChange={() => setSelected('groeicijfers')}
            className="text-blue-600 mt-0.5"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Groeicijfers</p>
            <p className="text-xs text-gray-500 mb-2">Verandering tussen perioden</p>
            {selected === 'groeicijfers' && (
              <div className="space-y-2">
                <Select
                  label="Type"
                  value={groeicijferType}
                  onChange={(e) => setGroeicijferType(e.target.value as typeof groeicijferType)}
                  options={[
                    { value: 'relatief', label: 'Relatief (%)' },
                    { value: 'absoluut', label: 'Absoluut (verschil)' },
                    { value: 'index', label: 'Indexcijfer (basis=100)' },
                  ]}
                />
                {groeicijferType === 'index' && availableYears.length > 0 && (
                  <Select
                    label="Basisperiode"
                    value={String(baseYear || availableYears[0])}
                    onChange={(e) => setBaseYear(parseInt(e.target.value))}
                    options={availableYears.map(y => ({ value: String(y), label: String(y) }))}
                  />
                )}
              </div>
            )}
          </div>
        </label>

        {/* Z-Scores */}
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="transformation"
            checked={selected === 'zscores'}
            onChange={() => setSelected('zscores')}
            className="text-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Z-Scores</p>
            <p className="text-xs text-gray-500">Gestandaardiseerde waarden (gemiddelde=0, std=1)</p>
          </div>
        </label>

        {/* None */}
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="transformation"
            checked={selected === 'none'}
            onChange={() => setSelected('none')}
            className="text-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Geen transformatie</p>
            <p className="text-xs text-gray-500">Originele waarden tonen</p>
          </div>
        </label>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <Button size="sm" onClick={handleApply}>Toepassen</Button>
        <Button variant="ghost" size="sm" onClick={handleReset}>Resetten</Button>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Annuleren</Button>
      </div>
    </div>
  );
}

function transformationLabel(type: TransformationType): string {
  switch (type) {
    case 'percenteren': return 'Percenteren';
    case 'groeicijfers': return 'Groeicijfers';
    case 'zscores': return 'Z-Scores';
    default: return 'Transformaties';
  }
}
