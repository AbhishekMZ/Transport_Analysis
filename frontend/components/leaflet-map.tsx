"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface LeafletMapProps {
  center: [number, number]
  zoom: number
  className?: string
  onMapReady?: (map: L.Map) => void
  children?: React.ReactNode
}

export default function LeafletMap({ center, zoom, className = "", onMapReady, children }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
    })

    // Add custom zoom control
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map)

    // Add tile layer with custom styling
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      className: "map-tiles",
    }).addTo(map)

    // Add some sample markers for Bangalore
    const bangaloreLocations = [
      { lat: 12.9716, lng: 77.5946, name: "City Center", type: "major" },
      { lat: 12.8456, lng: 77.6603, name: "Electronic City", type: "tech" },
      { lat: 12.9698, lng: 77.75, name: "Whitefield", type: "tech" },
      { lat: 12.9279, lng: 77.6271, name: "Koramangala", type: "commercial" },
      { lat: 12.9784, lng: 77.6408, name: "Indiranagar", type: "commercial" },
    ]

    bangaloreLocations.forEach((location) => {
      const color = location.type === "major" ? "#f97316" : location.type === "tech" ? "#14b8a6" : "#6366f1"

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      L.marker([location.lat, location.lng], { icon: customIcon })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-navy-900">${location.name}</h3>
            <p class="text-sm text-navy-600 capitalize">${location.type} Hub</p>
          </div>
        `)
        .addTo(map)
    })

    mapInstanceRef.current = map
    onMapReady?.(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom, onMapReady])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative ${className}`}
    >
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden shadow-lg" style={{ minHeight: "400px" }} />
      {children}
    </motion.div>
  )
}
