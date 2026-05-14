import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Check, Globe, Building2 } from 'lucide-react';
import { api } from '../../services/api/client';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
  sourceThemeSlug: string | null;
  visibility: 'org' | 'public';
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Promoted {
  id: string;
  name: string;
  description: string | null;
  themeSlug: string | null;
  promotedAt: string | null;
  originalUserName: string | null;
  originalUserEmail: string | null;
  sourceUserTemplateId: string | null;
}

export function TemplatePromotions() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [promoted, setPromoted] = useState<Promoted[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        api.get<{ rows: Candidate[] }>('/admin/templates/candidates'),
        api.get<{ rows: Promoted[] }>('/admin/templates/promoted'),
      ]);
      setCandidates(c.rows);
      setPromoted(p.rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon templates niet ophalen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function promote(c: Candidate) {
    if (!confirm(`Weet je zeker dat je "${c.name}" wilt promoten naar Systeem-template? Deze actie wordt gelogd.`)) return;
    setBusy(c.id);
    try {
      await api.post('/admin/templates/promote', { userTemplateId: c.id });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Promotie mislukt');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="py-8 text-sm text-gray-600">Laden…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>;

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-600">
        Kandidaten zijn gebruikerstemplates met zichtbaarheid <strong>org</strong> of <strong>publiek</strong>.
        Promoveren maakt een systeem-template aan (categorie <code>community</code>) die voor iedere nieuwe project-wizard zichtbaar is in het tabblad <strong>Systeem</strong>. De originele auteur blijft gekoppeld voor attributie. Iedere promotie wordt gelogd in <code>audit_log</code> (action <code>template.promote</code>).
      </p>

      <section>
        <h3 className="mb-3 text-base font-semibold text-gray-900">Kandidaten ({candidates.length})</h3>
        {candidates.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500">
            Geen kandidaten. Gebruikers moeten eerst een template op <strong>org</strong> of <strong>publiek</strong> zetten.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Template</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Auteur</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Zichtbaarheid</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Bijgewerkt</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {candidates.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                      {c.sourceThemeSlug && <div className="mt-0.5 text-xs text-gray-400">Thema: {c.sourceThemeSlug}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      <div>{c.userName ?? '—'}</div>
                      {c.userEmail && <div className="text-xs text-gray-400">{c.userEmail}</div>}
                    </td>
                    <td className="px-4 py-2">
                      {c.visibility === 'public' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                          <Globe className="h-3 w-3" /> Publiek
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                          <Building2 className="h-3 w-3" /> Org
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(c.updatedAt).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void promote(c)}
                        disabled={busy === c.id}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        {busy === c.id ? 'Bezig…' : 'Promoveer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-base font-semibold text-gray-900">Gepromote systeem-templates ({promoted.length})</h3>
        {promoted.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500">Nog geen templates gepromoot.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Template</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Originele auteur</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Gepromoot op</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {promoted.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900 inline-flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-600" /> {p.name}
                      </div>
                      {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                      {p.themeSlug && <div className="mt-0.5 text-xs text-gray-400">Thema: {p.themeSlug}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-700" title={p.originalUserEmail ?? ''}>
                      {p.originalUserName ? (
                        <span>Origineel: {p.originalUserName}</span>
                      ) : (
                        <span className="text-gray-400">— (gebruiker verwijderd)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {p.promotedAt ? new Date(p.promotedAt).toLocaleString('nl-NL') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
