/**
 * GeoJSON API service for fetching transport network data
 */

// Define interfaces for GeoJSON data
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties?: { [key: string]: any };
}

export interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONAPIResponse {
  year: number;
  data_type: string;
  source?: string;
  geojson: GeoJSONResponse;
}

// Base API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const GeoJSONAPI = {
  /**
   * Get available GeoJSON data types and years
   */
  getAvailableData: async (): Promise<{ available_data: Record<string, string[]>, valid_data_types: string[] }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/available`);
      
      if (!response.ok) {
        throw new Error(`Error fetching available GeoJSON data: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch available GeoJSON data:', error);
      return { available_data: {}, valid_data_types: [] };
    }
  },

  /**
   * Get road network GeoJSON data for a specific year
   */
  getRoadNetwork: async (year: number): Promise<GeoJSONResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/${year}/road_network`);
      
      if (!response.ok) {
        throw new Error(`Error fetching road network data: ${response.statusText}`);
      }
      
      const data: GeoJSONAPIResponse = await response.json();
      return data.geojson;
    } catch (error) {
      console.error(`Failed to fetch road network data for year ${year}:`, error);
      return { type: 'FeatureCollection', features: [] };
    }
  },

  /**
   * Get bus stops GeoJSON data for a specific year
   */
  getBusStops: async (year: number): Promise<GeoJSONResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/${year}/bus_stops`);
      
      if (!response.ok) {
        throw new Error(`Error fetching bus stops data: ${response.statusText}`);
      }
      
      const data: GeoJSONAPIResponse = await response.json();
      return data.geojson;
    } catch (error) {
      console.error(`Failed to fetch bus stops data for year ${year}:`, error);
      return { type: 'FeatureCollection', features: [] };
    }
  },

  /**
   * Get metro stations GeoJSON data for a specific year
   */
  getMetroStations: async (year: number): Promise<GeoJSONResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/${year}/metro_stations`);
      
      if (!response.ok) {
        throw new Error(`Error fetching metro stations data: ${response.statusText}`);
      }
      
      const data: GeoJSONAPIResponse = await response.json();
      return data.geojson;
    } catch (error) {
      console.error(`Failed to fetch metro stations data for year ${year}:`, error);
      return { type: 'FeatureCollection', features: [] };
    }
  },

  /**
   * Get metro lines GeoJSON data for a specific year
   */
  getMetroLines: async (year: number): Promise<GeoJSONResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/${year}/metro_lines`);
      
      if (!response.ok) {
        throw new Error(`Error fetching metro lines data: ${response.statusText}`);
      }
      
      const data: GeoJSONAPIResponse = await response.json();
      return data.geojson;
    } catch (error) {
      console.error(`Failed to fetch metro lines data for year ${year}:`, error);
      return { type: 'FeatureCollection', features: [] };
    }
  },
  
  /**
   * Get critical nodes GeoJSON data for a specific year
   */
  getCriticalNodes: async (year: number): Promise<GeoJSONResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/geojson/${year}/critical_nodes`);
      
      if (!response.ok) {
        throw new Error(`Error fetching critical nodes data: ${response.statusText}`);
      }
      
      const data: GeoJSONAPIResponse = await response.json();
      return data.geojson;
    } catch (error) {
      console.error(`Failed to fetch critical nodes data for year ${year}:`, error);
      return { type: 'FeatureCollection', features: [] };
    }
  }
};
