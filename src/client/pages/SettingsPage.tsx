import { useState } from 'react';
import { Save, Globe, Palette, Bell } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Card, CardHeader } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { setLocale, getLocale, getSupportedLocales } from '../utils/i18n';

export function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [locale, setLocaleState] = useLocalStorage<string>('locale', getLocale());
  const [defaultTheme, setDefaultTheme] = useLocalStorage('defaultTheme', 'overzicht');
  const [defaultYear, setDefaultYear] = useLocalStorage('defaultYear', '2024');
  const [autoRefresh, setAutoRefresh] = useLocalStorage('autoRefresh', false);
  const [compactNumbers, setCompactNumbers] = useLocalStorage('compactNumbers', true);
  const [chartAnimation, setChartAnimation] = useLocalStorage('chartAnimation', true);

  function handleSave() {
    setLocale(locale as 'nl' | 'en');
    showToast('success', 'Instellingen opgeslagen');
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Log in om je instellingen te beheren.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-sm text-gray-500 mt-1">Pas je persoonlijke voorkeuren aan</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader title="Profiel" />
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-700">Naam</span>
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-700">E-mail</span>
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-700">Rol</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{user.role}</span>
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader title="Taal" subtitle="Kies de taal van de interface" />
          <Select
            value={locale}
            onChange={(e) => setLocaleState(e.target.value)}
            options={getSupportedLocales().map(l => ({ value: l.value, label: l.label }))}
          />
        </Card>

        {/* Dashboard Defaults */}
        <Card>
          <CardHeader title="Dashboard standaardwaarden" />
          <div className="space-y-3">
            <Select
              label="Standaard thema"
              value={defaultTheme}
              onChange={(e) => setDefaultTheme(e.target.value)}
              options={[
                { value: 'overzicht', label: 'Overzicht' },
                { value: 'bevolking', label: 'Bevolking' },
                { value: 'huishoudens', label: 'Huishoudens' },
                { value: 'woningen', label: 'Woningen' },
                { value: 'woningtekort', label: 'Woningtekort' },
              ]}
            />
            <Select
              label="Standaard jaar"
              value={defaultYear}
              onChange={(e) => setDefaultYear(e.target.value)}
              options={['2020', '2021', '2022', '2023', '2024', '2025'].map(y => ({
                value: y,
                label: y,
              }))}
            />
          </div>
        </Card>

        {/* Display */}
        <Card>
          <CardHeader title="Weergave" />
          <div className="space-y-3">
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Compacte getallen (1.5M i.p.v. 1.500.000)</span>
              <input
                type="checkbox"
                checked={compactNumbers}
                onChange={(e) => setCompactNumbers(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Grafiek animaties</span>
              <input
                type="checkbox"
                checked={chartAnimation}
                onChange={(e) => setChartAnimation(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Automatisch vernieuwen</span>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
          </div>
        </Card>

        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Opslaan
        </Button>
      </div>
    </div>
  );
}
