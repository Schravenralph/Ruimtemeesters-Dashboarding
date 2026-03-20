import { Download, Edit3, Save, X, Printer, Share2, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { ExportMenu } from './ExportMenu';
import type { ThemeConfig } from '@shared/api/contracts';

interface DashboardHeaderProps {
  theme: ThemeConfig;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaveLayout: () => void;
  onExportAll: () => void;
  onPrint: () => void;
  canEdit: boolean;
}

/**
 * Reusable dashboard header with title, actions, and export menu.
 */
export function DashboardHeader({
  theme,
  isEditing,
  onToggleEdit,
  onSaveLayout,
  onExportAll,
  onPrint,
  canEdit,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{theme.name}</h1>
        {theme.description && (
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{theme.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <span>{theme.tiles.length} tegels</span>
          <span>·</span>
          <span className="capitalize">{theme.tiles[0]?.dataSource || 'geen bron'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ExportMenu onExport={(format) => {
          if (format === 'pdf') onExportAll();
        }} />

        <Button variant="ghost" size="sm" onClick={onPrint} title="Afdrukken">
          <Printer className="h-4 w-4" />
        </Button>

        {canEdit && (
          isEditing ? (
            <>
              <Button variant="primary" size="sm" onClick={onSaveLayout}>
                <Save className="h-4 w-4" />
                Opslaan
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleEdit}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={onToggleEdit}>
              <Edit3 className="h-4 w-4" />
              Bewerken
            </Button>
          )
        )}
      </div>
    </div>
  );
}
