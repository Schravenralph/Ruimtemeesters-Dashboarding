import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FolderKanban, Check } from 'lucide-react';
import { useThemes } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { createProject } from '../services/api/projects';

/**
 * SPEC-D §"Bootstrap Wizard": three-step new-project flow.
 * 1. Theme picker (grouped by supercategory)
 * 2. Naming + focal gemeente
 * 3. Confirm + provision
 */
export function NewProjectWizardPage() {
  const navigate = useNavigate();
  const { themes } = useThemes();
  const { refetchProjects, setCurrentProjectSlug } = useProjects();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [themeSlug, setThemeSlug] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [defaultGeoCode, setDefaultGeoCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group themes by supercategory for the picker.
  const grouped = themes.reduce<Record<string, typeof themes>>((acc, t) => {
    const key = t.supercategory ?? 'overig';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const selectedTheme = themes.find(t => t.slug === themeSlug);

  const submit = async () => {
    if (!themeSlug || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createProject({
        name: name.trim(),
        themeSlug,
        defaultGeoCode: defaultGeoCode.trim() || undefined,
      });
      await refetchProjects();
      setCurrentProjectSlug(result.project.slug);
      navigate(result.routePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon project niet aanmaken');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FolderKanban className="h-6 w-6 text-blue-600" />
          Nieuw project
        </h1>
        <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">Annuleren</Link>
      </div>

      {/* Step indicator */}
      <ol className="mb-8 flex items-center gap-3 text-xs font-medium text-gray-500">
        {[1, 2, 3].map(i => (
          <li key={i} className={`flex items-center gap-2 ${step === i ? 'text-blue-700' : ''}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${step >= i ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white'}`}>
              {step > i ? <Check className="h-3.5 w-3.5" /> : i}
            </span>
            {i === 1 ? 'Thema kiezen' : i === 2 ? 'Naam + focus' : 'Bevestigen'}
          </li>
        ))}
      </ol>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([supercat, list]) => (
            <section key={supercat}>
              <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">{supercat}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setThemeSlug(t.slug)}
                    className={`rounded-lg border px-4 py-3 text-left transition ${themeSlug === t.slug ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    {t.description && <div className="mt-0.5 text-xs text-gray-500">{t.description}</div>}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!themeSlug}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
            >
              Volgende
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="proj-name" className="mb-1 block text-sm font-medium text-gray-700">Projectnaam</label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Bijv. Woonzorgvisie 2030"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="proj-geo" className="mb-1 block text-sm font-medium text-gray-700">Focus-gemeente (optioneel, gemeente-code)</label>
            <input
              id="proj-geo"
              type="text"
              value={defaultGeoCode}
              onChange={e => setDefaultGeoCode(e.target.value)}
              placeholder="Bijv. GM0363 (Amsterdam)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">Laat leeg om later in het project te kiezen.</p>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Terug
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
            >
              Volgende
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && selectedTheme && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p>We maken het project <strong>{name}</strong> aan, abonneren je organisatie op de databronnen van het thema <strong>{selectedTheme.name}</strong> en openen het standaarddashboard.</p>
            {defaultGeoCode && <p className="mt-2 text-gray-600">Focus-gemeente: <code>{defaultGeoCode}</code></p>}
          </div>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" /> Terug
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
            >
              {submitting ? 'Bezig…' : 'Project aanmaken'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
