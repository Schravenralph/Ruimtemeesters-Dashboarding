import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Home, Building2, TrendingDown, ArrowRight, Download, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

const quickLinks = [
  { slug: 'bevolking', label: 'Bevolking', icon: Users, color: '#3b82f6', description: 'Bevolkingssamenstelling en -ontwikkeling' },
  { slug: 'huishoudens', label: 'Huishoudens', icon: Home, color: '#10b981', description: 'Huishoudenssamenstelling per type' },
  { slug: 'woningen', label: 'Woningen', icon: Building2, color: '#8b5cf6', description: 'Woningvoorraad en eigendom' },
  { slug: 'woningtekort', label: 'Woningtekort', icon: TrendingDown, color: '#f59e0b', description: 'Tekort, vraag en aanbod analyse' },
];

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold mb-4">
          RM
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAuthenticated ? `Welkom, ${user?.name}` : 'Ruimtemeesters Dashboard'}
        </h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Interactief dashboard platform voor demografische en woningmarkt analyse
          van Nederlandse gemeenten, provincies en regio's.
        </p>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {quickLinks.map(link => {
          const Icon = link.icon;
          return (
            <button
              key={link.slug}
              onClick={() => navigate(`/dashboard/${link.slug}`)}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                style={{ backgroundColor: `${link.color}15` }}
              >
                <Icon className="h-6 w-6" style={{ color: link.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{link.label}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{link.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 mt-1 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="secondary" onClick={() => navigate('/download')}>
          <Download className="h-4 w-4" /> Data downloaden
        </Button>
        {isAuthenticated && (
          <Button variant="secondary" onClick={() => navigate('/mijn-dashboards')}>
            <BarChart3 className="h-4 w-4" /> Mijn Dashboards
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate('/help')}>
          Help & Documentatie
        </Button>
      </div>
    </div>
  );
}
