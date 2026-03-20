import { formatDateTime } from '../../utils/format';

interface DashboardFooterProps {
  lastUpdated?: string;
  dataSource?: string;
  geoArea?: string;
  year?: number;
}

/**
 * Dashboard footer with metadata.
 * Shows data source, last update time, and current context.
 */
export function DashboardFooter({ lastUpdated, dataSource, geoArea, year }: DashboardFooterProps) {
  return (
    <footer className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 print:mt-4">
      <div className="flex items-center gap-4">
        <span>Ruimtemeesters Dashboard v0.1.0</span>
        {dataSource && <span>Bron: {dataSource}</span>}
        {geoArea && <span>Gebied: {geoArea}</span>}
        {year && <span>Jaar: {year}</span>}
      </div>
      <div>
        {lastUpdated
          ? `Laatste update: ${formatDateTime(lastUpdated)}`
          : `Bekeken op: ${formatDateTime(new Date().toISOString())}`}
      </div>
    </footer>
  );
}
