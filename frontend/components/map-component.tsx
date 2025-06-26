"use client"

import { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

interface MapComponentProps {
  viewport: {
    latitude: number
    longitude: number
    zoom: number
  }
  onViewportChange: (viewport: any) => void
  activeLayers: Record<string, boolean>
  selectedYear: number
  onFeatureClick: (feature: any) => void
}

export default function MapComponent({
  viewport,
  onViewportChange,
  activeLayers,
  selectedYear,
  onFeatureClick,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["places", "geometry"],
      })

      try {
        const google = await loader.load()

        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: viewport.latitude, lng: viewport.longitude },
            zoom: viewport.zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          })

          // Add event listeners
          mapInstance.addListener("center_changed", () => {
            const center = mapInstance.getCenter()
            if (center) {
              onViewportChange({
                latitude: center.lat(),
                longitude: center.lng(),
                zoom: mapInstance.getZoom() || viewport.zoom,
              })
            }
          })

          mapInstance.addListener("zoom_changed", () => {
            const center = mapInstance.getCenter()
            if (center) {
              onViewportChange({
                latitude: center.lat(),
                longitude: center.lng(),
                zoom: mapInstance.getZoom() || viewport.zoom,
              })
            }
          })

          setMap(mapInstance)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error)
        setIsLoading(false)
      }
    }

    initMap()
  }, [])

  // Update map center and zoom when viewport changes
  useEffect(() => {
    if (map) {
      map.setCenter({ lat: viewport.latitude, lng: viewport.longitude })
      map.setZoom(viewport.zoom)
    }
  }, [map, viewport])

  // Handle layer visibility changes
  useEffect(() => {
    if (map) {
      // This would integrate with your backend APIs to load/hide layers
      // For now, we'll simulate with console logs
      Object.entries(activeLayers).forEach(([layerName, isActive]) => {
        if (isActive) {
          console.log(`Loading layer: ${layerName} for year ${selectedYear}`)
          // Call appropriate API endpoint based on layer type
          // loadLayerData(layerName, selectedYear)
        } else {
          console.log(`Hiding layer: ${layerName}`)
          // hideLayerData(layerName)
        }
      })
    }
  }, [map, activeLayers, selectedYear])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div ref={mapRef} className="w-full h-full" />

      {/* Map overlay for real-time status */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Real-time data active</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
