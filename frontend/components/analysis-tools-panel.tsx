"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Activity, Zap, AlertTriangle, FileImage, Play, Download } from "lucide-react"

interface AnalysisToolsPanelProps {
  selectedYear: number
  onAnalysisComplete: (results: any) => void
}

export default function AnalysisToolsPanel({ selectedYear, onAnalysisComplete }: AnalysisToolsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [criticalityParams, setCriticalityParams] = useState({
    algorithm: "betweenness_centrality",
    topN: 10,
  })
  const [trafficParams, setTrafficParams] = useState({
    dataType: "all",
    area: "",
  })
  const [forecastParams, setForecastParams] = useState({
    type: "traffic_flow",
    timePeriod: "1 week",
    area: "",
  })
  const [simulationParams, setSimulationParams] = useState({
    scenario: "",
    datetime: "",
    severity: "medium",
  })

  const runNetworkAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockResults = {
        type: "network_criticality",
        algorithm: criticalityParams.algorithm,
        topNodes: Array.from({ length: criticalityParams.topN }, (_, i) => ({
          id: `node_${i + 1}`,
          score: Math.random() * 100,
          location: [77.5946 + (Math.random() - 0.5) * 0.1, 12.9716 + (Math.random() - 0.5) * 0.1],
        })),
      }
      onAnalysisComplete(mockResults)
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runTrafficAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const mockResults = {
        type: "traffic_analysis",
        dataType: trafficParams.dataType,
        incidents: Math.floor(Math.random() * 50),
        avgFlow: Math.floor(Math.random() * 1000) + 500,
      }
      onAnalysisComplete(mockResults)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runForecast = async () => {
    setIsAnalyzing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const mockResults = {
        type: "forecast",
        forecastType: forecastParams.type,
        predictions: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          value: Math.random() * 100,
          confidence: 0.8 + Math.random() * 0.2,
        })),
      }
      onAnalysisComplete(mockResults)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runSimulation = async () => {
    setIsAnalyzing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      const mockResults = {
        type: "simulation",
        scenario: simulationParams.scenario,
        impactedRoutes: Math.floor(Math.random() * 20) + 5,
        delayIncrease: Math.floor(Math.random() * 30) + 10,
      }
      onAnalysisComplete(mockResults)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Analysis Tools</h3>
        <div className="text-sm text-gray-500">Year: {selectedYear}</div>
      </div>

      <Tabs defaultValue="criticality" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="criticality" className="text-xs">
            Network
          </TabsTrigger>
          <TabsTrigger value="traffic" className="text-xs">
            Traffic
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criticality" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Network Criticality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="algorithm">Algorithm</Label>
                <Select
                  value={criticalityParams.algorithm}
                  onValueChange={(value) => setCriticalityParams((prev) => ({ ...prev, algorithm: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="betweenness_centrality">Betweenness Centrality</SelectItem>
                    <SelectItem value="closeness_centrality">Closeness Centrality</SelectItem>
                    <SelectItem value="degree_centrality">Degree Centrality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="topN">Top N Nodes</Label>
                <Input
                  id="topN"
                  type="number"
                  value={criticalityParams.topN}
                  onChange={(e) =>
                    setCriticalityParams((prev) => ({ ...prev, topN: Number.parseInt(e.target.value) || 10 }))
                  }
                  min="1"
                  max="100"
                />
              </div>

              <Button onClick={runNetworkAnalysis} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Analysis
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                ML Forecasting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Forecast Type</Label>
                <Select
                  value={forecastParams.type}
                  onValueChange={(value) => setForecastParams((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traffic_flow">Traffic Flow</SelectItem>
                    <SelectItem value="passenger_flow">Passenger Flow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Time Period</Label>
                <Input
                  value={forecastParams.timePeriod}
                  onChange={(e) => setForecastParams((prev) => ({ ...prev, timePeriod: e.target.value }))}
                  placeholder="e.g., 1 week, 3 days"
                />
              </div>

              <div>
                <Label>Area of Interest</Label>
                <Input
                  value={forecastParams.area}
                  onChange={(e) => setForecastParams((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="e.g., Electronic City"
                />
              </div>

              <Button onClick={runForecast} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Generate Forecast
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Real-time Traffic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="flow">Flow Only</SelectItem>
                    <SelectItem value="incidents">Incidents Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Area Filter</Label>
                <Input
                  value={trafficParams.area}
                  onChange={(e) => setTrafficParams((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="Leave empty for all areas"
                />
              </div>

              <Button onClick={runTrafficAnalysis} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Analyze Traffic
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Disruption Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Disruption Scenario</Label>
                <Textarea
                  value={simulationParams.scenario}
                  onChange={(e) => setSimulationParams((prev) => ({ ...prev, scenario: e.target.value }))}
                  placeholder="Describe the disruption scenario..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={simulationParams.datetime}
                  onChange={(e) => setSimulationParams((prev) => ({ ...prev, datetime: e.target.value }))}
                />
              </div>

              <div>
                <Label>Severity</Label>
                <Select
                  value={simulationParams.severity}
                  onValueChange={(value) => setSimulationParams((prev) => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={runSimulation} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Run Simulation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <FileImage className="h-4 w-4 mr-2" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export Current View
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <FileImage className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
