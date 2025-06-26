// API client for TransiGenius backend integration
class TransiGeniusAPI {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || "", apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error)
      throw error
    }
  }

  // 1. Get project metadata
  async getProjectMetadata() {
    return this.request("/api/metadata")
  }

  // 2. Get GTFS routes
  async getGTFSRoutes(params: {
    year: number
    route_id?: string
    transport_type?: string
    bounding_box?: [number, number, number, number]
  }) {
    const searchParams = new URLSearchParams({
      year: params.year.toString(),
      ...(params.route_id && { route_id: params.route_id }),
      ...(params.transport_type && { transport_type: params.transport_type }),
      ...(params.bounding_box && { bounding_box: params.bounding_box.join(",") }),
    })

    return this.request(`/api/gtfs/routes?${searchParams}`)
  }

  // 3. Get temporal GeoJSON data
  async getTemporalGeoJSON(params: {
    year: number
    data_type: string
    bounding_box?: [number, number, number, number]
  }) {
    const searchParams = new URLSearchParams({
      year: params.year.toString(),
      data_type: params.data_type,
      ...(params.bounding_box && { bounding_box: params.bounding_box.join(",") }),
    })

    return this.request(`/api/temporal/geojson?${searchParams}`)
  }

  // 4. Analyze network criticality
  async analyzeNetworkCriticality(params: {
    analysis_year: number
    algorithm_type?: string
    top_n?: number
  }) {
    return this.request("/api/analysis/network-criticality", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  // 5. Get real-time traffic data
  async getRealtimeTraffic(params: {
    data_type: string
    area_of_interest?: string
  }) {
    const searchParams = new URLSearchParams({
      data_type: params.data_type,
      ...(params.area_of_interest && { area_of_interest: params.area_of_interest }),
    })

    return this.request(`/api/traffic/realtime?${searchParams}`)
  }

  // 6. Run ML forecast
  async runMLForecast(params: {
    forecast_type: string
    time_period: string
    area_of_interest?: string
  }) {
    return this.request("/api/ml/forecast", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  // 7. Simulate disruption
  async simulateDisruption(params: {
    disruption_scenario: string
    time_of_disruption?: string
  }) {
    return this.request("/api/simulation/disruption", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  // 8. Update dashboard visualization
  async updateDashboardVisualization(params: {
    action: string
    data: any
    message?: string
  }) {
    return this.request("/api/dashboard/update", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  // 9. Generate static map report
  async generateStaticMapReport(params: {
    geojson_data: any
    title?: string
    zoom?: number
    center?: [number, number]
    map_type?: string
  }) {
    return this.request("/api/reports/static-map", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }
}

// Export singleton instance
export const apiClient = new TransiGeniusAPI()

// Export types for better TypeScript support
export interface NetworkCriticalityResult {
  algorithm: string
  top_nodes: Array<{
    id: string
    score: number
    location: [number, number]
  }>
}

export interface TrafficData {
  incidents: number
  avg_flow: number
  data_type: string
  timestamp: string
}

export interface ForecastResult {
  forecast_type: string
  predictions: Array<{
    timestamp: string
    value: number
    confidence: number
  }>
}

export interface SimulationResult {
  scenario: string
  impacted_routes: number
  delay_increase: number
  mitigation_strategies: string[]
}
