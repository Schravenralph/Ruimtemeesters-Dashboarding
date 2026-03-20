import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { LoadingOverlay } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api/client';

interface ImportRecord {
  id: string;
  userName: string;
  source: string;
  filename: string;
  rowCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function DataImportPanel() {
  const [source, setSource] = useState('bevolking');
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const { imports } = await api.get<{ imports: ImportRecord[] }>('/import/history');
      setHistory(imports);
    } catch {}
    setIsLoadingHistory(false);
  }

  async function handleImport() {
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();

      // Parse CSV
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, string | number> = {};
        headers.forEach((h, i) => {
          const val = values[i];
          row[h] = isNaN(Number(val)) ? val : Number(val);
        });
        return row;
      });

      const result = await api.post<{
        importId: string;
        totalRows: number;
        insertedRows: number;
        skippedRows: number;
      }>('/import', { source, data });

      showToast('success', `Import geslaagd: ${result.insertedRows} rijen geimporteerd, ${result.skippedRows} overgeslagen`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadHistory();
    } catch (err) {
      showToast('error', `Import mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsImporting(false);
    }
  }

  const statusIcons = {
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <AlertCircle className="h-4 w-4 text-red-500" />,
    processing: <Clock className="h-4 w-4 text-yellow-500" />,
    pending: <Clock className="h-4 w-4 text-gray-400" />,
  };

  return (
    <div className="space-y-6">
      {/* Import Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold mb-4">Data importeren</h3>

        <div className="flex items-end gap-4">
          <Select
            label="Databron"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={[
              { value: 'bevolking', label: 'Bevolking' },
              { value: 'huishoudens', label: 'Huishoudens' },
              { value: 'woningen', label: 'Woningen' },
              { value: 'woningtekort', label: 'Woningtekort' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV-bestand</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
          </div>

          <Button onClick={handleImport} disabled={!file || isImporting}>
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importeren...' : 'Importeren'}
          </Button>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          CSV-bestand met kolommen: geo_code, year, value, en databron-specifieke dimensiekolommen.
          Maximum 50.000 rijen per import.
        </div>
      </div>

      {/* Import History */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Import historie</h3>

        {isLoadingHistory ? (
          <LoadingOverlay />
        ) : history.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            Nog geen imports uitgevoerd.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bron</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gebruiker</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rijen</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcons[record.status as keyof typeof statusIcons] || statusIcons.pending}
                        <span className="text-sm capitalize">{record.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{record.source}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                      {record.rowCount.toLocaleString('nl-NL')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleString('nl-NL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
