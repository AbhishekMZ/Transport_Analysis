"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, AlertTriangle, Clock, MapPin, RefreshCw, TrendingUp } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import TransportMap from "@/components/TransportMap"
import { TrafficAPI, TrafficIncident as ApiTrafficIncident } from "@/lib/api"

interface TrafficIncident {
  id: string
  type: string
  location: string
  severity: "minor" | "moderate" | "major"
  startTime: string
  estimatedDuration: string
  description: string
  coordinates: [number, number]
}

interface TrafficData {
  avgSpeed: number
  congestionLevel: string
  incidents: number
  lastUpdated: string
}

type SeverityFilter = "all" | "major" | "moderate"

interface TrafficParams {
  dataType: string
  areaOfInterest: string
  refreshInterval: number
  severityFilter: SeverityFilter
}

interface MapLayers {
  roads: boolean
  traffic: boolean
  busStops: boolean
  metro: boolean
}

export default function RealTimeTrafficPage() {
  const [trafficParams, setTrafficParams] = useState<TrafficParams>({
    dataType: "all",
    areaOfInterest: "",
    refreshInterval: 60,
    severityFilter: "all",
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [trafficData, setTrafficData] = useState<TrafficData>({
    avgSpeed: 0,
    congestionLevel: "Unknown",
    incidents: 0,
    lastUpdated: new Date().toLocaleTimeString(),
  })
  const [incidents, setIncidents] = useState<TrafficIncident[]>([])
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [showLayers, setShowLayers] = useState<MapLayers>({
    roads: true,
    traffic: true,
    busStops: false,
    metro: false,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [filteredIncidents, setFilteredIncidents] = useState<TrafficIncident[]>([])

  const dataTypes = [
    { value: "all", label: "All Traffic Data" },
    { value: "incidents", label: "Incidents Only" },
    { value: "congestion", label: "Congestion Only" },
  ]

  const refreshIntervals = [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 300, label: "5 minutes" },
    { value: 600, label: "10 minutes" },
  ]

  const severityFilters = [
    { value: "all", label: "All Severities" },
    { value: "major", label: "Major Incidents" },
    { value: "moderate", label: "Moderate & Major" },
  ]
  
  // Helper function to get congestion color based on level
  const getCongestionColor = (level: string): string => {
    switch(level.toLowerCase()) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-500";
    }
  }
  
  // Helper function to get severity color for incidents
  const getSeverityColor = (severity: string): string => {
    switch(severity.toLowerCase()) {
      case "major":
        return "bg-red-100 text-red-800";
      case "moderate":
        return "bg-orange-100 text-orange-800";
      case "minor":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "";
    }
  }

  // Function to establish WebSocket connection
  const connectWebSocket = () => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    try {
      const socket = TrafficAPI.connectToTrafficSocket();
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsLoading(false);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          processTrafficData(data);
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Fallback to regular API if WebSocket fails
        fetchTrafficData().catch(err => console.error('Fallback fetch failed:', err));
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        wsRef.current = null;
        
        // Auto reconnect if needed
        if (autoRefresh) {
          setTimeout(() => {
            if (autoRefresh) connectWebSocket();
          }, 3000); // Try to reconnect after 3 seconds
        }
      };
      
      wsRef.current = socket;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsLoading(false);
      
      // Fallback to regular API
      fetchTrafficData().catch(err => console.error('Fallback fetch failed:', err));
    }
  };
  
  // Handle WebSocket connection based on autoRefresh state
  useEffect(() => {
    if (autoRefresh) {
      setIsLoading(true);
      connectWebSocket();
    } else if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoRefresh]);
  
  // Set up interval-based refresh when not using WebSocket
  useEffect(() => {
    // Don't set up interval if using WebSocket or if refresh interval is 0 (manual)
    if (autoRefresh || trafficParams.refreshInterval === 0) return;
    
    // Fetch immediately
    fetchTrafficData();
    
    // Set up interval
    const intervalId = setInterval(() => {
      fetchTrafficData();
    }, trafficParams.refreshInterval * 1000);
    
    // Cleanup
    return () => clearInterval(intervalId);
  }, [trafficParams.refreshInterval, autoRefresh, trafficParams.areaOfInterest, trafficParams.severityFilter]);

  interface TrafficFlowSegment {
    currentSpeed?: number;
    freeFlowSpeed?: number;
  }

  interface TrafficIncidentProperties {
    id?: string;
    from?: string;
    magnitudeOfDelay?: number;
    startTime?: string;
    delay?: number;
    events?: Array<{description?: string}>;
  }

  const processTrafficData = (data: any) => {
    if (!data) return;
    
    try {
      // Calculate average speed and congestion level from flow data
      if (data.flow && Array.isArray(data.flow.flowSegmentData)) {
        const segments = data.flow.flowSegmentData;
        let totalSpeed = 0;
        let totalSegments = segments.length;
        let congestionScore = 0;
        
        segments.forEach((segment: TrafficFlowSegment) => {
          const currentSpeed = Number(segment.currentSpeed) || 0;
          const freeFlowSpeed = Number(segment.freeFlowSpeed) || 1; // Prevent division by zero
          
          totalSpeed += currentSpeed;
          // Calculate congestion score (0-1) based on ratio of current to free-flow speed
          const ratio = freeFlowSpeed > 0 ? (currentSpeed / freeFlowSpeed) : 0;
          congestionScore += (1 - ratio);
        });
        
        const avgSpeed = totalSegments > 0 ? totalSpeed / totalSegments : 0;
        const avgCongestion = totalSegments > 0 ? congestionScore / totalSegments : 0;
        
        // Determine congestion level
        let congestionLevel = "Low";
        if (avgCongestion > 0.75) congestionLevel = "Severe";
        else if (avgCongestion > 0.5) congestionLevel = "High";
        else if (avgCongestion > 0.25) congestionLevel = "Moderate";
        
        setTrafficData({
          avgSpeed: Math.round(avgSpeed),
          congestionLevel,
          incidents: Array.isArray(data.incidents) ? data.incidents.length : 0,
          lastUpdated: new Date().toLocaleTimeString(),
        });
      }
      
      // Process incidents data
      if (Array.isArray(data.incidents)) {
        const apiIncidents = data.incidents;
        const mappedIncidents: TrafficIncident[] = apiIncidents.map((inc: Partial<ApiTrafficIncident>, index: number) => {
          // Extract location name from properties
          const properties = inc.properties as TrafficIncidentProperties || {};
          const location = properties.from || 'Unknown location';
          
          // Determine severity based on magnitude of delay
          let severity: 'minor' | 'moderate' | 'major' = 'minor';
          const magnitudeOfDelay = Number(properties.magnitudeOfDelay) || 0;
          if (magnitudeOfDelay > 8) severity = 'major';
          else if (magnitudeOfDelay > 4) severity = 'moderate';
          
          // Format dates
          const startTime = properties.startTime 
            ? new Date(properties.startTime).toLocaleTimeString() 
            : 'Unknown';
            
          const delay = Number(properties.delay) || 0;
          const duration = delay ? `${Math.round(delay / 60)} minutes` : 'Unknown';
          
          // Get coordinates from geometry
          let coordinates: [number, number] = [77.5946, 12.9716]; // Default to Bangalore center
          try {
            if (inc.geometry?.coordinates && Array.isArray(inc.geometry.coordinates) && 
                inc.geometry.coordinates.length > 0) {
              const coords = inc.geometry.coordinates[0];
              if (Array.isArray(coords) && coords.length >= 2) {
                coordinates = [Number(coords[0]) || coordinates[0], Number(coords[1]) || coordinates[1]];
              }
            }
          } catch (e) {
            console.warn('Error parsing coordinates:', e);
          }
          
          // Get description from events if available
          const events = properties.events || [];
          const eventDescription = events[0]?.description || 'Traffic incident';
          
          return {
            id: properties.id || `incident-${index}`,
            type: eventDescription,
            location,
            severity,
            startTime,
            estimatedDuration: duration,
            description: eventDescription,
            coordinates
          };
        });
        
        setIncidents(mappedIncidents);
      }
    } catch (error) {
      console.error('Error processing traffic data:', error);
      // Set fallback data if processing fails
      setTrafficData({
        avgSpeed: 0,
        congestionLevel: "Unknown",
        incidents: 0,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    }
  };

  const fetchTrafficData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Create an array of promises to fetch data in parallel
      const [flowData, incidentsData] = await Promise.all([
        TrafficAPI.getTrafficFlow(trafficParams.areaOfInterest).catch(error => {
          console.error('Error fetching traffic flow:', error);
          return { flowSegmentData: [] }; // Return empty data on error
        }),
        TrafficAPI.getTrafficIncidents(trafficParams.areaOfInterest).catch(error => {
          console.error('Error fetching traffic incidents:', error);
          return []; // Return empty array on error
        })
      ]);
      
      // Process combined data
      processTrafficData({
        flow: flowData,
        incidents: incidentsData
      });
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      setError('Failed to load traffic data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  // Filter incidents when the severity filter changes
  useEffect(() => {
    if (incidents.length === 0) return;
    
    const filtered = incidents.filter((incident) => {
      if (trafficParams.severityFilter === "all") return true;
      if (trafficParams.severityFilter === "major") return incident.severity === "major";
      if (trafficParams.severityFilter === "moderate") return ["moderate", "major"].includes(incident.severity);
      return true;
    });
    
    setFilteredIncidents(filtered);
  }, [incidents, trafficParams.severityFilter]);

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Activity className="h-8 w-8 mr-3" />
                Real-time Traffic
              </h1>
              <p className="text-gray-600 mt-2">Monitor current traffic conditions across Bangalore</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label>Auto Refresh</Label>
              </div>
              <Button onClick={fetchTrafficData} disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Control Panel */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Traffic Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Data Type</Label>
                  <Select
                    value={trafficParams.dataType}
                    onValueChange={(value) => setTrafficParams((prev) => ({ ...prev, dataType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Area of Interest</Label>
                  <Input
                    value={trafficParams.areaOfInterest}
                    onChange={(e) => setTrafficParams((prev) => ({ ...prev, areaOfInterest: e.target.value }))}
                    placeholder="e.g., Electronic City"
                  />
                </div>

                <div>
                  <Label>Refresh Interval</Label>
                  <Select
                    value={trafficParams.refreshInterval.toString()}
                    onValueChange={(value) =>
                      setTrafficParams((prev) => ({ ...prev, refreshInterval: Number.parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {refreshIntervals.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value.toString()}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severity Filter</Label>
                  <Select
                    value={trafficParams.severityFilter}
                    onValueChange={(value) => setTrafficParams((prev) => ({ ...prev, severityFilter: value as SeverityFilter }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityFilters.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Summary */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Traffic Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Speed:</span>
                  <span className="font-medium">{trafficData.avgSpeed} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Congestion Level:</span>
                  <span className={`font-medium ${getCongestionColor(trafficData.congestionLevel)}`}>
                    {trafficData.congestionLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Incidents:</span>
                  <Badge variant="outline">{trafficData.incidents}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="text-sm font-mono">{trafficData.lastUpdated}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Areas */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quick Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["CBD", "Tech Corridor", "Airport Road", "Outer Ring Road"].map((area) => (
                    <Button
                      key={area}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setTrafficParams((prev) => ({ ...prev, areaOfInterest: area }))}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {area}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map Layers */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Map Layers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="show-traffic" className="flex items-center space-x-2">
                    <span>Show Traffic</span>
                    <Switch 
                      id="show-traffic" 
                      checked={showLayers.traffic} 
                      onCheckedChange={(checked) => setShowLayers({...showLayers, traffic: checked})} 
                    />
                  </Label>

                  <Label htmlFor="show-roads" className="flex items-center space-x-2">
                    <span>Show Roads</span>
                    <Switch 
                      id="show-roads" 
                      checked={showLayers.roads} 
                      onCheckedChange={(checked) => setShowLayers({...showLayers, roads: checked})} 
                    />
                  </Label>
                  
                  <Label htmlFor="show-bus" className="flex items-center space-x-2">
                    <span>Show Bus Stops</span>
                    <Switch 
                      id="show-bus" 
                      checked={showLayers.busStops} 
                      onCheckedChange={(checked) => setShowLayers({...showLayers, busStops: checked})} 
                    />
                  </Label>
                  
                  <Label htmlFor="show-metro" className="flex items-center space-x-2">
                    <span>Show Metro</span>
                    <Switch 
                      id="show-metro" 
                      checked={showLayers.metro} 
                      onCheckedChange={(checked) => setShowLayers({...showLayers, metro: checked})} 
                    />
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        onClick={() => setError('')}
                        className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Tabs defaultValue="map" className="flex-1 flex flex-col">
              <div className="border-b px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="map">Traffic Map</TabsTrigger>
                  <TabsTrigger value="incidents">Incidents ({filteredIncidents.length})</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="map" className="flex-1 p-6">
                <div className="h-full relative">
                  <TransportMap 
                    showRoads={showLayers.roads}
                    showTraffic={showLayers.traffic}
                    showBusStops={showLayers.busStops}
                    showMetro={showLayers.metro}
                    height="500px"
                  />
                </div>
              </TabsContent>

              <TabsContent value="incidents" className="flex-1 p-6">
                <div className="space-y-4">
                  {filteredIncidents.map((incident: TrafficIncident) => (
                    <Card key={incident.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">{incident.type}</span>
                              <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                                {incident.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-3 w-3 mr-1" />
                                {incident.location}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Started: {incident.startTime}
                              </div>
                              <div>Duration: {incident.estimatedDuration}</div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            View on Map
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredIncidents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No incidents match the current filter</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trends" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Traffic trend analysis coming soon</p>
                      <p className="text-sm mt-2">View historical patterns and predictions</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}