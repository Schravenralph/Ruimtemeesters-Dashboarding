import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-03-20',
    changes: [
      'Initiële release van het Ruimtemeesters Dashboard',
      '5 thema-dashboards: Overzicht, Bevolking, Huishoudens, Woningen, Woningtekort',
      '16 visualisatietypes inclusief bevolkingspyramide en treemap',
      'RBAC met 4 rollen en ABAC beleidsengine',
      'Aangepaste dashboards met deellinks',
      'Geografische filtering op 4 niveaus',
      'Data import/export (CSV, JSON)',
      'Volledige beheer-interface',
      'Nederlands en Engels taalondersteuning',
    ],
  },
];

export function Changelog() {
  const [expanded, setExpanded] = useState<string | null>(changelog[0]?.version || null);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Changelog</h2>
      </div>

      <div className="space-y-2">
        {changelog.map(entry => (
          <div key={entry.version} className="rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setExpanded(expanded === entry.version ? null : entry.version)}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  v{entry.version}
                </span>
                <span className="text-sm text-gray-500">{entry.date}</span>
              </div>
              {expanded === entry.version ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expanded === entry.version && (
              <div className="border-t px-4 py-3">
                <ul className="space-y-1.5">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-blue-400 mt-1.5 text-xs">●</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
