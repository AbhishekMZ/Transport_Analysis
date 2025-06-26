'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoJSONAPI, GeoJSONResponse, GeoJSONFeature } from '@/lib/api/geojson-api';
import { TrafficAPI, TrafficFlowSegment, TrafficIncident } from '@/lib/api/traffic-api';
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[77.59, 12.97], [77.61, 12.96]] },
          properties: { name: 'Mock Road C' }
        }
      ]
    };
  },
  getBusStops: async (year: number): Promise<GeoJSONResponse> => {
    console.log(`[MOCK API] Fetching mock bus stops for year: ${year}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Town Hall
          properties: { name: 'Town Hall Stop' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.6050, 12.9650] }, // MG Road
          properties: { name: 'MG Road Stop' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.5682, 12.9352] }, // Jayanagar 4th Block
          properties: { name: 'Jayanagar 4th Block Stop' }
        }
      ]
    };
  },
  getMetroStations: async (year: number): Promise<GeoJSONResponse> => {
    console.log(`[MOCK API] Fetching mock metro stations for year: ${year}`);
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.5830, 12.9780] }, // Majestic
          properties: { name: 'Majestic Metro' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.6100, 12.9760] }, // Cubbon Park
          properties: { name: 'Cubbon Park Metro' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [77.6366, 12.9555] }, // Indiranagar
          properties: { name: 'Indiranagar Metro' }
          coordinates: [
            { longitude: 77.6400, latitude: 12.9400 }, // Outer Ring Road segment
            { longitude: 77.6500, latitude: 12.9500 }
          ],
          currentSpeed: Math.random() * 15 + 8, // 8-23 km/h (variable congestion)
          freeFlowSpeed: 45
        }
      ]
    };
  }
};
// --- END MOCK API IMPLEMENTATIONS FOR CANVAS ENVIRONMENT ---


// Get Mapbox token from env (you'll need to add this to .env.local)
// IMPORTANT: Replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your actual Mapbox Public Access Token.
// You can get one from: [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWlzaGFlbGFiaGlzaGVrIiwiYSI6ImNseGo4anF3dzA2b2MybXBpYno4ZGRtMWoifQ.Yp3j4_Q1_y1jS4y5d_h25A'; 

interface TransportMapProps {
  selectedYear?: number;
  showRoads?: boolean;
  showBusStops?: boolean;
  showMetro?: boolean;
  showTraffic?: boolean;
  showCriticalNodes?: boolean; // Not implemented in this fix, but kept for future use
  height?: string;
  onMapClick?: (e: mapboxgl.MapMouseEvent) => void;
}

const TransportMap: React.FC<TransportMapProps> = ({
  selectedYear = 2025,
  showRoads = true,
  showBusStops = false,
  showMetro = false,
  showTraffic = false,
  showCriticalNodes = false, 
  height = "600px",
  onMapClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [layersLoaded, setLayersLoaded] = useState<Record<string, boolean>>({});
  const trafficLayerAddedRef = useRef(false); 

  // Helper to toggle layer visibility, memoized for stability
  const toggleLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    if (!map.current || !map.current.getLayer(layerId)) return;
    
    map.current.setLayoutProperty(
      layerId, 
      'visibility', 
      visible ? 'visible' : 'none'
    );
  }, []); 

  // Helper function to add a GeoJSON layer for lines, memoized for stability
  const addGeoJSONLayer = useCallback((
    mapInstance: mapboxgl.Map,
    data: GeoJSONResponse,
    id: string,
    color: string,
    width: number
  ) => {
    // Add source first if it doesn't exist
    if (!mapInstance.getSource(id)) {
      mapInstance.addSource(id, {
        type: 'geojson',
        data: data
      });
    } else {
      // Update source data if it exists
      (mapInstance.getSource(id) as mapboxgl.GeoJSONSource).setData(data);
    }

    // Add layer if it doesn't exist
    if (!mapInstance.getLayer(id)) {
      mapInstance.addLayer({
        id: id,
        type: 'line',
        source: id,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': width
        }
      });

      // Add hover effect
      mapInstance.on('mouseenter', id, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', id, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }
  }, []); 

  // Helper function to add a point layer, memoized for stability
  const addPointLayer = useCallback((
    mapInstance: mapboxgl.Map,
    data: GeoJSONResponse,
    id: string,
    color: string,
    iconImageId: string 
  ) => {
    // Add source first if it doesn't exist
    if (!mapInstance.getSource(id)) {
      mapInstance.addSource(id, {
        type: 'geojson',
        data: data
      });
    } else {
      // Update source data if it exists
      (mapInstance.getSource(id) as mapboxgl.GeoJSONSource).setData(data);
    }

    // Add layer if it doesn't exist
    if (!mapInstance.getLayer(id)) {
      mapInstance.addLayer({
        id: id,
        type: 'symbol',
        source: id,
        layout: {
          'icon-image': iconImageId, 
          'icon-size': 0.8,
          'text-field': ['get', 'name'],
          // Removed 'Open Sans Regular' as it's not a standard Mapbox GL JS font and might cause errors.
          // Mapbox GL JS uses font stacks. 'Arial Unicode MS Regular' is a common safe fallback.
          'text-font': ['Open Sans Regular','Arial Unicode MS Regular'], 
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': color,
          'text-halo-color': '#fff',
          'text-halo-width': 1
        }
      });

      // Add hover effect
      mapInstance.on('mouseenter', id, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', id, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }
  }, []); 

  // Helper function to add traffic flow layer, memoized for stability
  const addTrafficFlowLayer = useCallback((
    mapInstance: mapboxgl.Map,
    trafficData: any
  ) => {
    if (!trafficData || !trafficData.flowSegmentData) return;

    // Convert TomTom traffic data to GeoJSON
    const features = trafficData.flowSegmentData.map((segment: any) => {
      // Extract coordinates
      const coordinates = segment.coordinates.map((coord: any) => [
        coord.longitude,
        coord.latitude
      ]);

      // Determine color based on congestion level
      const speedRatio = segment.currentSpeed / segment.freeFlowSpeed;
      let color = '#1a9850'; // Green for good flow
      
      if (speedRatio < 0.25) {
        color = '#d73027'; // Red for severe congestion
      } else if (speedRatio < 0.5) {
        color = '#fc8d59'; // Orange for moderate congestion
      } else if (speedRatio < 0.75) {
        color = '#fee08b'; // Yellow for light congestion
      }
      
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        },
        properties: {
          color: color,
          currentSpeed: segment.currentSpeed,
          freeFlowSpeed: segment.freeFlowSpeed,
          speedRatio: speedRatio,
          congestion: 1 - speedRatio
        }
      };
    });

    const geojsonData: GeoJSONResponse = { 
      type: 'FeatureCollection',
      features: features
    };

    // Add source
    if (!mapInstance.getSource('traffic-flow')) {
      mapInstance.addSource('traffic-flow', {
        type: 'geojson',
        data: geojsonData
      });

      // Add layer
      mapInstance.addLayer({
        id: 'traffic-flow',
        type: 'line',
        source: 'traffic-flow',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Add hover effect with popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });

      mapInstance.on('mouseenter', 'traffic-flow', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          if (props) {
            const currentSpeed = props.currentSpeed?.toFixed(1);
            const freeFlowSpeed = props.freeFlowSpeed?.toFixed(1);
            const congestion = (props.congestion * 100).toFixed(0);
            
            popup.setLngLat(e.lngLat)
              .setHTML(`
                <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: #333;">
                  <strong>Current Speed:</strong> ${currentSpeed} km/h<br/>
                  <strong>Normal Speed:</strong> ${freeFlowSpeed} km/h<br/>
                  <strong>Congestion:</strong> ${congestion}%
                </div>
              `)
              .addTo(mapInstance);
          }
        }
      });
      
      mapInstance.on('mouseleave', 'traffic-flow', () => {
        mapInstance.getCanvas().style.cursor = '';
        popup.remove();
      });
    }
  }, []); 

  // Helper function to update existing traffic flow layer, memoized for stability
  const updateTrafficFlowLayer = useCallback((
    mapInstance: mapboxgl.Map,
    trafficData: any
  ) => {
    if (!trafficData || !trafficData.flowSegmentData) return;
    if (!mapInstance.getSource('traffic-flow')) return;
    
    // Convert TomTom traffic data to GeoJSON (same as in addTrafficFlowLayer)
    const features = trafficData.flowSegmentData.map((segment: any) => {
      const coordinates = segment.coordinates.map((coord: any) => [
        coord.longitude,
        coord.latitude
      ]);
      
      const speedRatio = segment.currentSpeed / segment.freeFlowSpeed;
      let color = '#1a9850';
      
      if (speedRatio < 0.25) {
        color = '#d73027';
      } else if (speedRatio < 0.5) {
        color = '#fc8d59';
      } else if (speedRatio < 0.75) {
        color = '#fee08b';
      }
      
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        },
        properties: {
          color: color,
          currentSpeed: segment.currentSpeed,
          freeFlowSpeed: segment.freeFlowSpeed,
          speedRatio: speedRatio,
          congestion: 1 - speedRatio
        }
      };
    });

    const geojsonData: GeoJSONResponse = { 
      type: 'FeatureCollection',
      features: features
    };
    
    // Update source data
    (mapInstance.getSource('traffic-flow') as mapboxgl.GeoJSONSource).setData(geojsonData);
  }, []); 

  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Don't initialize again if already exists

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // A standard street style
      center: [77.5946, 12.9716], // Bangalore center coordinates
      zoom: 12
    });

    // Map event handlers
    map.current.on('load', () => {
      // Add navigation control
      map.current?.addControl(new mapboxgl.NavigationControl(), 'top-right');
    });

    // Handle map clicks if a callback is provided
    if (onMapClick && map.current) {
      map.current.on('click', (e) => {
        onMapClick(e);
      });
    }

    // Clean up on component unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapClick]); 

  // Load custom icons for points (bus stops, metro stations)
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;
    
    // Function to load an SVG as an image
    const loadImageFromSVG = (id: string, svg: string) => {
      // Create a blob from the SVG string
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      // Create an object URL from the blob
      const url = URL.createObjectURL(blob);

      mapInstance.loadImage(url, (error, image) => {
        if (error) {
          console.error(`Error loading SVG icon ${id}:`, error);
          return;
        }
        if (image && !mapInstance.hasImage(id)) {
          mapInstance.addImage(id, image);
        }
        // Revoke the object URL to free up memory
        URL.revokeObjectURL(url);
      });
    };

    // Define simple SVG icons (you can replace these with more detailed ones or Font Awesome/Phosphor SVG paths)
    // These are simplified Lucide icons converted to SVG strings.
    const busIconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a9641" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus">
        <path d="M8 6V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2"/><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M6 18h.01"/><path d="M18 18h.01"/>
      </svg>
    `;
    const metroIconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6a51a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-train">
        <path d="M6 15V2m6 13V2m6 13V2M3 15h18m-18 0l-1 5h20l-1-5m-18 3h18"/>
      </svg>
    `;

    // Load icons if the map is loaded
    if (mapInstance.loaded()) {
      loadImageFromSVG('bus-icon', busIconSVG);
      loadImageFromSVG('metro-icon', metroIconSVG);
    } else {
      // If map is not yet loaded, wait for the 'load' event
      mapInstance.on('load', () => {
        loadImageFromSVG('bus-icon', busIconSVG);
        loadImageFromSVG('metro-icon', metroIconSVG);
      });
    }

  }, []);

  // Load GeoJSON layers when map is ready and layer visibility changes
  useEffect(() => {
    const loadLayers = async () => {
      // Ensure map is initialized and fully loaded before adding layers
      if (!map.current || !map.current.loaded()) {
        console.log("Map not ready for GeoJSON layers yet.");
        return;
      }
      
      const mapInstance = map.current;

      // 1. Road Network Layer
      if (showRoads && !layersLoaded['roads']) {
        try {
          const roadData = await GeoJSONAPI.getRoadNetwork(selectedYear);
          addGeoJSONLayer(mapInstance, roadData, 'roads', '#3388ff', 2);
          setLayersLoaded(prev => ({ ...prev, roads: true }));
        } catch (error) {
          console.error("Error loading road network:", error);
        }
      }
      
      // 2. Bus Stops Layer
      if (showBusStops && !layersLoaded['bus_stops']) {
        try {
          const busStopsData = await GeoJSONAPI.getBusStops(selectedYear);
          // Pass the loaded icon ID
          addPointLayer(mapInstance, busStopsData, 'bus_stops', '#1a9641', 'bus-icon'); 
          setLayersLoaded(prev => ({ ...prev, bus_stops: true }));
        } catch (error) {
          console.error("Error loading bus stops:", error);
        }
      }
      
      // 3. Metro Stations Layer
      if (showMetro && !layersLoaded['metro']) {
        try {
          const metroData = await GeoJSONAPI.getMetroStations(selectedYear);
          // Pass the loaded icon ID
          addPointLayer(mapInstance, metroData, 'metro', '#6a51a3', 'metro-icon'); 
          setLayersLoaded(prev => ({ ...prev, metro: true }));
        } catch (error) {
          console.error("Error loading metro stations:", error);
        }
      }

      // Set visibility based on props for all static layers
      toggleLayerVisibility('roads', showRoads);
      toggleLayerVisibility('bus_stops', showBusStops);
      toggleLayerVisibility('metro', showMetro);
    };
    
    // Call loadLayers directly, and it will check map.current.loaded()
    loadLayers();

    // The effect should re-run if these props change
  }, [showRoads, showBusStops, showMetro, selectedYear, addGeoJSONLayer, addPointLayer, toggleLayerVisibility, layersLoaded]);


  // Load and update real-time traffic data
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const loadTrafficData = async () => {
      // Ensure map is initialized and fully loaded
      if (!map.current || !map.current.loaded()) {
        console.log("Map not ready for traffic layers yet.");
        return;
      }
      
      const mapInstance = map.current;

      if (showTraffic) {
        try {
          const trafficFlow = await TrafficAPI.getTrafficFlow();
          
          // Use the ref to check if the layer has been added
          if (!trafficLayerAddedRef.current) {
            addTrafficFlowLayer(mapInstance, trafficFlow);
            trafficLayerAddedRef.current = true; // Mark as added
          } else {
            // Update existing layer data
            updateTrafficFlowLayer(mapInstance, trafficFlow);
          }
        } catch (error) {
          console.error("Error loading or updating traffic data:", error);
        }
      }
      
      // Always toggle visibility based on showTraffic prop
      toggleLayerVisibility('traffic-flow', showTraffic);
    };
    
    if (showTraffic) {
      loadTrafficData(); // Initial load
      // Refresh traffic data every 5 minutes
      intervalId = setInterval(loadTrafficData, 5 * 60 * 1000);
    } else {
      // If showTraffic is false, ensure the layer is hidden immediately
      toggleLayerVisibility('traffic-flow', false);
    }
    
    return () => {
      // Cleanup interval on unmount or when showTraffic becomes false
      if (intervalId) clearInterval(intervalId);
    };
  }, [showTraffic, addTrafficFlowLayer, updateTrafficFlowLayer, toggleLayerVisibility]);


  return (
    <div style={{ width: '100%', height }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TransportMap;