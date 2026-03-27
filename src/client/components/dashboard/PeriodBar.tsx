import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';
import { getAvailableYears } from '../../services/api/data';

interface PeriodBarProps {
  dataSource: string;
}

/**
 * Primos-style period bar with year buttons, slider, and play animation.
 * Shows at the bottom of the dashboard. Includes "Alle selecteren" and "Meest recente".
 */
export function PeriodBar({ dataSource }: PeriodBarProps) {
  const { filters, setYear } = useFilters();
  const [years, setYears] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearsRef = useRef(years);
  yearsRef.current = years; // Keep ref in sync for interval closure

  useEffect(() => {
    if (!dataSource) return;
    getAvailableYears(dataSource).then(r => setYears(r.years.sort((a, b) => a - b))).catch(() => {});
  }, [dataSource]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const currentYear = filters.period.year;
  const currentIndex = years.indexOf(currentYear);

  function play() {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let idx = currentIndex >= 0 ? currentIndex : 0;

    intervalRef.current = setInterval(() => {
      idx++;
      const currentYears = yearsRef.current;
      if (idx >= currentYears.length) idx = 0;
      setYear(currentYears[idx]);
    }, 1200);
  }

  function prev() {
    const idx = Math.max(0, (currentIndex >= 0 ? currentIndex : 0) - 1);
    setYear(years[idx]);
  }

  function next() {
    const idx = Math.min(years.length - 1, (currentIndex >= 0 ? currentIndex : 0) + 1);
    setYear(years[idx]);
  }

  function jumpToRecent() {
    if (years.length > 0) setYear(years[years.length - 1]);
  }

  if (years.length < 2) return null;

  return (
    <div className="print:hidden">
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-4 py-1"
      >
        {isVisible ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        {isVisible ? 'Verberg periodes' : 'Toon periodes'}
      </button>

      {isVisible && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Play controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={prev} disabled={currentIndex <= 0} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30">
                <SkipBack className="h-3.5 w-3.5 text-gray-500" />
              </button>
              <button
                onClick={play}
                className={`rounded-full p-1.5 transition-colors ${isPlaying ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={next} disabled={currentIndex >= years.length - 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30">
                <SkipForward className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>

            {/* Year buttons */}
            <div className="flex-1 flex gap-1 overflow-x-auto py-1">
              {years.map(yr => (
                <button
                  key={yr}
                  onClick={() => setYear(yr)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors shrink-0 ${
                    yr === currentYear
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={jumpToRecent}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                Meest recente
              </button>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={years.length - 1}
            value={currentIndex >= 0 ? currentIndex : 0}
            onChange={(e) => setYear(years[parseInt(e.target.value)])}
            className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600 mt-2"
          />
        </div>
      )}
    </div>
  );
}
