import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function Layout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
