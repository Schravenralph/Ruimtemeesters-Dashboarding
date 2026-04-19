import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight, Target, Users, Brain, Lightbulb, Sun, Zap, Recycle, type LucideIcon } from 'lucide-react';
import { api } from '../../services/api/client';

interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  value: string;
  link?: string;
}

const iconMap: Record<string, LucideIcon> = {
  TrendingUp, TrendingDown, ArrowUpRight, Target, Users, Brain, Sun, Zap, Recycle,
};

interface QuickInsightsProps {
  category?: 'wonen' | 'duurzaamheid';
}

export function QuickInsights({ category }: QuickInsightsProps = {}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ insights: Insight[] }>('/insights', category ? { category } : undefined)
      .then(d => setInsights(d.insights))
      .catch(() => setInsights([]));
  }, [category]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-700">Snelle inzichten</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.slice(0, 6).map(insight => {
          const Icon = iconMap[insight.icon] || Lightbulb;
          return (
            <button
              key={insight.id}
              onClick={() => insight.link && navigate(insight.link)}
              className={`rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all ${insight.link ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{insight.description}</p>
                </div>
                <span className="text-lg font-bold text-blue-600 flex-shrink-0 ml-auto">
                  {insight.value}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
