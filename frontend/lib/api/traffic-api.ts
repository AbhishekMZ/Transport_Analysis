/**
 * Traffic API service for fetching real-time traffic data
 */

// Traffic flow segment interface
export interface TrafficFlowSegment {
  id: string;
  coordinates: [number, number][]; // Array of [longitude, latitude] points
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure: boolean;
  roadName?: string;
}

// Traffic incident interface
export interface TrafficIncident {
  id: string;
  type: string;
  severity: number; // 0-4 scale
  description: string;
  coordinates: [number, number]; // [longitude, latitude]
  startTime: string;
  endTime?: string;
  roadName?: string;
  delay?: number; // Delay in seconds
}

// Traffic API response interfaces
export interface TrafficFlowResponse {
  timestamp: string;
  flowSegments: TrafficFlowSegment[];
  area?: string;
}

export interface TrafficIncidentResponse {
  timestamp: string;
  incidents: TrafficIncident[];
  area?: string;
}

export interface TrafficSummaryResponse {
  timestamp: string;
  congestionLevel: number; // 0-100 scale
  averageSpeed: number;
  incidentCount: number;
  criticalIncidents: number;
  mostCongested: {
    roadName: string;
    congestionLevel: number;
  }[];
}

// Base API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const TrafficAPI = {
  /**
   * Get real-time traffic flow data
   * @param refresh Force refresh data from TomTom API
   * @param area Optional named area to focus on
   */
  getTrafficFlow: async (refresh: boolean = false, area?: string): Promise<TrafficFlowResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (refresh) queryParams.append('refresh', 'true');
      if (area) queryParams.append('area', area);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/api/traffic/realtime/flow${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching traffic flow data: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch traffic flow data:', error);
      return { timestamp: new Date().toISOString(), flowSegments: [] };
    }
  },

  /**
   * Get real-time traffic incidents
   * @param refresh Force refresh data from TomTom API
   * @param area Optional named area to focus on
   */
  getTrafficIncidents: async (refresh: boolean = false, area?: string): Promise<TrafficIncidentResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (refresh) queryParams.append('refresh', 'true');
      if (area) queryParams.append('area', area);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/api/traffic/realtime/incidents${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching traffic incidents data: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch traffic incidents data:', error);
      return { timestamp: new Date().toISOString(), incidents: [] };
    }
  },

  /**
   * Get a summary of traffic conditions
   */
  getTrafficSummary: async (): Promise<TrafficSummaryResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/traffic/summary`);
      
      if (!response.ok) {
        throw new Error(`Error fetching traffic summary data: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch traffic summary data:', error);
      return {
        timestamp: new Date().toISOString(),
        congestionLevel: 0,
        averageSpeed: 0,
        incidentCount: 0,
        criticalIncidents: 0,
        mostCongested: []
      };
    }
  },

  /**
   * Get available traffic monitoring areas
   */
  getTrafficAreas: async (): Promise<{ name: string, bbox: string }[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/traffic/areas`);
      
      if (!response.ok) {
        throw new Error(`Error fetching traffic areas: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch traffic areas:', error);
      return [];
    }
  }
};
