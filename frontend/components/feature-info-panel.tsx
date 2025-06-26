"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, MapPin, Clock, TrendingUp, AlertCircle } from "lucide-react"

interface FeatureInfoPanelProps {
  feature: any
  onClose: () => void
}

export default function FeatureInfoPanel({ feature, onClose }: FeatureInfoPanelProps) {
  // Mock feature data - in real implementation, this would come from your backend
  const mockFeature = {
    type: "traffic_incident",
    id: "INC_001",
    title: "Traffic Congestion",
    location: "MG Road, Bangalore",
    coordinates: [77.6033, 12.9762],
    severity: "high",
    timestamp: "2024-01-15T14:30:00Z",
    description: "Heavy traffic congestion due to road construction work",
    properties: {
      "Traffic Flow": "45% of normal",
      "Estimated Delay": "15-20 minutes",
      "Affected Routes": "3 major routes",
      Status: "Active",
    },
    metrics: [
      { label: "Current Speed", value: "12 km/h", trend: "down" },
      { label: "Normal Speed", value: "35 km/h", trend: "neutral" },
      { label: "Congestion Level", value: "High", trend: "up" },
    ],
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-500" />
      case "down":
        return <TrendingUp className="h-3 w-3 text-green-500 rotate-180" />
      default:
        return <div className="h-3 w-3" />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Feature Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{mockFeature.title}</CardTitle>
              <Badge className={`${getSeverityColor(mockFeature.severity)} text-white`}>
                {mockFeature.severity.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              {mockFeature.location}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              {new Date(mockFeature.timestamp).toLocaleString()}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              ID: {mockFeature.id}
            </div>

            <p className="text-sm text-gray-700 mt-3">{mockFeature.description}</p>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(mockFeature.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-medium">{value as string}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockFeature.metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{metric.value}</span>
                    {getTrendIcon(metric.trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coordinates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Latitude:</span>
                <span className="font-mono">{mockFeature.coordinates[1].toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Longitude:</span>
                <span className="font-mono">{mockFeature.coordinates[0].toFixed(6)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            View Historical Data
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            Export Feature Data
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            Set Alert for This Location
          </Button>
        </div>
      </div>
    </div>
  )
}
