"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Zap, Play, TrendingUp, Cloud, Calendar } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import MapComponent from "@/components/map-component"
import { AnalysisAPI } from "@/lib/api"

interface ForecastResult {
  timestamp: string
  value: number
  confidence: number
  location?: string
  congestionLevel?: number
  predictedSpeed?: number
}

export default function MLForecastingPage() {
  const [forecastParams, setForecastParams] = useState({
    type: "traffic_flow",
    timePeriod: "1 week",
    areaOfInterest: "",
    confidenceLevel: 0.8,
  })
  const [isForecasting, setIsForecasting] = useState(false)
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([])
  const [contributingFactors, setContributingFactors] = useState({
    weather: true,
    events: true,
    holidays: true,
    historical: true,
  })
  const [scenarioParams, setScenarioParams] = useState({
    weather: "normal",
    eventAttendance: 50,
    dayOfWeek: "weekday",
    season: "current",
  })
  const [error, setError] = useState<string | null>(null)

  const forecastTypes = [
    { value: "traffic_flow", label: "Traffic Flow" },
    { value: "passenger_flow", label: "Passenger Flow" },
  ]

  const timePeriodPresets = [
    { value: "morning rush", label: "Morning Rush (7-10 AM)" },
    { value: "evening rush", label: "Evening Rush (5-8 PM)" },
    { value: "weekend", label: "Weekend Pattern" },
    { value: "1 day", label: "Next 24 Hours" },
    { value: "1 week", label: "Next Week" },
    { value: "1 month", label: "Next Month" },
  ]

  const runForecast = async () => {
    setIsForecasting(true)
    setError(null)
    
    try {
      // Get current date/time and calculate target time based on period
      const now = new Date()
      let targetDate: string
      let targetTime: string
      
      // Calculate target date/time based on forecast type
      if (forecastParams.timePeriod === "morning rush") {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        targetDate = tomorrow.toISOString().split('T')[0]
        targetTime = "08:00"
      } else if (forecastParams.timePeriod === "evening rush") {
        targetDate = now.toISOString().split('T')[0]
        targetTime = "18:00"
      } else if (forecastParams.timePeriod === "1 day") {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        targetDate = tomorrow.toISOString().split('T')[0]
        targetTime = now.getHours().toString().padStart(2, '0') + ":00"
      } else {
        // Default to next day at current time
        const nextDay = new Date(now)
        nextDay.setDate(nextDay.getDate() + 1)
        targetDate = nextDay.toISOString().split('T')[0]
        targetTime = now.getHours().toString().padStart(2, '0') + ":00"
      }

      // Call the real analysis API
      const forecastData = await AnalysisAPI.getTrafficForecast({
        datetime: `${targetDate} ${targetTime}`,
        area: forecastParams.areaOfInterest || undefined
      })

      // Convert API response to ForecastResult format
      const results: ForecastResult[] = []
      
      if (forecastData.forecast_data && forecastData.forecast_data.area_forecasts) {
        Object.entries(forecastData.forecast_data.area_forecasts).forEach(([areaName, forecast]: [string, any]) => {
          // Generate time series data based on forecast
          const hours = forecastParams.timePeriod.includes("week") ? 168 : 
                       forecastParams.timePeriod.includes("month") ? 720 : 24
          
          for (let i = 0; i < hours; i++) {
            const forecastTime = new Date(now.getTime() + i * 3600000)
            results.push({
              timestamp: forecastTime.toISOString(),
              value: forecast.average_speed || 0,
              confidence: forecast.confidence || 0.8,
              location: areaName,
              congestionLevel: forecast.congestion_level || 0,
              predictedSpeed: forecast.average_speed || 0
            })
          }
        })
      } else {
        // Fallback: generate single forecast result
        const hours = forecastParams.timePeriod.includes("week") ? 168 : 
                     forecastParams.timePeriod.includes("month") ? 720 : 24
        
        for (let i = 0; i < hours; i++) {
          const forecastTime = new Date(now.getTime() + i * 3600000)
          results.push({
            timestamp: forecastTime.toISOString(),
            value: forecastData.forecast_data?.overall_congestion ? 
                   (1 - forecastData.forecast_data.overall_congestion) * 100 : 50,
            confidence: forecastData.confidence || 0.8,
            location: forecastParams.areaOfInterest || "Bangalore"
          })
        }
      }

      setForecastResults(results)
      
    } catch (error) {
      console.error("Forecast failed:", error)
      setError(`Failed to generate forecast: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsForecasting(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Zap className="h-8 w-8 mr-3" />
                ML Forecasting
              </h1>
              <p className="text-gray-600 mt-2">Predict future traffic patterns using machine learning</p>
            </div>
            <Button onClick={runForecast} disabled={isForecasting}>
              {isForecasting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Forecast
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Control Panel */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Forecast Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {forecastTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Period</Label>
                  <Select
                    value={forecastParams.timePeriod}
                    onValueChange={(value) => setForecastParams((prev) => ({ ...prev, timePeriod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timePeriodPresets.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Custom Time Period</Label>
                  <Input
                    value={forecastParams.timePeriod}
                    onChange={(e) => setForecastParams((prev) => ({ ...prev, timePeriod: e.target.value }))}
                    placeholder="e.g., next 3 days, tomorrow morning"
                  />
                </div>

                <div>
                  <Label>Area of Interest</Label>
                  <Input
                    value={forecastParams.areaOfInterest}
                    onChange={(e) => setForecastParams((prev) => ({ ...prev, areaOfInterest: e.target.value }))}
                    placeholder="e.g., Electronic City"
                  />
                </div>

                <div>
                  <Label>Confidence Level: {(forecastParams.confidenceLevel * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[forecastParams.confidenceLevel]}
                    onValueChange={(value) => setForecastParams((prev) => ({ ...prev, confidenceLevel: value[0] }))}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contributing Factors */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Contributing Factors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(contributingFactors).map(([factor, enabled]) => (
                  <div key={factor} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {factor === "weather" && <Cloud className="h-4 w-4" />}
                      {factor === "events" && <Calendar className="h-4 w-4" />}
                      {factor === "holidays" && <Calendar className="h-4 w-4" />}
                      {factor === "historical" && <TrendingUp className="h-4 w-4" />}
                      <Label className="capitalize">{factor}</Label>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setContributingFactors((prev) => ({ ...prev, [factor]: e.target.checked }))}
                      className="rounded"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scenario Testing */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Scenario Testing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Weather Conditions</Label>
                  <Select
                    value={scenarioParams.weather}
                    onValueChange={(value) => setScenarioParams((prev) => ({ ...prev, weather: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="rain">Rainy</SelectItem>
                      <SelectItem value="heavy_rain">Heavy Rain</SelectItem>
                      <SelectItem value="fog">Foggy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Event Attendance: {scenarioParams.eventAttendance}%</Label>
                  <Slider
                    value={[scenarioParams.eventAttendance]}
                    onValueChange={(value) => setScenarioParams((prev) => ({ ...prev, eventAttendance: value[0] }))}
                    min={0}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Day Type</Label>
                  <Select
                    value={scenarioParams.dayOfWeek}
                    onValueChange={(value) => setScenarioParams((prev) => ({ ...prev, dayOfWeek: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekday">Weekday</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="map" className="flex-1 flex flex-col">
              <div className="border-b px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="map">Forecast Map</TabsTrigger>
                  <TabsTrigger value="timeseries">Time Series</TabsTrigger>
                  <TabsTrigger value="factors">Factor Analysis</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="map" className="flex-1 p-6">
                <div className="h-full relative">
                  <MapComponent
                    viewport={{
                      latitude: 12.9716,
                      longitude: 77.5946,
                      zoom: 11,
                    }}
                    onViewportChange={() => {}}
                    activeLayers={{ forecast: true }}
                    selectedYear={2024}
                    onFeatureClick={(feature) => {
                      console.log("Selected forecast area:", feature)
                    }}
                  />

                  {/* Forecast Legend */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-medium mb-2">Forecast Intensity</h4>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-200 mr-2"></div>
                        <span className="text-sm">Low Activity</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 mr-2"></div>
                        <span className="text-sm">Moderate Activity</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-800 mr-2"></div>
                        <span className="text-sm">High Activity</span>
                      </div>
                    </div>
                  </div>

                  {/* Time Control */}
                  {forecastResults.length > 0 && (
                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4">
                      <Label className="text-sm font-medium">Forecast Time</Label>
                      <input type="range" min="0" max={forecastResults.length - 1} className="w-full mt-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        {forecastResults[0] && new Date(forecastResults[0].timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="timeseries" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Forecast Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {forecastResults.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold">{forecastResults[0]?.value.toFixed(1)}</div>
                              <div className="text-sm text-gray-600">Current Prediction</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold">
                                {Math.max(...forecastResults.map((r) => r.value)).toFixed(1)}
                              </div>
                              <div className="text-sm text-gray-600">Peak Forecast</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div
                                className={`text-2xl font-bold ${getConfidenceColor(forecastResults[0]?.confidence || 0)}`}
                              >
                                {((forecastResults[0]?.confidence || 0) * 100).toFixed(0)}%
                              </div>
                              <div className="text-sm text-gray-600">Confidence</div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                            <p>Time series chart would be rendered here</p>
                            <p className="text-sm">Showing {forecastResults.length} data points</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Generate a forecast to see time series data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="factors" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contributing Factors Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(contributingFactors)
                        .filter(([_, enabled]) => enabled)
                        .map(([factor, _]) => (
                          <div key={factor} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {factor === "weather" && <Cloud className="h-5 w-5 text-blue-500" />}
                              {factor === "events" && <Calendar className="h-5 w-5 text-purple-500" />}
                              {factor === "holidays" && <Calendar className="h-5 w-5 text-green-500" />}
                              {factor === "historical" && <TrendingUp className="h-5 w-5 text-orange-500" />}
                              <span className="font-medium capitalize">{factor}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${Math.random() * 100}%` }}></div>
                              </div>
                              <span className="text-sm font-medium">{Math.floor(Math.random() * 100)}%</span>
                            </div>
                          </div>
                        ))}
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
