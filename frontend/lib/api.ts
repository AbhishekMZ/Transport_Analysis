/**
 * API Service for TransiGenius Backend
 * Provides functions for interacting with all backend API endpoints
 */

// Base API URL – works both client and server side
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types
export interface TrafficFlow {
  flowSegmentData: {
    currentSpeed: number;
    freeFlowSpeed: number;
    currentTravelTime: number;
    freeFlowTravelTime: number;
    confidence: number;
    roadClosure: boolean;
    coordinates: {
      latitude: number;
      longitude: number;
    }[];
  }[];
}

export interface TrafficIncident {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: {
    id: string;
    iconCategory: string;
    magnitudeOfDelay: number;
    events: {
      description: string;
      code: number;
      iconCategory: string;
    }[];
    startTime: string;
    endTime: string;
    from: string;
    to: string;
    length: number;
    delay: number;
    roadNumbers: string[];
    timeValidity: string;
  };
}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

export interface GeoJSONResponse {
  type: string;
  features: GeoJSONFeature[];
}

export interface CriticalNode {
  id: string;
  name: string;
  score: number;
  coordinates: [number, number];
  type: string;
}

export interface DisruptionSimulation {
  disruptedNodes: CriticalNode[];
  affectedRoutes: number;
  affectedCommuters: number;
  travelTimeIncrease: number;
  alternateRoutes: GeoJSONFeature[];
}

export interface Forecast {
  timestamp: string;
  predictions: {
    location: string;
    coordinates: [number, number];
    congestionLevel: number;
    predictedSpeed: number;
    confidence: number;
  }[];
  factors: {
    name: string;
    importance: number;
  }[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  created_date: string;
  size: string;
  tags: string[];
  file_path?: string;
}

export interface ReportGenerationRequest {
  title: string;
  description: string;
  type: string;
  data_source: string;
  date_range: string;
  format: string;
  template: string;
  area?: string;
  include_traffic: boolean;
  include_network: boolean;
  include_forecast: boolean;
}

export interface ReportType {
  value: string;
  label: string;
  description: string;
}

export interface ReportTemplate {
  value: string;
  label: string;
  description: string;
}

/**
 * Project Metadata API
 */
export const ProjectAPI = {
  // Get project metadata
  getMetadata: async () => {
    const response = await fetch(`${API_BASE_URL}/project/metadata`);
    return response.json();
  },

  // Get available years
  getYears: async () => {
    const response = await fetch(`${API_BASE_URL}/project/years`);
    return response.json();
  },

  // Get project statistics
  getStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/project/statistics`);
    return response.json();
  }
};

/**
 * Traffic API
 */
export const TrafficAPI = {
  // Get real-time traffic flow
  getTrafficFlow: async (area?: string) => {
    const url = area 
      ? `${API_BASE_URL}/traffic/realtime/flow?area=${area}` 
      : `${API_BASE_URL}/traffic/realtime/flow`;
    const response = await fetch(url);
    return response.json() as Promise<TrafficFlow>;
  },

  // Get real-time traffic incidents
  getTrafficIncidents: async (area?: string) => {
    const url = area 
      ? `${API_BASE_URL}/traffic/realtime/incidents?area=${area}` 
      : `${API_BASE_URL}/traffic/realtime/incidents`;
    const response = await fetch(url);
    return response.json() as Promise<TrafficIncident[]>;
  },

  // Get traffic summary
  getTrafficSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/traffic/summary`);
    return response.json();
  },

  // Get predefined areas
  getPredefinedAreas: async () => {
    const response = await fetch(`${API_BASE_URL}/traffic/areas`);
    return response.json();
  },

  // Connect to WebSocket for real-time traffic updates
  connectToTrafficSocket: () => {
    // Use secure WebSocket (wss://) if the site is served over HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.hostname}:8000/ws/traffic`);
    return socket;
  }
};

/**
 * GeoJSON API
 */
export const GeoJSONAPI = {
  // Get GeoJSON data by type and year
  getGeoJSON: async (type: string, year: string | number) => {
    const response = await fetch(`${API_BASE_URL}/geojson/${year}/${type}`);
    return response.json() as Promise<GeoJSONResponse>;
  },

  // Get road network
  getRoadNetwork: async (year: string | number = 2025) => {
    return GeoJSONAPI.getGeoJSON('road_network', year);
  },

  // Get bus stops
  getBusStops: async (year: string | number = 2025) => {
    return GeoJSONAPI.getGeoJSON('bus_stops', year);
  },

  // Get metro stations
  getMetroStations: async (year: string | number = 2025) => {
    return GeoJSONAPI.getGeoJSON('metro_stations', year);
  }
};

/**
 * Analysis API
 */
export const AnalysisAPI = {
  // Get critical nodes
  getCriticalNodes: async (params: {
    layer?: string;
    algorithm?: string;
    count?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.layer) queryParams.append('layer', params.layer);
    if (params.algorithm) queryParams.append('algorithm', params.algorithm);
    if (params.count) queryParams.append('count', params.count.toString());
    
    const url = `${API_BASE_URL}/analysis/critical-nodes?${queryParams.toString()}`;
    const response = await fetch(url);
    return response.json() as Promise<CriticalNode[]>;
  },

  // Run disruption simulation
  simulateDisruption: async (params: {
    nodeIds: string[];
    simulationType?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/analysis/disruption-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    return response.json() as Promise<DisruptionSimulation>;
  },

  // Get traffic forecast
  getTrafficForecast: async (params: {
    datetime?: string;
    area?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.datetime) queryParams.append('datetime', params.datetime);
    if (params.area) queryParams.append('area', params.area);
    
    const url = `${API_BASE_URL}/analysis/forecasting?${queryParams.toString()}`;
    const response = await fetch(url);
    return response.json() as Promise<Forecast>;
  }
};

/**
 * Reports API
 */
export const ReportsAPI = {
  // Get report types
  getReportTypes: async () => {
    const response = await fetch(`${API_BASE_URL}/reports/types`);
    return response.json() as Promise<ReportType[]>;
  },

  // Get report templates
  getReportTemplates: async () => {
    const response = await fetch(`${API_BASE_URL}/reports/templates`);
    return response.json() as Promise<ReportTemplate[]>;
  },

  // Generate report
  generateReport: async (params: ReportGenerationRequest) => {
    const response = await fetch(`${API_BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    return response.json() as Promise<Report>;
  },

  // Get report by ID
  getReport: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}`);
    return response.json() as Promise<Report>;
  },

  // Get all reports
  getReports: async () => {
    const response = await fetch(`${API_BASE_URL}/reports`);
    return response.json() as Promise<Report[]>;
  }
};
