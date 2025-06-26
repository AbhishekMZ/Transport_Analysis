'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoJSONAPI, GeoJSONResponse, GeoJSONFeature } from '@/lib/api/geojson-api';
import { TrafficAPI, TrafficFlowSegment, TrafficIncident } from '@/lib/api/traffic-api';
import { toast } from '@/components/ui/use-toast';

// Get Mapbox token from env (you'll need to add this to .env.local)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWlzaGFlbGFiaGlzaGVrIiwiYSI6ImNscGRzeWIwODRvbGIyanFvMjQ3c3lscG4ifQ.Hlrt8Yhm6sKrBhNpt2YcfA';
// Default to Bangalore coordinates
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716]; // [longitude, latitude]
const DEFAULT_ZOOM = 11;

// Fallback mock data in case of API failures
const getMockRoadNetwork = (): GeoJSONResponse => {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[77.58, 12.96], [77.60, 12.98]] },
        properties: { name: 'Mock Road A' }
      },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[77.61, 12.97], [77.63, 12.99]] },
        properties: { name: 'Mock Road B' }
      },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[77.59, 12.97], [77.61, 12.96]] },
        properties: { name: 'Mock Road C' }
      }
    ]
  };
};

const getMockBusStops = (): GeoJSONResponse => {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.5946, 12.9716] },
        properties: { name: 'Town Hall Stop' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.6050, 12.9650] },
        properties: { name: 'MG Road Stop' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.5682, 12.9352] },
        properties: { name: 'Jayanagar 4th Block Stop' }
      }
    ]
  };
};

const getMockMetroStations = (): GeoJSONResponse => {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.5830, 12.9780] },
        properties: { name: 'Majestic Metro' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.5997, 12.9757] },
        properties: { name: 'MG Road Metro' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.6366, 12.9555] },
        properties: { name: 'Indiranagar Metro' }
      }
    ]
  };
};

// Mock traffic flow data generator (for fallback in case API fails)
const getMockTrafficFlow = (): { timestamp: string, flowSegments: TrafficFlowSegment[] } => {
  console.log('[FALLBACK] Generating mock traffic flow data');

  // Generate mock traffic flow data with realistic values
  const flowSegments: TrafficFlowSegment[] = [];
  
  // Main roads in Bangalore with varying congestion 
  const mockRoads = [
    { name: 'MG Road', startCoord: [77.61, 12.975], endCoord: [77.63, 12.98], speedRatio: 0.8 },
    { name: 'Outer Ring Road', startCoord: [77.64, 12.95], endCoord: [77.67, 12.96], speedRatio: 0.4 },
    { name: 'Airport Road', startCoord: [77.60, 12.96], endCoord: [77.62, 12.99], speedRatio: 0.7 },
    { name: 'Old Madras Road', startCoord: [77.63, 12.98], endCoord: [77.65, 13.01], speedRatio: 0.9 },
    { name: 'Hosur Road', startCoord: [77.61, 12.92], endCoord: [77.63, 12.90], speedRatio: 0.3 },
  ];

  mockRoads.forEach((road, idx) => {
    const freeFlowSpeed = 50 + Math.floor(Math.random() * 30); // 50-80 km/h
    const currentSpeed = Math.floor(freeFlowSpeed * road.speedRatio);
    const length = 2 + Math.random() * 3; // 2-5 km
    const freeFlowTravelTime = Math.floor((length / freeFlowSpeed) * 3600); // seconds
    const currentTravelTime = Math.floor((length / currentSpeed) * 3600); // seconds

    flowSegments.push({
      id: `flow-${idx}`,
      coordinates: [road.startCoord, road.endCoord],
      currentSpeed,
      freeFlowSpeed,
      currentTravelTime,
      freeFlowTravelTime,
      confidence: 0.9,
      roadClosure: false,
      roadName: road.name
    });
  });

  return {
    timestamp: new Date().toISOString(),
    flowSegments
  };
};

interface TransportMapProps {
  selectedYear?: number;
  showRoads?: boolean;
  showBusStops?: boolean;
  showMetro?: boolean;
  showTraffic?: boolean;
  showCriticalNodes?: boolean;
  height?: string;
  onMapClick?: (e: mapboxgl.MapMouseEvent) => void;
}

const TransportMap: React.FC<TransportMapProps> = ({
  selectedYear = 2023,
  showRoads = true,
  showBusStops = false,
  showMetro = false,
  showTraffic = false,
  showCriticalNodes = false,
  height = "600px",
  onMapClick
}) => {
  // Map container and instance
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track sources and layers to avoid duplicates
  const activeSourcesRef = useRef<Set<string>>(new Set());
  const activeLayersRef = useRef<Set<string>>(new Set());

  // Layer IDs for tracking and management
  const layerIds = {
    roads: 'road-network-layer',
    busStops: 'bus-stops-layer',
    metroStations: 'metro-stations-layer',
    trafficFlow: 'traffic-flow-layer',
    criticalNodes: 'critical-nodes-layer'
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Skip if map is already initialized
    if (map.current) return;

    // Initialize the map
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    });

    // Add navigation control
    newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add scale
    newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

    // Set up click handler if provided
    if (onMapClick) {
      newMap.on('click', onMapClick);
    }

    // Set map ready when loaded
    newMap.on('load', () => {
      console.log('Map loaded successfully');
      setLoading(false);
      map.current = newMap;
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        if (onMapClick) map.current.off('click', onMapClick);
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapClick]);

  // Helper function to add/update a GeoJSON source
  const addOrUpdateGeoJSONSource = useCallback((sourceId: string, data: GeoJSONResponse) => {
    if (!map.current) return false;

    try {
      // Check if source exists - if so, update it, otherwise add new source
      if (map.current.getSource(sourceId)) {
        // GeoJSON sources support setData to update
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
      } else {
        // Add new source
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: data
        });
        activeSourcesRef.current.add(sourceId);
      }
      return true;
    } catch (err) {
      console.error(`Error adding/updating source ${sourceId}:`, err);
      setError(`Failed to load data for ${sourceId}`);
      return false;
    }
  }, []);

  // Helper function to remove a layer if it exists
  const removeLayerIfExists = useCallback((layerId: string) => {
    if (!map.current) return;
    
    try {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
        activeLayersRef.current.delete(layerId);
      }
    } catch (err) {
      console.error(`Error removing layer ${layerId}:`, err);
    }
  }, []);

  // Helper function to remove a source if it exists
  const removeSourceIfExists = useCallback((sourceId: string) => {
    if (!map.current) return;
    
    try {
      // Need to remove all layers using this source first
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
        activeSourcesRef.current.delete(sourceId);
      }
    } catch (err) {
      console.error(`Error removing source ${sourceId}:`, err);
    }
  }, []);

  // Load road network data
  const loadRoadNetwork = useCallback(async () => {
    if (!map.current || !showRoads) return;
    
    try {
      setLoading(true);
      const sourceId = 'road-network-source';
      const layerId = layerIds.roads;

      // Fetch road network data for the selected year
      let roadNetworkData: GeoJSONResponse;
      try {
        roadNetworkData = await GeoJSONAPI.getRoadNetwork(selectedYear);
        if (roadNetworkData.features.length === 0) {
          // Fall back to mock data if no features found
          console.warn(`No road network features found for year ${selectedYear}, using mock data`);
          roadNetworkData = getMockRoadNetwork();
        }
      } catch (error) {
        console.error(`Failed to fetch road network data: ${error}`);
        toast({
          title: "Data Loading Error",
          description: `Could not load road network data: ${error}`,
          variant: "destructive"
        });
        roadNetworkData = getMockRoadNetwork();
      }

      // Add or update the source
      if (!addOrUpdateGeoJSONSource(sourceId, roadNetworkData)) return;

      // Remove existing layer if any
      removeLayerIfExists(layerId);
      
      // Add the layer
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#888',
          'line-width': 2
        }
      });
      
      activeLayersRef.current.add(layerId);
      console.log(`Road network layer added for year ${selectedYear}`);
    } catch (err) {
      console.error('Error loading road network data:', err);
      setError(`Failed to load road network data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [showRoads, selectedYear, addOrUpdateGeoJSONSource, removeLayerIfExists]);

  // Load bus stops data
  const loadBusStops = useCallback(async () => {
    if (!map.current || !showBusStops) return;
    
    try {
      setLoading(true);
      const sourceId = 'bus-stops-source';
      const layerId = layerIds.busStops;

      // Fetch bus stops data for the selected year
      let busStopsData: GeoJSONResponse;
      try {
        busStopsData = await GeoJSONAPI.getBusStops(selectedYear);
        if (busStopsData.features.length === 0) {
          // Fall back to mock data if no features found
          console.warn(`No bus stop features found for year ${selectedYear}, using mock data`);
          busStopsData = getMockBusStops();
        }
      } catch (error) {
        console.error(`Failed to fetch bus stops data: ${error}`);
        toast({
          title: "Data Loading Error",
          description: `Could not load bus stops data: ${error}`,
          variant: "destructive"
        });
        busStopsData = getMockBusStops();
      }

      // Add or update the source
      if (!addOrUpdateGeoJSONSource(sourceId, busStopsData)) return;

      // Remove existing layer if any
      removeLayerIfExists(layerId);
      
      // Add the layer
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': '#3887be',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      activeLayersRef.current.add(layerId);
      console.log(`Bus stops layer added for year ${selectedYear}`);
    } catch (err) {
      console.error('Error loading bus stops data:', err);
      setError(`Failed to load bus stops data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [showBusStops, selectedYear, addOrUpdateGeoJSONSource, removeLayerIfExists]);

  // Load metro stations data
  const loadMetroStations = useCallback(async () => {
    if (!map.current || !showMetro) return;
    
    try {
      setLoading(true);
      const sourceId = 'metro-stations-source';
      const layerId = layerIds.metroStations;

      // Fetch metro stations data for the selected year
      let metroStationsData: GeoJSONResponse;
      try {
        metroStationsData = await GeoJSONAPI.getMetroStations(selectedYear);
        if (metroStationsData.features.length === 0) {
          // Fall back to mock data if no features found
          console.warn(`No metro station features found for year ${selectedYear}, using mock data`);
          metroStationsData = getMockMetroStations();
        }
      } catch (error) {
        console.error(`Failed to fetch metro stations data: ${error}`);
        toast({
          title: "Data Loading Error",
          description: `Could not load metro stations data: ${error}`,
          variant: "destructive"
        });
        metroStationsData = getMockMetroStations();
      }

      // Add or update the source
      if (!addOrUpdateGeoJSONSource(sourceId, metroStationsData)) return;

      // Remove existing layer if any
      removeLayerIfExists(layerId);
      
      // Add the layer
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#FF5733',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      activeLayersRef.current.add(layerId);
      console.log(`Metro stations layer added for year ${selectedYear}`);
    } catch (err) {
      console.error('Error loading metro stations data:', err);
      setError(`Failed to load metro stations data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [showMetro, selectedYear, addOrUpdateGeoJSONSource, removeLayerIfExists]);

  // Load traffic flow data
  const loadTrafficFlow = useCallback(async () => {
    if (!map.current || !showTraffic) return;
    
    try {
      setLoading(true);
      const sourceId = 'traffic-flow-source';
      const layerId = layerIds.trafficFlow;

      // Fetch real-time traffic flow data
      let trafficData;
      try {
        trafficData = await TrafficAPI.getTrafficFlow(true);
        if (!trafficData.flowSegments || trafficData.flowSegments.length === 0) {
          // Fall back to mock data if no flow segments found
          console.warn('No traffic flow data found, using mock data');
          trafficData = getMockTrafficFlow();
        }
      } catch (error) {
        console.error(`Failed to fetch traffic flow data: ${error}`);
        toast({
          title: "Traffic Data Error",
          description: `Could not load real-time traffic data: ${error}`,
          variant: "destructive"
        });
        trafficData = getMockTrafficFlow();
      }
      
      // Transform traffic flow data into GeoJSON format
      const trafficGeoJSON: GeoJSONResponse = {
        type: 'FeatureCollection',
        features: trafficData.flowSegments.map((segment: TrafficFlowSegment) => {
          // Calculate congestion ratio from 0 to 1 (higher means more congested)
          const congestionRatio = segment.currentSpeed / segment.freeFlowSpeed;
          
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: segment.coordinates
            },
            properties: {
              id: segment.id,
              currentSpeed: segment.currentSpeed,
              freeFlowSpeed: segment.freeFlowSpeed,
              congestionRatio: congestionRatio,
              roadName: segment.roadName || '',
              roadClosure: segment.roadClosure
            }
          };
        })
      };

      // Add or update the source
      if (!addOrUpdateGeoJSONSource(sourceId, trafficGeoJSON)) return;

      // Remove existing layer if any
      removeLayerIfExists(layerId);
      
      // Add the layer with color based on congestion level
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          // Color based on congestion ratio
          'line-color': [
            'case',
            ['boolean', ['get', 'roadClosure'], false],
            '#000000', // Black for road closures
            ['step',
              ['get', 'congestionRatio'],
              '#FF0000', // Red for severe congestion (congestionRatio < 0.3)
              0.3, '#FF7F00', // Orange for heavy congestion (0.3 <= congestionRatio < 0.5)
              0.5, '#FFFF00', // Yellow for moderate congestion (0.5 <= congestionRatio < 0.7)
              0.7, '#00FF00', // Green for light congestion (0.7 <= congestionRatio < 0.9)
              0.9, '#00FFFF', // Cyan for free flow (congestionRatio >= 0.9)
            ]
          ],
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
      
      activeLayersRef.current.add(layerId);
      console.log('Traffic flow layer added');
    } catch (err) {
      console.error('Error loading traffic flow data:', err);
      setError(`Failed to load traffic flow data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [showTraffic, addOrUpdateGeoJSONSource, removeLayerIfExists]);

  // Load critical nodes data
  const loadCriticalNodes = useCallback(async () => {
    if (!map.current || !showCriticalNodes) return;
    
    try {
      setLoading(true);
      const sourceId = 'critical-nodes-source';
      const layerId = layerIds.criticalNodes;

      // Fetch critical nodes data for the selected year
      let criticalNodesData: GeoJSONResponse;
      try {
        criticalNodesData = await GeoJSONAPI.getCriticalNodes(selectedYear);
      } catch (error) {
        console.error(`Failed to fetch critical nodes data: ${error}`);
        toast({
          title: "Data Loading Error",
          description: `Could not load critical nodes data: ${error}`,
          variant: "destructive"
        });
        // Fallback with empty data since we don't have mock critical nodes
        criticalNodesData = { type: 'FeatureCollection', features: [] };
      }

      if (criticalNodesData.features.length === 0) {
        // If no nodes or error, just don't render anything
        console.warn(`No critical nodes found for year ${selectedYear}`);
        removeLayerIfExists(layerId);
        setLoading(false);
        return;
      }

      // Add or update the source
      if (!addOrUpdateGeoJSONSource(sourceId, criticalNodesData)) return;

      // Remove existing layer if any
      removeLayerIfExists(layerId);
      
      // Add the layer
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 12,
          'circle-color': '#FF0000',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.7
        }
      });
      
      activeLayersRef.current.add(layerId);
      console.log(`Critical nodes layer added for year ${selectedYear}`);
    } catch (err) {
      console.error('Error loading critical nodes data:', err);
      setError(`Failed to load critical nodes data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [showCriticalNodes, selectedYear, addOrUpdateGeoJSONSource, removeLayerIfExists]);
  
  // Effect to load all map data when map is ready and props change
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    
    // Clear error state on prop changes
    setError(null);
    
    // Load the data layers based on visibility flags
    const loadLayers = async () => {
      await Promise.all([
        showRoads ? loadRoadNetwork() : Promise.resolve(),
        showBusStops ? loadBusStops() : Promise.resolve(),
        showMetro ? loadMetroStations() : Promise.resolve(),
        showTraffic ? loadTrafficFlow() : Promise.resolve(),
        showCriticalNodes ? loadCriticalNodes() : Promise.resolve()
      ]);
      
      setDataLoaded(true);
    };
    
    loadLayers();
    
  }, [map.current, showRoads, showBusStops, showMetro, showTraffic, showCriticalNodes, selectedYear, 
      loadRoadNetwork, loadBusStops, loadMetroStations, loadTrafficFlow, loadCriticalNodes]);
  
  // Clean up layers and sources when visibility changes
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    
    if (!showRoads) removeLayerIfExists(layerIds.roads);
    if (!showBusStops) removeLayerIfExists(layerIds.busStops);
    if (!showMetro) removeLayerIfExists(layerIds.metroStations);
    if (!showTraffic) removeLayerIfExists(layerIds.trafficFlow);
    if (!showCriticalNodes) removeLayerIfExists(layerIds.criticalNodes);
    
  }, [showRoads, showBusStops, showMetro, showTraffic, showCriticalNodes, removeLayerIfExists]);
  
  // Helper to generate popup content for features
  const generatePopupHTML = (feature: GeoJSONFeature): string => {
    const properties = feature.properties || {};
    let html = '<div class="map-popup">';
    
    // Title (use name or type)
    if (properties.name) {
      html += `<h3>${properties.name}</h3>`;
    } else if (properties.type) {
      html += `<h3>${properties.type}</h3>`;
    }
    
    // For traffic features
    if (properties.currentSpeed !== undefined) {
      const speedRatio = (properties.currentSpeed / properties.freeFlowSpeed * 100).toFixed(0);
      let congestionText = 'Free flowing';
      if (properties.roadClosure) congestionText = 'Road closed';
      else if (speedRatio < 30) congestionText = 'Severe congestion';
      else if (speedRatio < 50) congestionText = 'Heavy congestion';
      else if (speedRatio < 70) congestionText = 'Moderate congestion';
      else if (speedRatio < 90) congestionText = 'Light congestion';
      
      html += `<p><strong>${properties.roadName || 'Road segment'}</strong></p>`;
      html += `<p>${congestionText}</p>`;
      html += `<p>Current: ${properties.currentSpeed.toFixed(0)} km/h</p>`;
      html += `<p>Normal: ${properties.freeFlowSpeed.toFixed(0)} km/h</p>`;
    }
    
    // For bus stops
    if (feature.geometry.type === 'Point' && properties.routes) {
      html += `<p>Routes: ${properties.routes}</p>`;
    }
    
    // For critical nodes
    if (properties.criticalityScore) {
      html += `<p>Criticality: ${properties.criticalityScore.toFixed(2)}</p>`;
      if (properties.affectedUsers) {
        html += `<p>Users affected if disrupted: ${properties.affectedUsers}</p>`;
      }
    }
    
    html += '</div>';
    return html;
  };
  
  // Add click handling for popup information
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      // Skip if user provided their own click handler
      if (onMapClick) return;
      
      const point = e.point;
      const features = map.current?.queryRenderedFeatures(point) || [];
      
      if (features.length > 0) {
        const feature = features[0];
        
        // Create popup
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(generatePopupHTML(feature as any))
          .addTo(map.current!);
      }
    };
    
    map.current.on('click', handleMapClick);
    
    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [onMapClick]);

  return (
    <div className="transport-map-container">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            Loading map data...
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-0 right-0 mx-auto w-max bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md z-20">
          {error}
        </div>
      )}
      
      <div 
        ref={mapContainer} 
        className="map-container w-full rounded-md overflow-hidden" 
        style={{ height: height }}
      />
    </div>
  );
};

export default TransportMap;
