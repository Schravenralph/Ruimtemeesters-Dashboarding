import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';

interface TimelineSliderProps {
  years: number[];
}

/**
 * Timeline slider for animating through years.
 * Mimics Primos's period selection with an animated play feature.
 */
export function TimelineSlider({ years }: TimelineSliderProps) {
  const { filters, setYear } = useFilters();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  const currentIndex = years.indexOf(filters.period.year);
  const sortedYears = [...years].sort((a, b) => a - b);

  function handlePlay() {
    if (isPlaying) {
      if (playInterval) clearInterval(playInterval);
      setPlayIntervalId(null);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let idx = currentIndex >= 0 ? currentIndex : 0;

    const interval = setInterval(() => {
      idx++;
      if (idx >= sortedYears.length) {
        idx = 0; // Loop back
      }
      setYear(sortedYears[idx]);
    }, 1500);

    setPlayIntervalId(interval);
  }

  function handlePrev() {
    const idx = Math.max(0, (currentIndex >= 0 ? currentIndex : 0) - 1);
    setYear(sortedYears[idx]);
  }

  function handleNext() {
    const idx = Math.min(sortedYears.length - 1, (currentIndex >= 0 ? currentIndex : 0) + 1);
    setYear(sortedYears[idx]);
  }

  if (sortedYears.length < 2) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Vorig jaar"
          >
            <SkipBack className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={handlePlay}
            className={`rounded-full p-2 ${isPlaying ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            aria-label={isPlaying ? 'Pauzeren' : 'Afspelen'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex >= sortedYears.length - 1}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Volgend jaar"
          >
            <SkipForward className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Slider */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={sortedYears.length - 1}
            value={currentIndex >= 0 ? currentIndex : 0}
            onChange={(e) => setYear(sortedYears[parseInt(e.target.value)])}
            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            aria-label="Jaar selecteren"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{sortedYears[0]}</span>
            <span className="text-sm font-semibold text-blue-600">{filters.period.year}</span>
            <span className="text-xs text-gray-400">{sortedYears[sortedYears.length - 1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
