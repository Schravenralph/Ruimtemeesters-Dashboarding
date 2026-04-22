import type { TileConfig, DataPoint } from '@shared/api/contracts';

export function exportTile(tile: TileConfig, format: string, data?: DataPoint[]) {
  switch (format) {
    case 'csv':
      exportAsCsv(tile, data);
      break;
    case 'png':
      exportAsPng(tile);
      break;
    case 'pdf':
      exportAsPdf(tile);
      break;
    case 'excel':
      exportAsExcel(tile, data);
      break;
    default:
      console.warn(`Unknown export format: ${format}`);
  }
}

function toExportRows(data?: DataPoint[]): Record<string, unknown>[] {
  if (!data || data.length === 0) return [];
  return data.map(d => {
    const row: Record<string, unknown> = {
      year: d.year,
      geo_code: d.geoCode,
      geo_name: d.geoName,
      value: d.value,
      source: d.source,
    };
    if (d.dimensionValue !== undefined && d.dimensionValue !== null) {
      row.dimension = d.dimensionValue;
    }
    if (d.confidenceLower !== undefined && d.confidenceLower !== null) {
      row.confidence_lower = d.confidenceLower;
    }
    if (d.confidenceUpper !== undefined && d.confidenceUpper !== null) {
      row.confidence_upper = d.confidenceUpper;
    }
    return row;
  });
}

function exportAsCsv(tile: TileConfig, data?: DataPoint[]) {
  const rows = toExportRows(data);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]!);
  const csv = [
    headers.join(';'),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const str = String(v).replace(/"/g, '""');
        return str.includes(';') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(';'),
    ),
  ].join('\n');

  downloadFile(csv, `${tile.title}.csv`, 'text/csv;charset=utf-8');
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

async function exportAsExcel(tile: TileConfig, data?: DataPoint[]) {
  const rows = toExportRows(data);
  if (rows.length === 0) return;

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  const sheetName = tile.title.replace(/[\\/*?:\[\]]/g, '-').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${tile.title}.xlsx`);
}

export async function exportBulkPdf(tiles: TileConfig[], themeName: string) {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;
  const doc = new jsPDF();

  // Cover page
  doc.setFontSize(24);
  doc.text(themeName, 20, 40);
  doc.setFontSize(11);
  doc.text(`Geexporteerd: ${new Date().toLocaleString('nl-NL')}`, 20, 52);
  doc.text(`Aantal tegels: ${tiles.length}`, 20, 59);
  doc.setFontSize(9);
  doc.text('Bron: CBS, StatLine (opendata.cbs.nl) — Licentie: CC-BY 4.0', 20, 70);

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    doc.addPage();

    doc.setFontSize(14);
    doc.text(tile.title, 20, 20);
    doc.setFontSize(9);
    doc.text(`Bron: ${tile.dataSource} | Type: ${tile.chartType}`, 20, 28);

    const tileElement = document.querySelector(`[data-tile-id="${tile.id}"]`) as HTMLElement | null;
    if (tileElement) {
      try {
        const canvas = await html2canvas(tileElement, { backgroundColor: '#ffffff', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170;
        const imgHeight = Math.min((canvas.height / canvas.width) * imgWidth, 220);
        doc.addImage(imgData, 'PNG', 20, 35, imgWidth, imgHeight);
      } catch {
        doc.setFontSize(10);
        doc.text('(Tegel kon niet worden gerenderd)', 20, 45);
      }
    }
  }

  doc.save(`${themeName}.pdf`);
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
