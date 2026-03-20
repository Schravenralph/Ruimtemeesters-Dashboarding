import { Database, Users, Home, Building2, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DataSourceOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const dataSources: DataSourceOption[] = [
  { value: 'bevolking', label: 'Bevolking', description: 'Bevolkingsgegevens per leeftijd en geslacht', icon: Users, color: '#3b82f6' },
  { value: 'huishoudens', label: 'Huishoudens', description: 'Huishoudenssamenstelling', icon: Home, color: '#10b981' },
  { value: 'woningen', label: 'Woningen', description: 'Woningvoorraad en eigendom', icon: Building2, color: '#8b5cf6' },
  { value: 'woningtekort', label: 'Woningtekort', description: 'Tekort, vraag en aanbod', icon: TrendingDown, color: '#f59e0b' },
];

interface DataSourceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  layout?: 'horizontal' | 'vertical';
}

export function DataSourceSelector({ value, onChange, layout = 'horizontal' }: DataSourceSelectorProps) {
  return (
    <div className={layout === 'horizontal' ? 'flex gap-2' : 'space-y-2'}>
      {dataSources.map(source => {
        const Icon = source.icon;
        const isSelected = value === source.value;
        return (
          <button
            key={source.value}
            onClick={() => onChange(source.value)}
            className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
              layout === 'horizontal' ? 'flex-1' : 'w-full'
            } ${
              isSelected
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${source.color}15` }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: source.color }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                {source.label}
              </p>
              <p className="text-xs text-gray-500 truncate">{source.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
