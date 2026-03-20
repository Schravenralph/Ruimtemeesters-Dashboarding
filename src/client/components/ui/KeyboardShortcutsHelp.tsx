import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: 'Alt + 1', description: 'Overzicht dashboard' },
  { keys: 'Alt + 2', description: 'Bevolking dashboard' },
  { keys: 'Alt + 3', description: 'Huishoudens dashboard' },
  { keys: 'Alt + 4', description: 'Woningen dashboard' },
  { keys: 'Alt + 5', description: 'Woningtekort dashboard' },
  { keys: 'Alt + M', description: 'Mijn Dashboards' },
  { keys: 'Alt + A', description: 'Beheer (Admin)' },
  { keys: 'Alt + F', description: 'Zoekbalk focussen' },
  { keys: 'Esc', description: 'Modal/menu sluiten' },
  { keys: '?', description: 'Sneltoetsen tonen/verbergen' },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for ? key
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (
        e.key === '?' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setIsOpen(prev => !prev);
      }
    }, { once: false });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Sneltoetsen</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-2">
            {shortcuts.map(shortcut => (
              <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-mono text-gray-700">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t px-5 py-3 text-xs text-gray-400 text-center">
          Druk op <kbd className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">?</kbd> om dit venster te sluiten
        </div>
      </div>
    </div>
  );
}
