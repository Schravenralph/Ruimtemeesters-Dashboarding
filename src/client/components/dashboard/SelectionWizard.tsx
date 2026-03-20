import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, BarChart3, MapPin, Calendar, Presentation } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useFilters } from '../../contexts/FilterContext';
import { useThemes } from '../../contexts/ThemeContext';
import type { GeoLevel, ThemeConfig } from '@shared/api/contracts';

interface SelectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: WizardResult) => void;
}

export interface WizardResult {
  themeSlug: string;
  geoLevel: GeoLevel;
  year: number;
}

const GEO_OPTIONS: { value: GeoLevel; label: string; description: string }[] = [
  { value: 'land', label: 'Nederland', description: 'Nationaal niveau' },
  { value: 'provincie', label: 'Provincie', description: '12 provincies' },
  { value: 'corop', label: 'COROP-regio', description: '40 statistische regio\'s' },
  { value: 'gemeente', label: 'Gemeente', description: '342 gemeenten' },
];

const YEAR_OPTIONS = [2020, 2021, 2022, 2023, 2024];

/**
 * Selectie-assistent — guided wizard matching Primos's step-by-step presentation builder.
 * Steps: 1. Choose topic → 2. Choose geographic level → 3. Choose period → 4. Confirm
 */
export function SelectionWizard({ isOpen, onClose, onComplete }: SelectionWizardProps) {
  const { themes } = useThemes();
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [selectedGeoLevel, setSelectedGeoLevel] = useState<GeoLevel>('gemeente');
  const [selectedYear, setSelectedYear] = useState(2024);

  const steps = [
    { icon: BarChart3, label: 'Onderwerp', description: 'Kies een thema' },
    { icon: MapPin, label: 'Gebiedsniveau', description: 'Kies het geografisch niveau' },
    { icon: Calendar, label: 'Periode', description: 'Kies het jaar' },
    { icon: Presentation, label: 'Bevestigen', description: 'Controleer je selectie' },
  ];

  function handleComplete() {
    onComplete({
      themeSlug: selectedTheme,
      geoLevel: selectedGeoLevel,
      year: selectedYear,
    });
    onClose();
    setStep(0);
  }

  const canProceed = step === 0 ? !!selectedTheme :
    step === 1 ? !!selectedGeoLevel :
    step === 2 ? !!selectedYear : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selectie-assistent" maxWidth="lg">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                isDone ? 'bg-green-100 text-green-600' :
                isActive ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="hidden md:block min-w-0">
                <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {s.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {/* Step 0: Choose topic */}
        {step === 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-3">Kies een onderwerp</h3>
            {themes.filter(t => t.slug !== 'overzicht').map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.slug)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  selectedTheme === theme.slug
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{theme.name}</p>
                {theme.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{theme.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{theme.tiles.length} visualisaties beschikbaar</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Choose geo level */}
        {step === 1 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-3">Kies het gebiedsniveau</h3>
            {GEO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedGeoLevel(opt.value)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  selectedGeoLevel === opt.value
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-500">{opt.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Choose year */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Kies het jaar</h3>
            <div className="grid grid-cols-5 gap-2">
              {YEAR_OPTIONS.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    selectedYear === year
                      ? 'border-blue-300 bg-blue-50 text-blue-700 font-bold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Bron: CBS, StatLine (opendata.cbs.nl). Actuele cijfers.
            </p>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Bevestig je selectie</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Onderwerp</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{selectedTheme}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Gebiedsniveau</span>
                <span className="text-sm font-medium text-gray-900">
                  {GEO_OPTIONS.find(o => o.value === selectedGeoLevel)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Jaar</span>
                <span className="text-sm font-medium text-gray-900">{selectedYear}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Klik op "Voltooien" om de presentatie te openen.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() => step > 0 ? setStep(step - 1) : onClose()}
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Annuleren' : 'Vorige'}
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
            Volgende
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete}>
            <Check className="h-4 w-4" />
            Voltooien
          </Button>
        )}
      </div>
    </Modal>
  );
}
