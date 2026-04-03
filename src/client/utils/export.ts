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

async function fetchTileData(tile: TileConfig) {
  const res = await fetch(`/api/data/query?source=${tile.dataSource}`);
  const { data } = await res.json();
  return data as Record<string, unknown>[] | undefined;
}

function exportAsCsv(tile: TileConfig) {
  fetchTileData(tile).then(data => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(';'),
      ...data.map(row =>
        headers.map(h => {
          const v = row[h];
          if (v === null || v === undefined) return '';
          const str = String(v).replace(/"/g, '""');
          return str.includes(';') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(';')
      ),
    ].join('\n');

    downloadFile(csv, `${tile.title}.csv`, 'text/csv;charset=utf-8');
  });
}

async function exportAsPng(tile: TileConfig) {
  const tileElement = document.querySelector(`[data-tile-id="${tile.id}"]`) as HTMLElement | null;
  if (!tileElement) return;

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(tileElement, {
    backgroundColor: '#ffffff',
    scale: 2,
  });

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tile.title}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

async function exportAsPdf(tile: TileConfig) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(tile.title, 20, 20);

  doc.setFontSize(10);
  doc.text(`Bron: ${tile.dataSource}`, 20, 30);
  doc.text(`Geexporteerd: ${new Date().toLocaleString('nl-NL')}`, 20, 36);

  // Capture chart as image if available
  const tileElement = document.querySelector(`[data-tile-id="${tile.id}"]`) as HTMLElement | null;
  if (tileElement) {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(tileElement, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 170;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;
    doc.addImage(imgData, 'PNG', 20, 45, imgWidth, imgHeight);
  }

  doc.save(`${tile.title}.pdf`);
}

async function exportAsExcel(tile: TileConfig) {
  const data = await fetchTileData(tile);
  if (!data || data.length === 0) return;

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tile.title.slice(0, 31));
  XLSX.writeFile(wb, `${tile.title}.xlsx`);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
