import { useState, useEffect } from 'react';
import { LayoutTemplate, Star, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api/client';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tiles: unknown[];
  isFeatured: boolean;
  usageCount: number;
}

export function TemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    api.get<{ templates: Template[] }>('/templates')
      .then(({ templates }) => setTemplates(templates))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUseTemplate(id: string) {
    try {
      const result = await api.post<{ dashboardId: string }>(`/templates/${id}/use`);
      showToast('success', 'Dashboard aangemaakt vanuit sjabloon');
      navigate(`/mijn-dashboards/${result.dashboardId}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Aanmaken mislukt');
    }
  }

  if (isLoading) return <LoadingOverlay message="Sjablonen laden..." />;

  const categories = [...new Set(templates.map(t => t.category))];
  const filtered = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sjablonen</h3>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={selectedCategory === null ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-gray-500">
            <LayoutTemplate className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Geen sjablonen beschikbaar</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {template.isFeatured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{(template.tiles as unknown[]).length} tegels</span>
                  <span>{template.usageCount}x gebruikt</span>
                  <span className="capitalize">{template.category}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Button size="sm" onClick={() => handleUseTemplate(template.id)} className="w-full">
                  <Plus className="h-4 w-4" /> Gebruik sjabloon
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
