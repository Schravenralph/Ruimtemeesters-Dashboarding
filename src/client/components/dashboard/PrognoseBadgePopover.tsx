import { useState, useRef, useEffect } from 'react';
import { Brain, ExternalLink, Info } from 'lucide-react';
import { useTsaMeta } from '../../hooks/useTsaMeta';

interface PrognoseBadgePopoverProps {
  dataSource: string;
  geoCode: string;
}

/**
 * AI Prognose badge that, on hover or click, reveals a popover with the
 * provenance a reader needs to evaluate the forecast: engine, model profile,
 * training window, forecast horizon, confidence interval, refit timestamp,
 * underlying CBS source (#149).
 */
export function PrognoseBadgePopover({ dataSource, geoCode }: PrognoseBadgePopoverProps) {
  const meta = useTsaMeta(dataSource, geoCode);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to close (hover alone is too brittle for a popover with
  // a link in it).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center gap-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Brain className="h-4 w-4 text-purple-600" />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm font-semibold text-purple-800 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-300 rounded"
        aria-expanded={open}
      >
        AI Prognose (TSA Engine)
        <Info className="h-3 w-3 text-purple-400" />
      </button>
      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">
        {meta?.models ?? 7} modellen &middot; {meta?.confidence ?? 95}% betrouwbaarheid
      </span>

      {open && meta && meta.hasPrognose && (
        <div
          role="dialog"
          className="absolute left-0 top-full mt-2 z-30 w-[360px] rounded-lg border border-purple-200 bg-white p-4 shadow-xl text-sm"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-3 flex items-start gap-2">
            <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">{meta.source}</p>
              <p className="text-xs text-gray-500">
                Een ensemble van {meta.models} tijdreeksmodellen (Prophet, SARIMA,
                HoltWinters, XGBoost, NeuralProphet, LSTM, StateSpace) extrapoleert
                de historische CBS-data naar de toekomst.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {meta.modelProfile && (
              <Row label="Model profiel" value={titleCase(meta.modelProfile)} />
            )}
            {meta.trainStart && meta.trainEnd && (
              <Row
                label="Trainingsvenster"
                value={`${meta.trainStart} – ${meta.trainEnd}`}
              />
            )}
            {meta.forecastStart && meta.forecastEnd && (
              <Row
                label="Prognose horizon"
                value={`${meta.forecastStart} – ${meta.forecastEnd}`}
              />
            )}
            {meta.confidence != null && (
              <Row label="Betrouwbaarheid" value={`${meta.confidence}% interval`} />
            )}
            {meta.lastRefit && (
              <Row
                label="Laatst getraind"
                value={new Date(meta.lastRefit).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
            )}
            {meta.cbsTableId && (
              <div className="col-span-2 pt-1 mt-1 border-t border-gray-100">
                <dt className="text-gray-500">Brondata</dt>
                <dd className="text-gray-900 font-medium flex items-center gap-1">
                  CBS {meta.cbsTableId}
                  {meta.cbsTableTitle && (
                    <span className="text-gray-500 font-normal"> — {meta.cbsTableTitle}</span>
                  )}
                  <a
                    href={`https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${meta.cbsTableId}/table`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800"
                    aria-label="Bekijk op CBS StatLine"
                  >
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-3 text-[11px] text-gray-400 leading-snug">
            Prognoses zijn modelgebaseerde extrapolaties — geen verklaring over
            beleid, schokken of structurele veranderingen. Geen rechten te ontlenen.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
