import { useState } from 'react';
import { Download, FileText, Table, Image, File, ChevronDown } from 'lucide-react';
import { useToast } from '../ui/Toast';
import type { TileConfig } from '@shared/api/contracts';

interface ExportMenuProps {
  tile?: TileConfig;
  onExport?: (format: string) => void;
}

const exportOptions = [
  { format: 'csv', label: 'CSV (Excel NL)', icon: Table, description: 'Puntkomma-gescheiden' },
  { format: 'excel', label: 'Excel', icon: File, description: 'XLSX formaat' },
  { format: 'pdf', label: 'PDF', icon: FileText, description: 'Document formaat' },
  { format: 'png', label: 'PNG', icon: Image, description: 'Afbeelding' },
];

export function ExportMenu({ tile, onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  function handleExport(format: string) {
    onExport?.(format);
    showToast('success', `Export als ${format.toUpperCase()} gestart`);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <Download className="h-4 w-4" />
        Exporteren
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-40 py-1">
            {exportOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{option.label}</p>
                    <p className="text-xs text-gray-400">{option.description}</p>
                  </div>
                </button>
              );
            })}

            {tile && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <a
                  href={`/api/export?source=${tile.dataSource}&format=csv`}
                  download
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
                  onClick={() => setIsOpen(false)}
                >
                  <Download className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-blue-600">Directe download</p>
                    <p className="text-xs text-gray-400">CSV via server API</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
