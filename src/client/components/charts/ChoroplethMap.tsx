import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import type { DataPoint, ReferenceSeries } from '@shared/api/contracts';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { sortReferences, pickReferenceValueAtYear, getReferenceStyle } from '../../utils/referenceSeries';
import 'leaflet/dist/leaflet.css';

interface ChoroplethMapProps {
  data: DataPoint[];
  /**
   * SPEC-B: cohort/provincie/land reference series. Rendered as legend markers showing
   * cohort + national mean values. Outlining cohort gemeenten on the map itself defers
   * to SPEC-C (needs the cohort_members list from useCohortMemberships, not the
   * aggregated value already in this prop).
   */
  references?: ReferenceSeries[];
}

const NL_CENTER: [number, number] = [52.2, 5.3];
const NL_ZOOM = 7;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Aggregate data by geoCode → total value */
function aggregateByGeo(data: DataPoint[]): Map<string, { name: string; total: number }> {
  const agg = new Map<string, { name: string; total: number }>();
  for (const d of data) {
    const existing = agg.get(d.geoCode) || { name: d.geoName, total: 0 };
    existing.total += d.value;
    agg.set(d.geoCode, existing);
  }
  return agg;
}

function Legend({
  min,
  max,
  colorScale,
  references,
  chartYears,
}: {
  min: number;
  max: number;
  colorScale: (v: number) => string;
  references?: ReferenceSeries[];
  chartYears: number[];
}) {
  const steps = 6;
  const range = max - min || 1;
  // SPEC-B: cohort + land legend markers (provincie omitted on maps per spec).
  const refMarkers = (references && references.length > 0)
    ? sortReferences(references)
        .filter(ref => ref.kind === 'cohort' || ref.kind === 'land')
        .map(ref => ({ ref, value: pickReferenceValueAtYear(ref, chartYears) }))
        .filter((m): m is { ref: ReferenceSeries; value: number } => m.value !== undefined)
    : [];

  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 rounded-lg shadow-md px-3 py-2 text-xs">
      <div className="flex items-center gap-0.5 mb-1">
        {Array.from({ length: steps }, (_, i) => {
          const val = min + (range * i) / (steps - 1);
          return <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: colorScale(val) }} />;
        })}
      </div>
      <div className="flex justify-between text-gray-600">
        <span>{min.toLocaleString('nl-NL')}</span>
        <span>{max.toLocaleString('nl-NL')}</span>
      </div>
      {refMarkers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          {refMarkers.map(({ ref, value }) => {
            const style = getReferenceStyle(ref.kind);
            return (
              <div key={ref.kind} className="flex items-center gap-2 text-[11px]">
                <span className="inline-block w-4" style={{ borderTop: `2px ${ref.kind === 'land' ? 'dotted' : 'dashed'} ${style.stroke}`, opacity: style.opacity }} />
                <span className="text-gray-700">{ref.label}: {Math.round(value).toLocaleString('nl-NL')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FitBounds({ geojson }: { geojson: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geojson, map]);
  return null;
}

function ChoroplethLayer({
  geojson,
  aggregated,
  colorScale,
  minVal,
  maxVal,
}: {
  geojson: FeatureCollection;
  aggregated: Map<string, { name: string; total: number }>;
  colorScale: (v: number) => string;
  minVal: number;
  maxVal: number;
}) {
  const style = useCallback(
    (feature: Feature<Geometry> | undefined) => {
      if (!feature?.properties) return { fillColor: '#f0ece4', fillOpacity: 0.3, color: '#ccc', weight: 0.5 };
      const code = feature.properties.statcode as string;
      const entry = aggregated.get(code);
      if (!entry) return { fillColor: '#f0ece4', fillOpacity: 0.3, color: '#d4c9b8', weight: 0.5 };
      return {
        fillColor: colorScale(entry.total),
        fillOpacity: 0.75,
        color: '#fff',
        weight: 1,
      };
    },
    [aggregated, colorScale],
  );

  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const code = feature.properties?.statcode as string;
      const name = feature.properties?.statnaam as string;
      const entry = aggregated.get(code);
      const value = entry?.total ?? 0;

      (layer as L.Path).bindTooltip(
        `<strong>${name}</strong><br/>${value.toLocaleString('nl-NL')}`,
        { sticky: true, className: 'choropleth-tooltip' },
      );

      (layer as L.Path).on({
        mouseover: (e) => {
          const target = e.target as L.Path;
          target.setStyle({ weight: 2.5, color: '#333', fillOpacity: 0.85 });
          target.bringToFront();
        },
        mouseout: (e) => {
          const target = e.target as L.Path;
          target.setStyle(style(feature));
        },
      });
    },
    [aggregated, style],
  );

  return <GeoJSON key={JSON.stringify([...aggregated.keys()].sort())} data={geojson} style={style} onEachFeature={onEachFeature} />;
}

export function ChoroplethMapComponent({ data, references }: ChoroplethMapProps) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch('/data/gemeenten_boundaries_official.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  const aggregated = useMemo(() => aggregateByGeo(data), [data]);

  const { min, max, colorScale } = useMemo(() => {
    const values = [...aggregated.values()].map((e) => e.total);
    const mn = Math.min(...values, 0);
    const mx = Math.max(...values, 1);
    const scale = scaleSequential().domain([mn, mx]).interpolator(interpolateBlues);
    return { min: mn, max: mx, colorScale: (v: number) => scale(v) || '#f0ece4' };
  }, [aggregated]);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  return (
    <div className="relative w-full" style={{ height: 420 }}>
      <MapContainer
        center={NL_CENTER}
        zoom={NL_ZOOM}
        scrollWheelZoom
        className="h-full w-full rounded-lg"
        style={{ background: '#f8f7f4' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geojson && (
          <>
            <ChoroplethLayer
              geojson={geojson}
              aggregated={aggregated}
              colorScale={colorScale}
              minVal={min}
              maxVal={max}
            />
            <FitBounds geojson={geojson} />
          </>
        )}
      </MapContainer>
      <Legend min={min} max={max} colorScale={colorScale} references={references} chartYears={[...new Set(data.map(d => d.year))]} />
    </div>
  );
}
