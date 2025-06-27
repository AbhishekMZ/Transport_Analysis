'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Importing API clients for GeoJSON and Traffic data
import {
  GeoJSONAPI,
  AnalysisAPI,
  TrafficAPI,
  GeoJSONResponse,
  GeoJSONFeature,
  TrafficFlow,
  TrafficIncident,
} from '@/lib/api';

// Reuse the base GeoJSONFeature shape – this alias allows extra properties while keeping required ones
type GeoJSONFeatureExtended = GeoJSONFeature;

// Props interface for the TransportMap component
interface TransportMapProps {
  selectedYear?: number;
  showRoads?: boolean;
  showBusStops?: boolean;
  showBusRoutes?: boolean;
  showMetroStations?: boolean;
  showMetroLines?: boolean;
  showTrafficFlow?: boolean;
  showIncidents?: boolean;
  showCriticalNodes?: boolean;
  showForecastResults?: boolean;
  showSimulationResults?: boolean;
  height?: string;
  onMapClick?: (e: L.LeafletMouseEvent) => void;
  onMapCreated?: (map: L.Map) => void;
}

// Leaflet components (client-side only since this file is a `use client` component)
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';

// A helper component to handle map events
const MapEvents = ({ onMapClick }: { onMapClick?: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e);
      }
    },
  });
  return null;
};

const TransportMap: React.FC<TransportMapProps> = ({
  selectedYear = 2024,
  showRoads = true,
  showBusStops = false,
  showBusRoutes = false,
  showMetroStations = false,
  showMetroLines = false,
  showTrafficFlow = true,
  showIncidents = true,
  showCriticalNodes = false,
  showForecastResults = false,
  showSimulationResults = false,
  height = '600px',
  onMapClick,
  onMapCreated,
}) => {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  // Explicit union of layer keys to ensure strong typing
  type LayerKey =
    | 'roads'
    | 'busStops'
    | 'busRoutes'
    | 'metroStations'
    | 'metroLines'
    | 'criticalNodes'
    | 'trafficFlow'
    | 'incidents'
    | 'forecast'
    | 'simulationBefore'
    | 'simulationAfter';

  const [layersData, setLayersData] = useState<Record<LayerKey, GeoJSONFeatureExtended[]>>({
    roads: [],
    busStops: [],
    busRoutes: [],
    metroStations: [],
    metroLines: [],
    criticalNodes: [],
    trafficFlow: [],
    incidents: [],
    forecast: [],
    simulationBefore: [],
    simulationAfter: [],
  });

  const [loading, setLoading] = useState<Partial<Record<LayerKey, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  const createCustomIcon = useCallback((color: string, iconHtml?: string) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold;">${iconHtml || ''}</div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchData = useCallback(async (
    layerKey: LayerKey,
    fetcher: () => Promise<any>
  ) => {
    setLoading(prev => ({ ...prev, [layerKey]: true }));
    setError(null);

    try {
      const response = await fetcher();
      // Ensure the response has a features property
      const features = response.features || (Array.isArray(response) ? response : []);
      
      setLayersData(prev => ({
        ...prev,
        [layerKey]: features as GeoJSONFeatureExtended[],
      }));

      if (!features.length) {
        console.warn(`No features found for ${layerKey}.`);
      }
    } catch (err: any) {
      console.error(`Error fetching ${layerKey} data:`, err);
      setError(`Failed to load ${layerKey.replace(/([A-Z])/g, ' $1').toLowerCase()} data: ${err.message || 'Unknown error'}.`);
      setLayersData(prev => ({ ...prev, [layerKey]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [layerKey]: false }));
    }
  }, []);

  useEffect(() => {
    if (showRoads) fetchData('roads', () => GeoJSONAPI.getRoadNetwork(selectedYear));
    if (showBusStops) fetchData('busStops', () => GeoJSONAPI.getBusStops(selectedYear));
    // Additional logic needed for bus routes if it's a separate endpoint
    // if (showBusRoutes) fetchData('busRoutes', () => GeoJSONAPI.getBusRoutes(selectedYear));
    if (showMetroStations) fetchData('metroStations', () => GeoJSONAPI.getMetroStations(selectedYear));
    // Additional logic needed for metro lines if it's a separate endpoint
    // if (showMetroLines) fetchData('metroLines', () => GeoJSONAPI.getMetroLines(selectedYear));
    if (showCriticalNodes) fetchData('criticalNodes', () => AnalysisAPI.getCriticalNodes());
  }, [selectedYear, showRoads, showBusStops, showBusRoutes, showMetroStations, showMetroLines, showCriticalNodes, fetchData]);

  useEffect(() => {
    if (showTrafficFlow || showIncidents) {
      if (!wsRef.current) {
        const ws = TrafficAPI.connectToTrafficSocket();
        wsRef.current = ws;

        ws.onopen = () => console.log('WebSocket connection opened.');
        ws.onerror = (error) => console.error('WebSocket error:', error);
        ws.onclose = () => console.log('WebSocket connection closed.');
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'traffic_update' || data.type === 'initial_traffic_data') {
              setLayersData(prev => ({
                ...prev,
                trafficFlow: data.flow_segments?.features || prev.trafficFlow,
                incidents: data.incidents?.features || prev.incidents,
              }));
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
      }
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [showTrafficFlow, showIncidents]);

  const handleMapCreated = useCallback((map: L.Map | null) => {
    if (!map) return; // ignore unmount
    setMapInstance(map);
    onMapCreated?.(map);
  }, [onMapCreated]);

  const renderLayer = (
    data: GeoJSONFeatureExtended[],
    layerKey: LayerKey,
    options: {
      color?: string | ((feature: GeoJSONFeatureExtended) => string);
      weight?: number;
      opacity?: number;
      dashArray?: string;
      icon?: L.DivIcon;
      popupContent?: (feature: GeoJSONFeatureExtended) => string;
    }
  ) => {
    if (!data.length || loading[layerKey]) return null;

    return data.map((feature, index) => {
      const key = `${layerKey}-${feature.properties?.id || index}`;
      const popupContent = options.popupContent ? options.popupContent(feature) : null;

      if (feature.geometry.type === 'Point') {
        const position = (feature.geometry.coordinates as number[]) as [number, number];
        return (
          <Marker key={key} position={[position[1], position[0]]} icon={options.icon}>
            {popupContent && <Popup>{popupContent}</Popup>}
          </Marker>
        );
      }

      if (feature.geometry.type === 'LineString') {
        const positions = (feature.geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]] as [number, number]);
        const color = typeof options.color === 'function' ? options.color(feature) : options.color;

        return (
          <Polyline
            key={key}
            positions={positions}
            color={color}
            weight={options.weight}
            opacity={options.opacity}
            dashArray={options.dashArray}
          >
            {popupContent && <Popup>{popupContent}</Popup>}
          </Polyline>
        );
      }

      return null;
    });
  };

  const defaultCenter: L.LatLngExpression = [12.9716, 77.5946];
  const defaultZoom = 12;

  return (
    <div style={{ width: '100%', height }}>
      {error && <div style={{ color: 'red', padding: '10px' }}>{error}</div>}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%', borderRadius: '4px' }}
        ref={handleMapCreated}
      >
        <MapEvents onMapClick={onMapClick} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {showRoads && renderLayer(layersData.roads, 'roads', { color: '#3388ff', weight: 2, opacity: 0.8 })}
        {showBusStops && renderLayer(layersData.busStops, 'busStops', { icon: createCustomIcon('#1a9641') })}
        {showMetroStations && renderLayer(layersData.metroStations, 'metroStations', { icon: createCustomIcon('#6a51a3', 'M') })}
        {showTrafficFlow && renderLayer(layersData.trafficFlow, 'trafficFlow', {
          color: (feature) => {
            const congestion = feature.properties?.congestion || 0;
            if (congestion > 0.75) return '#d73027';
            if (congestion > 0.5) return '#fc8d59';
            if (congestion > 0.25) return '#fee08b';
            return '#1a9850';
          },
          weight: 4,
          opacity: 0.7,
        })}
        {showIncidents && renderLayer(layersData.incidents, 'incidents', { icon: createCustomIcon('#FF0000', '!') })}
        {showCriticalNodes && renderLayer(layersData.criticalNodes, 'criticalNodes', { icon: createCustomIcon('#FF4500', 'X') })}

      </MapContainer>
    </div>
  );
};

export default TransportMap;