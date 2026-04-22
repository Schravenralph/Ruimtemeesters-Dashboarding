import { Select } from '../components/ui/Select';
import { Card, CardHeader } from '../components/ui/Card';
import { useThemes } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';

const YEAR_OPTIONS = [2020, 2021, 2022, 2023, 2024, 2025];

export function SettingsPage() {
  const { user } = useAuth();
  const { themes } = useThemes();
  const { config, updateConfig, isLoading } = useAppConfig();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Log in om je instellingen te beheren.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
          <p className="text-sm text-gray-500 mt-1">Pas je persoonlijke voorkeuren aan</p>
        </div>
        {isLoading && <span className="text-xs text-gray-400">Laden…</span>}
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

        {/* Dashboard Defaults */}
        <Card>
          <CardHeader title="Dashboard standaardwaarden" />
          <div className={`space-y-3 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Select
              label="Standaard thema"
              value={config.defaultTheme}
              onChange={(e) => updateConfig({ defaultTheme: e.target.value })}
              disabled={isLoading}
              options={[
                { value: '', label: '— Kies een thema —' },
                ...themes.map(t => ({ value: t.slug, label: t.name })),
              ]}
            />
            <Select
              label="Standaard jaar"
              value={String(config.defaultYear)}
              onChange={(e) => updateConfig({ defaultYear: parseInt(e.target.value, 10) })}
              disabled={isLoading}
              options={YEAR_OPTIONS.map(y => ({ value: String(y), label: String(y) }))}
            />
          </div>
        </Card>

        {/* Display */}
        <Card>
          <CardHeader title="Weergave" />
          <div className={`space-y-3 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Compacte getallen (1.5M i.p.v. 1.500.000)</span>
              <input
                type="checkbox"
                checked={config.compactNumbers}
                disabled={isLoading}
                onChange={(e) => updateConfig({ compactNumbers: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Grafiek animaties</span>
              <input
                type="checkbox"
                checked={config.chartAnimations}
                disabled={isLoading}
                onChange={(e) => updateConfig({ chartAnimations: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Automatisch vernieuwen</span>
              <input
                type="checkbox"
                checked={config.autoRefresh}
                disabled={isLoading}
                onChange={(e) => updateConfig({ autoRefresh: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </label>
          </div>
        </Card>

        <p className="text-xs text-gray-400">
          Wijzigingen worden automatisch opgeslagen en gedeeld tussen apparaten.
        </p>
      </div>
    </div>
  );
}
