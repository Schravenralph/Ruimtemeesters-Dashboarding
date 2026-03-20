import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startYear: number;
  endYear: number;
  onStartChange: (year: number) => void;
  onEndChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

const defaultMinYear = 2000;
const defaultMaxYear = 2040;

export function DateRangePicker({
  startYear,
  endYear,
  onStartChange,
  onEndChange,
  minYear = defaultMinYear,
  maxYear = defaultMaxYear,
}: DateRangePickerProps) {
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
      <select
        value={startYear}
        onChange={(e) => onStartChange(parseInt(e.target.value))}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
        aria-label="Startjaar"
      >
        {years.filter(y => y <= endYear).map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <span className="text-gray-400">–</span>
      <select
        value={endYear}
        onChange={(e) => onEndChange(parseInt(e.target.value))}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
        aria-label="Eindjaar"
      >
        {years.filter(y => y >= startYear).map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
