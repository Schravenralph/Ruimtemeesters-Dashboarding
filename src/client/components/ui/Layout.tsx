import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SupercategoryNav } from './SupercategoryNav';
import { PresentationTabBar } from './PresentationTabBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function Layout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 h-full w-64">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        {/* Mobile header with menu button */}
        <div className="flex items-center md:hidden border-b border-gray-200 bg-white px-4 py-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="ml-2 font-semibold text-gray-900">Ruimtemeesters</span>
        </div>

        <div className="hidden md:block">
          <Header />
        </div>

        {/* Supercategory navigation */}
        <SupercategoryNav />

        {/* Presentation tabs */}
        <PresentationTabBar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">
          {children}
          <footer className="mt-8 pb-4 text-xs text-gray-400 text-center print:mt-4">
            <p>Bron: CBS, StatLine (opendata.cbs.nl) &middot; Licentie: CC-BY 4.0</p>
            <p className="mt-0.5">AI prognoses: Ruimtemeesters TSA Engine &middot; Geen rechten ontleend aan voorspellingen</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
