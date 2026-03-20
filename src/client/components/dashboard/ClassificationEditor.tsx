import { useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import {
  equalIntervals, quantiles,
  COLOR_SCHEMES, type ColorSchemeName, type ClassBreak,
} from '../../utils/classification';

interface ClassificationEditorProps {
  values: number[];
  breaks: ClassBreak[];
  onUpdate: (breaks: ClassBreak[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Classification editor matching Primos's Opmaakinstellingen > Klassenindeling.
 * Allows configuring class count, method, color scheme, and manual overrides.
 */
export function ClassificationEditor({
  values,
  breaks,
  onUpdate,
  isOpen,
  onClose,
}: ClassificationEditorProps) {
  const [numClasses, setNumClasses] = useState(breaks.length || 5);
  const [method, setMethod] = useState<'equal' | 'quantile'>('equal');
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>('greenBlue');
  const [reverseColors, setReverseColors] = useState(false);
  const [manualLabels, setManualLabels] = useState(false);
  const [localBreaks, setLocalBreaks] = useState<ClassBreak[]>(breaks);

  function regenerate() {
    let colors = [...COLOR_SCHEMES[colorScheme]];
    // Extend colors if more classes than palette
    while (colors.length < numClasses) {
      colors = [...colors, ...COLOR_SCHEMES[colorScheme]];
    }
    colors = colors.slice(0, numClasses);
    if (reverseColors) colors.reverse();

    const newBreaks = method === 'equal'
      ? equalIntervals(values, numClasses, colors)
      : quantiles(values, numClasses, colors);

    setLocalBreaks(newBreaks);
  }

  function handleApply() {
    onUpdate(localBreaks);
    onClose();
  }

  function handleReset() {
    setNumClasses(5);
    setMethod('equal');
    setColorScheme('greenBlue');
    setReverseColors(false);
    regenerate();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Klassenindeling" maxWidth="lg">
      <div className="space-y-4">
        {/* Settings row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            label="Aantal klassen"
            value={String(numClasses)}
            onChange={(e) => { setNumClasses(parseInt(e.target.value)); }}
            options={Array.from({ length: 14 }, (_, i) => ({
              value: String(i + 2),
              label: String(i + 2),
            }))}
          />

          <Select
            label="Methode"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'equal' | 'quantile')}
            options={[
              { value: 'equal', label: 'Gelijke intervallen' },
              { value: 'quantile', label: 'Kwantielen' },
            ]}
          />

          <Select
            label="Kleurenschema"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as ColorSchemeName)}
            options={[
              { value: 'greenBlue', label: 'Groen-Blauw' },
              { value: 'blues', label: 'Blauw' },
              { value: 'reds', label: 'Rood' },
              { value: 'purples', label: 'Paars' },
              { value: 'oranges', label: 'Oranje' },
              { value: 'redYellowGreen', label: 'Rood-Geel-Groen' },
              { value: 'greys', label: 'Grijs' },
            ]}
          />

          <div className="flex flex-col justify-end">
            <Button variant="secondary" size="sm" onClick={regenerate}>
              <Palette className="h-3.5 w-3.5" /> Genereren
            </Button>
          </div>
        </div>

        {/* Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reverseColors}
              onChange={(e) => setReverseColors(e.target.checked)}
              className="rounded"
            />
            Kleuren omdraaien
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manualLabels}
              onChange={(e) => setManualLabels(e.target.checked)}
              className="rounded"
            />
            Handmatige labels
          </label>
        </div>

        {/* Class table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-500">Kleur</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500">Label</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Ondergrens</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Bovengrens</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Aantal</th>
              </tr>
            </thead>
            <tbody>
              {localBreaks.map((brk, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <div
                      className="h-6 w-10 rounded border border-gray-200"
                      style={{ backgroundColor: brk.color }}
                      title={brk.color}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {manualLabels ? (
                      <input
                        type="text"
                        value={brk.label}
                        onChange={(e) => {
                          const updated = [...localBreaks];
                          updated[i] = { ...updated[i], label: e.target.value };
                          setLocalBreaks(updated);
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="text-gray-700">{brk.label}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">
                    {brk.lowerBound.toLocaleString('nl-NL')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">
                    {brk.upperBound.toLocaleString('nl-NL')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900 font-medium">
                    {brk.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Color scheme preview */}
        <div className="flex gap-0.5 h-4 rounded overflow-hidden">
          {localBreaks.map((brk, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: brk.color }}
              title={brk.label}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t">
        <Button onClick={handleApply}>Toepassen</Button>
        <Button variant="ghost" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" /> Standaardinstellingen
        </Button>
        <Button variant="ghost" onClick={onClose}>Annuleren</Button>
      </div>
    </Modal>
  );
}
