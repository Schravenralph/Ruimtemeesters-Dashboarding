import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGeoJson, type GeoJsonCollection, type GeoJsonFeature } from '../../services/api/geo';
import { useFilters } from '../../contexts/FilterContext';
import type { GeoLevel } from '@shared/api/contracts';

interface MapSelectorProps {
  onSelect?: (code: string, name: string, level: string) => void;
}

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'provincie', label: 'Provincies' },
  { value: 'gemeente', label: 'Gemeenten' },
];

const NL_CENTER: [number, number] = [52.15, 5.38];
const NL_ZOOM = 7;

const defaultStyle = {
  weight: 1,
  color: '#6b7280',
  fillColor: '#dbeafe',
  fillOpacity: 0.4,
};

const hoverStyle = {
  weight: 2,
  color: '#3b82f6',
  fillColor: '#93c5fd',
  fillOpacity: 0.6,
};

const selectedStyle = {
  weight: 2.5,
  color: '#1d4ed8',
  fillColor: '#60a5fa',
  fillOpacity: 0.7,
};

function FitBounds({ geojson }: { geojson: GeoJsonCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || geojson.features.length === 0) return;
    // Fit to NL bounds
    map.setView(NL_CENTER, NL_ZOOM);
  }, [geojson, map]);
  return null;
}

export function MapSelector({ onSelect }: MapSelectorProps) {
  const { filters, setGeoCode, setGeoLevel } = useFilters();
  const [level, setLevel] = useState<string>('provincie');
  const [geojson, setGeojson] = useState<GeoJsonCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    setLoading(true);
    getGeoJson(level)
      .then(data => {
        setGeojson(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [level]);

  const handleClick = useCallback((code: string, name: string) => {
    setGeoCode(code);
    setGeoLevel(level as GeoLevel);
    onSelect?.(code, name, level);
  }, [setGeoCode, setGeoLevel, level, onSelect]);

  const onEachFeature = useCallback((feature: GeoJsonFeature, layer: Layer) => {
    const { code, name } = feature.properties;

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        setHovered(code);
        e.target.setStyle(hoverStyle);
        e.target.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
        setHovered(null);
        if (filters.geoCode === code) {
          e.target.setStyle(selectedStyle);
        } else {
          e.target.setStyle(defaultStyle);
        }
      },
      click: () => handleClick(code, name),
    });

    layer.bindTooltip(name, { sticky: true, className: 'text-sm' });
  }, [filters.geoCode, handleClick]);

  const styleFeature = useCallback((feature?: GeoJSON.Feature) => {
    if (!feature?.properties) return defaultStyle;
    if (feature.properties.code === filters.geoCode) return selectedStyle;
    return defaultStyle;
  }, [filters.geoCode]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Level selector */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase">Niveau:</span>
        {LEVEL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setLevel(opt.value)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              level === opt.value
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {hovered && (
          <span className="ml-auto text-sm text-gray-500 truncate">{
            geojson?.features.find(f => f.properties.code === hovered)?.properties.name
          }</span>
        )}
      </div>

      {/* Map */}
      <div className="h-[400px] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[1000]">
            <span className="text-sm text-gray-400">Kaart laden...</span>
          </div>
        )}
        <MapContainer
          center={NL_CENTER}
          zoom={NL_ZOOM}
          className="h-full w-full"
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          {geojson && (
            <GeoJSON
              key={`${level}-${filters.geoCode}`}
              ref={geoJsonRef as React.Ref<L.GeoJSON>}
              data={geojson as GeoJSON.FeatureCollection}
              style={styleFeature}
              onEachFeature={onEachFeature as (feature: GeoJSON.Feature, layer: Layer) => void}
            />
          )}
          <FitBounds geojson={geojson} />
        </MapContainer>
      </div>
    </div>
  );
}
