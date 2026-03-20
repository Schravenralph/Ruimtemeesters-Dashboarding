import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Keyboard, BarChart3, Filter, Shield, Share2, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'Hoe navigeer ik tussen thema\'s?',
    answer: 'Gebruik de sidebar aan de linkerkant om tussen thema\'s te wisselen. Je kunt ook de sneltoetsen Alt+1 t/m Alt+5 gebruiken voor directe navigatie.',
  },
  {
    question: 'Hoe filter ik op een specifieke gemeente?',
    answer: 'Klik op het filter-paneel bovenaan het dashboard. Kies "Gemeente" als gebiedsniveau en zoek vervolgens de gewenste gemeente via het zoekveld.',
  },
  {
    question: 'Hoe vergelijk ik twee jaren?',
    answer: 'Activeer de vergelijkingsmodus via de "Vergelijken" toggle in het filterpaneel. Selecteer vervolgens het vergelijkingsjaar. De dashboard toont dan automatisch de veranderingen.',
  },
  {
    question: 'Hoe maak ik een eigen dashboard?',
    answer: 'Ga naar "Mijn Dashboards" via de sidebar. Klik op "Nieuw dashboard" en voeg tegels toe vanuit bestaande thema\'s via de tegel-picker.',
  },
  {
    question: 'Hoe deel ik een dashboard?',
    answer: 'Open je aangepaste dashboard en klik op "Delen". Er wordt een link gegenereerd die 30 dagen geldig is. Je kunt ook een embed code kopiëren voor je website.',
  },
  {
    question: 'Hoe exporteer ik data?',
    answer: 'Klik op het menu-icoon (drie puntjes) op een tegel en kies het gewenste exportformaat: CSV, PDF, Excel of PNG. Je kunt ook alle tegels tegelijk exporteren als PDF.',
  },
  {
    question: 'Welke rollen zijn er?',
    answer: 'Admin: volledige toegang. Editor: kan data importeren en dashboards maken. Viewer: kan dashboards bekijken. Gast: beperkte toegang tot overzicht.',
  },
  {
    question: 'Hoe importeer ik data?',
    answer: 'Ga naar Beheer > Data Import. Upload een CSV-bestand met de juiste kolomnamen (geo_code, year, value, en dimensie-specifieke kolommen). Maximaal 50.000 rijen per import.',
  },
];

const sections = [
  {
    title: 'Navigatie',
    icon: BarChart3,
    items: [
      'Gebruik de sidebar om tussen thema\'s te navigeren',
      'Klik op tegels om details te bekijken',
      'Gebruik het broodkruimelpad voor context',
    ],
  },
  {
    title: 'Filters',
    icon: Filter,
    items: [
      'Selecteer gebiedsniveau: Land, Provincie, COROP of Gemeente',
      'Zoek specifieke gebieden via de zoekbalk',
      'Sla filterinstellingen op als presets',
      'Activeer vergelijkingsmodus voor jaar-op-jaar analyse',
    ],
  },
  {
    title: 'Exporteren',
    icon: Download,
    items: [
      'CSV met puntkomma-scheiding (NL-formaat)',
      'PDF per tegel of bulk export',
      'Excel-compatible export',
      'PNG screenshots van grafieken',
    ],
  },
  {
    title: 'Delen',
    icon: Share2,
    items: [
      'Genereer deellinks (30 dagen geldig)',
      'Embed code voor websites',
      'Deel via e-mail',
    ],
  },
  {
    title: 'Toegangsbeheer',
    icon: Shield,
    items: [
      'RBAC met 4 rollen: Admin, Editor, Viewer, Gast',
      'ABAC beleid voor fijnmazige toegangscontrole',
      'Configureerbaar via het beheer-paneel',
    ],
  },
];

export function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Help & Documentatie</h1>
        </div>
        <p className="text-sm text-gray-500">
          Handleiding voor het Ruimtemeesters Dashboard platform
        </p>
      </div>

      {/* Quick Reference Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {sections.map(section => (
          <Card key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <section.icon className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Keyboard Shortcuts */}
      <Card className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Sneltoetsen</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Alt + 1-5', 'Thema navigatie'],
            ['Alt + M', 'Mijn Dashboards'],
            ['Alt + A', 'Beheer'],
            ['Alt + F', 'Zoeken'],
            ['Esc', 'Modal sluiten'],
            ['?', 'Sneltoetsen help'],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">{desc}</span>
              <kbd className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Veelgestelde vragen</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                {expandedFaq === index ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>
              {expandedFaq === index && (
                <div className="border-t px-4 py-3">
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
