"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Search, 
  MapPin, 
  Layers, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Loader2
} from "lucide-react"
import { GeoJSONAPI } from "@/lib/api"

type LayerKey = 'roads' | 'busStops' | 'busRoutes' | 'metroStations' | 'metroLines' | 'criticalNodes' | 'trafficFlow' | 'incidents' | 'forecast' | 'simulation'

interface CollapsibleControlPanelProps {
  selectedYear: number
  onYearChange: (year: number) => void
  activeLayers: Record<LayerKey, boolean>
  onLayerToggle: (layerName: LayerKey) => void
  viewport: any
  onViewportChange: (viewport: any) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

interface LayerInfo {
  key: string
  label: string
  color: string
  hasData: boolean
  loading: boolean
  dataCount?: number
}

export default function CollapsibleControlPanel({
  selectedYear,
  onYearChange,
  activeLayers,
  onLayerToggle,
  viewport,
  onViewportChange,
  isCollapsed = false,
  onToggleCollapse,
}: CollapsibleControlPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sectionsOpen, setSectionsOpen] = useState({
    timePeriod: true,
    search: true,
    quickLocations: true,
    mapLayers: true
  })
  const [layerInfo, setLayerInfo] = useState<Record<string, LayerInfo>>({})
  const [searchLoading, setSearchLoading] = useState(false)

  const years = Array.from({ length: 13 }, (_, i) => 2013 + i)

  const defaultLayerConfig = [
    { key: "roads", label: "Road Network", color: "bg-gray-500", apiType: "road_network" },
    { key: "busStops", label: "Bus Stops", color: "bg-blue-500", apiType: "bus_stops" },
    { key: "busRoutes", label: "Bus Routes", color: "bg-blue-600", apiType: "bus_routes" },
    { key: "metroStations", label: "Metro Stations", color: "bg-purple-500", apiType: "metro_stations" },
    { key: "metroLines", label: "Metro Lines", color: "bg-purple-600", apiType: "metro_lines" },
    { key: "criticalNodes", label: "Critical Nodes", color: "bg-red-500", apiType: "critical_nodes" },
    { key: "trafficFlow", label: "Traffic Flow", color: "bg-green-500", apiType: null },
    { key: "incidents", label: "Incidents", color: "bg-orange-500", apiType: null },
    { key: "forecast", label: "Forecast Results", color: "bg-cyan-500", apiType: null },
    { key: "simulation", label: "Simulation Results", color: "bg-pink-500", apiType: null },
  ]

  const presetLocations = [
    { name: "Bangalore City Center", lat: 12.9716, lng: 77.5946, zoom: 12 },
    { name: "Electronic City", lat: 12.8456, lng: 77.6603, zoom: 13 },
    { name: "Whitefield", lat: 12.9698, lng: 77.75, zoom: 13 },
    { name: "Koramangala", lat: 12.9279, lng: 77.6271, zoom: 14 },
    { name: "Indiranagar", lat: 12.9784, lng: 77.6408, zoom: 14 },
    { name: "MG Road Metro", lat: 12.9759, lng: 77.6037, zoom: 15 },
    { name: "Majestic Bus Station", lat: 12.9762, lng: 77.5723, zoom: 15 },
  ]

  // Initialize layer info
  useEffect(() => {
    const initialLayerInfo: Record<string, LayerInfo> = {}
    defaultLayerConfig.forEach(layer => {
      initialLayerInfo[layer.key] = {
        key: layer.key,
        label: layer.label,
        color: layer.color,
        hasData: false,
        loading: false,
        dataCount: 0
      }
    })
    setLayerInfo(initialLayerInfo)
  }, [])

  // Load layer data when year changes or layer is toggled
  useEffect(() => {
    loadLayerData()
  }, [selectedYear])

  const loadLayerData = async () => {
    for (const layerConfig of defaultLayerConfig) {
      if (layerConfig.apiType) {
        await checkLayerData(layerConfig.key, layerConfig.apiType, selectedYear)
      }
    }
  }

  const checkLayerData = async (layerKey: string, apiType: string, year: number) => {
    setLayerInfo(prev => ({
      ...prev,
      [layerKey]: { ...prev[layerKey], loading: true }
    }))

    try {
      const response = await fetch(`/api/v1/geojson/${year}/${apiType}`)
      if (response.ok) {
        const data = await response.json()
        const featureCount = data.features ? data.features.length : 0
        setLayerInfo(prev => ({
          ...prev,
          [layerKey]: {
            ...prev[layerKey],
            hasData: featureCount > 0,
            dataCount: featureCount,
            loading: false
          }
        }))
      } else {
        setLayerInfo(prev => ({
          ...prev,
          [layerKey]: { ...prev[layerKey], hasData: false, loading: false }
        }))
      }
    } catch (error) {
      console.error(`Error checking ${layerKey} data:`, error)
      setLayerInfo(prev => ({
        ...prev,
        [layerKey]: { ...prev[layerKey], hasData: false, loading: false }
      }))
    }
  }

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    // Use functional update to ensure state is always based on latest value
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      // Implement geocoding search here
      console.log("Searching for:", searchQuery)
      // For now, just simulate search
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handlePresetLocation = (location: any) => {
    onViewportChange({
      latitude: location.lat,
      longitude: location.lng,
      zoom: location.zoom,
    })
  }

  const handleLayerToggle = async (layerKey: LayerKey) => {
    const layerConfig = defaultLayerConfig.find(l => l.key === layerKey)
    
    // If turning on and has API type, load data
    if (!activeLayers[layerKey] && layerConfig?.apiType) {
      await checkLayerData(layerKey, layerConfig.apiType, selectedYear)
    }
    
    onLayerToggle(layerKey)
  }

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="w-12 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm border-r border-navy-200 dark:border-navy-700 flex flex-col shadow-lg"
      >
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Vertical icons */}
        <div className="flex flex-col space-y-4 p-2">
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
            <Search className="h-4 w-4 text-green-600" />
          </div>
          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
            <MapPin className="h-4 w-4 text-purple-600" />
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
            <Layers className="h-4 w-4 text-orange-600" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-80 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm border-r border-navy-200 dark:border-navy-700 flex flex-col shadow-lg"
    >
      {/* Header with collapse button */}
      <div className="p-4 border-b border-navy-200 dark:border-navy-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Controls</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Time Period Section */}
        <Collapsible 
          open={sectionsOpen.timePeriod} 
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, timePeriod: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                onClick={() => toggleSection('timePeriod')}
              >
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Time Period
                  </div>
                  {sectionsOpen.timePeriod ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
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
                  <div className="text-xs text-gray-500 mt-2">
                    Current: {selectedYear} | Data available: 2013-2025
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Search Section */}
        <Collapsible 
          open={sectionsOpen.search}
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, search: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                onClick={() => toggleSection('search')}
              >
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-green-600" />
                    Search Location
                  </div>
                  {sectionsOpen.search ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search places in Bangalore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    disabled={searchLoading}
                  />
                  <Button onClick={handleSearch} size="sm" disabled={searchLoading || !searchQuery.trim()}>
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Quick Locations Section */}
        <Collapsible 
          open={sectionsOpen.quickLocations}
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, quickLocations: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                onClick={() => toggleSection('quickLocations')}
              >
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                    Quick Locations
                  </div>
                  {sectionsOpen.quickLocations ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {presetLocations.map((location) => (
                    <Button
                      key={location.name}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => handlePresetLocation(location)}
                    >
                      <MapPin className="h-3 w-3 mr-2 opacity-60" />
                      {location.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Map Layers Section */}
        <Collapsible 
          open={sectionsOpen.mapLayers}
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, mapLayers: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                onClick={() => toggleSection('mapLayers')}
              >
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Layers className="h-5 w-5 mr-2 text-orange-600" />
                    Map Layers
                  </div>
                  {sectionsOpen.mapLayers ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {defaultLayerConfig.map((layer) => {
                    const info = layerInfo[layer.key]
                    return (
                      <div key={layer.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-3 h-3 rounded-full ${layer.color}`}></div>
                          <div className="flex-1">
                            <Label htmlFor={layer.key} className="text-sm font-medium cursor-pointer">
                              {layer.label}
                            </Label>
                            {info && (
                              <div className="text-xs text-gray-500 mt-1">
                                {info.loading ? (
                                  <span className="flex items-center">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Loading...
                                  </span>
                                ) : info.hasData ? (
                                  <span className="text-green-600">
                                    {info.dataCount} items available
                                  </span>
                                ) : (
                                  <span className="text-orange-500">
                                    No data for {selectedYear}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Switch
                          id={layer.key}
                          checked={activeLayers[layer.key as LayerKey]}
                          onCheckedChange={() => handleLayerToggle(layer.key as LayerKey)}
                          disabled={info?.loading}
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Map Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-600" />
              Map Info
            </CardTitle>
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
    </motion.div>
  )
}
