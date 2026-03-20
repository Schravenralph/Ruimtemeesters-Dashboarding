import type { TileConfig } from '@shared/api/contracts';

export function exportTile(tile: TileConfig, format: string) {
  switch (format) {
    case 'csv':
      exportAsCsv(tile);
      break;
    case 'png':
      exportAsPng(tile);
      break;
    case 'pdf':
      exportAsPdf(tile);
      break;
    case 'excel':
      exportAsExcel(tile);
      break;
    default:
      console.warn(`Unknown export format: ${format}`);
  }
}

function exportAsCsv(tile: TileConfig) {
  // Fetch the current data from the tile's data source
  fetch(`/api/data/query?source=${tile.dataSource}`)
    .then(res => res.json())
    .then(response => {
      const { data } = response;
      if (!data || data.length === 0) return;

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map((row: Record<string, unknown>) =>
          headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
        ),
      ].join('\n');

      downloadFile(csv, `${tile.title}.csv`, 'text/csv');
    });
}

function exportAsPng(tile: TileConfig) {
  // Find the tile's chart container and use canvas
  const tileElement = document.querySelector(`[data-tile-id="${tile.id}"]`);
  if (!tileElement) {
    // Fallback: just notify
    alert(`PNG export voor "${tile.title}" — chart element niet gevonden. Gebruik de browser's screenshot functie.`);
    return;
  }
}

async function exportAsPdf(tile: TileConfig) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(tile.title, 20, 20);

  doc.setFontSize(10);
  doc.text(`Bron: ${tile.dataSource}`, 20, 30);
  doc.text(`Type: ${tile.chartType}`, 20, 36);
  doc.text(`Geexporteerd: ${new Date().toLocaleString('nl-NL')}`, 20, 42);

  doc.save(`${tile.title}.pdf`);
}

async function exportAsExcel(tile: TileConfig) {
  const response = await fetch(`/api/data/query?source=${tile.dataSource}`);
  const { data } = await response.json();

  if (!data || data.length === 0) return;

  // Simple CSV with .xlsx extension as a basic fallback
  // A full implementation would use the xlsx library
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join('\t'),
    ...data.map((row: Record<string, unknown>) =>
      headers.map(h => String(row[h] ?? '')).join('\t')
    ),
  ].join('\n');

  downloadFile(csv, `${tile.title}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
