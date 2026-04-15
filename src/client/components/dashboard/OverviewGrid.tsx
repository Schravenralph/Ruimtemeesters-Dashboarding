import { useEffect, useState } from 'react';
import { Users, Home, Building2, TrendingDown, ArrowRight, Zap, Leaf, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { queryData } from '../../services/api/data';
import { MiniChart } from './MiniChart';
import { useFilters } from '../../contexts/FilterContext';
import { formatNumber, formatCompact } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface OverviewItem {
  slug: string;
  label: string;
  icon: typeof Users;
  color: string;
  dataSource: string;
  data: DataPoint[];
}

const WONEN_CONFIG: Omit<OverviewItem, 'data'>[] = [
  { slug: 'bevolking', label: 'Bevolking', icon: Users, color: '#3b82f6', dataSource: 'bevolking' },
  { slug: 'huishoudens', label: 'Huishoudens', icon: Home, color: '#10b981', dataSource: 'huishoudens' },
  { slug: 'woningen', label: 'Woningen', icon: Building2, color: '#8b5cf6', dataSource: 'woningen' },
  { slug: 'woningtekort', label: 'Woningtekort', icon: TrendingDown, color: '#f59e0b', dataSource: 'woningtekort' },
];

const DUURZAAMHEID_CONFIG: Omit<OverviewItem, 'data'>[] = [
  { slug: 'energie', label: 'Energie', icon: Zap, color: '#f59e0b', dataSource: 'energie' },
  { slug: 'hernieuwbare-energie', label: 'Hernieuwbaar', icon: Leaf, color: '#10b981', dataSource: 'hernieuwbaar' },
  { slug: 'afval-circulair', label: 'Afval & Circulair', icon: Trash2, color: '#8b5cf6', dataSource: 'afval' },
];

interface OverviewGridProps {
  supercategory?: string;
}

export function OverviewGrid({ supercategory }: OverviewGridProps) {
  const { filters } = useFilters();
  const navigate = useNavigate();
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const overviewConfig = supercategory === 'duurzaamheid' ? DUURZAAMHEID_CONFIG : WONEN_CONFIG;

  useEffect(() => {
    setIsLoading(true);
    Promise.all(
      overviewConfig.map(async config => {
        try {
          const response = await queryData({
            source: config.dataSource,
            geoCode: filters.geoCode,
          });
          return { ...config, data: response.data };
        } catch {
          return { ...config, data: [] };
        }
      }),
    ).then(items => {
      setItems(items);
      setIsLoading(false);
    });
  }, [filters.geoCode, supercategory]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: overviewConfig.length }, (_, i) => i + 1).map(i => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {items.map(item => {
        const Icon = item.icon;
        const total = item.data
          .filter(d => d.year === filters.period.year)
          .reduce((sum, d) => sum + d.value, 0);

        return (
          <button
            key={item.slug}
            onClick={() => navigate(`/dashboard/${item.slug}`)}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">{item.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCompact(total)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.data.filter(d => d.year === filters.period.year).length} datapunten in {filters.period.year}
                </p>
              </div>
              <div className="w-24 h-10">
                <MiniChart data={item.data} color={item.color} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Bekijk details</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
