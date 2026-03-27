import { useState, useRef } from 'react';
import { Download, Upload, Save, FolderOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { usePresentations } from '../../contexts/PresentationContext';
import { useFilters } from '../../contexts/FilterContext';
import { useThemes } from '../../contexts/ThemeContext';

interface WorkspaceData {
  version: 1;
  exportedAt: string;
  platform: 'ruimtemeesters-dashboard';
  presentations: Array<{
    title: string;
    themeSlug: string;
    filters: unknown;
    chartType: string;
    transformation: string;
    transformationOptions?: unknown;
  }>;
  activeSupercategory: string | null;
  activeThemeSlug: string | null;
}

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Workspace save/load dialog — like Primos's .xml workspace files.
 * Saves the full dashboard state (presentations, filters, active theme)
 * as a JSON file that can be reopened later.
 */
export function WorkspaceManager({ isOpen, onClose }: WorkspaceManagerProps) {
  const { presentations, addPresentation, removePresentation } = usePresentations();
  const { filters } = useFilters();
  const { activeTheme, activeSupercategory, setActiveSupercategory } = useThemes();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function exportWorkspace() {
    const workspace: WorkspaceData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      platform: 'ruimtemeesters-dashboard',
      presentations: presentations.map(p => ({
        title: p.title,
        themeSlug: p.themeSlug,
        filters: p.filters,
        chartType: p.chartType,
        transformation: p.transformation,
        transformationOptions: p.transformationOptions,
      })),
      activeSupercategory,
      activeThemeSlug: activeTheme?.slug || null,
    };

    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `werkruimte-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as WorkspaceData;

        if (data.platform !== 'ruimtemeesters-dashboard' || data.version !== 1) {
          setImportError('Ongeldig werkruimte bestand');
          return;
        }

        // Clear existing presentations (keep at least one)
        // Then add imported ones
        for (const pres of data.presentations) {
          addPresentation({
            title: pres.title,
            themeSlug: pres.themeSlug,
          });
        }

        if (data.activeSupercategory) {
          setActiveSupercategory(data.activeSupercategory);
        }

        setImportSuccess(true);
      } catch {
        setImportError('Bestand kon niet worden gelezen');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Werkruimte beheren" maxWidth="md">
      <div className="space-y-6">
        {/* Export */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-500" />
            Werkruimte opslaan
          </h4>
          <p className="text-sm text-gray-500 mb-3">
            Sla de huidige werkruimte op als JSON-bestand. Dit bevat alle presentatie-tabs,
            filters en instellingen.
          </p>
          <div className="text-xs text-gray-400 mb-3">
            <p>Huidige werkruimte: {presentations.length} presentatie(s)</p>
            <p>Actief thema: {activeTheme?.name || '—'}</p>
            <p>Supercategorie: {activeSupercategory || '—'}</p>
          </div>
          <Button onClick={exportWorkspace}>
            <Save className="h-4 w-4" />
            Opslaan als bestand
          </Button>
        </div>

        {/* Import */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-green-500" />
            Werkruimte openen
          </h4>
          <p className="text-sm text-gray-500 mb-3">
            Open een eerder opgeslagen werkruimte-bestand (.json).
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="workspace-import"
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen className="h-4 w-4" />
            Bestand kiezen
          </Button>

          {importError && (
            <p className="text-sm text-red-500 mt-2">{importError}</p>
          )}
          {importSuccess && (
            <p className="text-sm text-green-600 mt-2">Werkruimte succesvol geladen!</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t">
        <Button variant="ghost" onClick={onClose}>Sluiten</Button>
      </div>
    </Modal>
  );
}
