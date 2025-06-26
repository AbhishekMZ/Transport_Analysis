"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Layers } from "lucide-react"

interface ControlPanelProps {
  selectedYear: number
  onYearChange: (year: number) => void
  activeLayers: Record<string, boolean>
  onLayerToggle: (layerName: string) => void
  viewport: any
  onViewportChange: (viewport: any) => void
}

export default function ControlPanel({
  selectedYear,
  onYearChange,
  activeLayers,
  onLayerToggle,
  viewport,
  onViewportChange,
}: ControlPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const years = Array.from({ length: 13 }, (_, i) => 2013 + i)

  const layerConfig = [
    { key: "roads", label: "Road Network", color: "bg-gray-500" },
    { key: "busStops", label: "Bus Stops", color: "bg-blue-500" },
    { key: "metroLines", label: "Metro Lines", color: "bg-purple-500" },
    { key: "criticalNodes", label: "Critical Nodes", color: "bg-red-500" },
    { key: "trafficFlow", label: "Traffic Flow", color: "bg-green-500" },
    { key: "incidents", label: "Incidents", color: "bg-orange-500" },
    { key: "forecast", label: "Forecast Results", color: "bg-cyan-500" },
    { key: "simulation", label: "Simulation Results", color: "bg-pink-500" },
  ]

  const presetLocations = [
    { name: "Bangalore City Center", lat: 12.9716, lng: 77.5946, zoom: 12 },
    { name: "Electronic City", lat: 12.8456, lng: 77.6603, zoom: 13 },
    { name: "Whitefield", lat: 12.9698, lng: 77.75, zoom: 13 },
    { name: "Koramangala", lat: 12.9279, lng: 77.6271, zoom: 14 },
    { name: "Indiranagar", lat: 12.9784, lng: 77.6408, zoom: 14 },
  ]

  const handleSearch = () => {
    // Implement geocoding search
    console.log("Searching for:", searchQuery)
  }

  const handlePresetLocation = (location: any) => {
    onViewportChange({
      latitude: location.lat,
      longitude: location.lng,
      zoom: location.zoom,
    })
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      {/* Year Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Time Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="year-select">Analysis Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(Number.parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Search places in Bangalore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preset Locations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Quick Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {presetLocations.map((location) => (
              <Button
                key={location.name}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePresetLocation(location)}
              >
                {location.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Layer Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Layers className="h-5 w-5 mr-2" />
            Map Layers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {layerConfig.map((layer) => (
              <div key={layer.key} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${layer.color}`}></div>
                  <Label htmlFor={layer.key} className="text-sm font-medium">
                    {layer.label}
                  </Label>
                </div>
                <Switch
                  id={layer.key}
                  checked={activeLayers[layer.key]}
                  onCheckedChange={() => onLayerToggle(layer.key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Map Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Latitude:</span>
              <span className="font-mono">{viewport.latitude.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Longitude:</span>
              <span className="font-mono">{viewport.longitude.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Zoom Level:</span>
              <span className="font-mono">{viewport.zoom}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
