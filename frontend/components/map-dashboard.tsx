"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import dynamic from 'next/dynamic'
import ControlPanel from "@/components/control-panel"
import FeatureInfoPanel from "@/components/feature-info-panel"
import AnalysisToolsPanel from "@/components/analysis-tools-panel"
import { AnimatedButton } from "@/components/ui/animated-button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import LoadingSpinner from "@/components/loading-spinner"

// Dynamically import the LeafletMap component with SSR disabled
const LeafletMap = dynamic(() => import('@/components/leaflet-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" />
})

export default function MapDashboard() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [activeLayers, setActiveLayers] = useState({
    roads: true,
    busStops: false,
    metroLines: false,
    criticalNodes: false,
    trafficFlow: true,
    incidents: true,
    forecast: false,
    simulation: false,
  })
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [toolsPanelOpen, setToolsPanelOpen] = useState(true)
  const [viewport, setViewport] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    zoom: 11,
  })

  const handleLayerToggle = useCallback((layerName: string) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }))
  }, [])

  const handleFeatureClick = useCallback((feature: any) => {
    setSelectedFeature(feature)
  }, [])

  return (
    <div className="flex-1 flex relative">
      {/* Control Panel */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-80 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm border-r border-navy-200 dark:border-navy-700 flex flex-col shadow-lg"
      >
        <ControlPanel
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
          viewport={viewport}
          onViewportChange={setViewport}
        />
      </motion.div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <LeafletMap
          center={[viewport.latitude, viewport.longitude]}
          zoom={viewport.zoom}
          className="w-full h-full"
          onMapReady={(map) => {
            console.log("Map ready:", map)
          }}
        >
          {/* Real-time Status Overlay */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-4 left-4 transigenius-card p-4 z-[1000]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse-glow"></div>
              <span className="text-sm font-semibold text-navy-900 dark:text-white">Real-time data active</span>
            </div>
            <div className="text-xs text-navy-600 dark:text-navy-300 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </motion.div>
        </LeafletMap>

        {/* Analysis Tools Panel Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="absolute top-4 right-4 z-[1000]"
        >
          <AnimatedButton
            variant="transigenius"
            size="sm"
            onClick={() => setToolsPanelOpen(!toolsPanelOpen)}
            className="shadow-lg"
          >
            {toolsPanelOpen ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronLeft className="h-4 w-4 mr-2" />}
            Analysis Tools
          </AnimatedButton>
        </motion.div>

        {/* Analysis Tools Panel */}
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{
            x: toolsPanelOpen ? 0 : 400,
            opacity: toolsPanelOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-16 right-4 w-96 transigenius-card max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar z-[1000]"
        >
          <AnalysisToolsPanel
            selectedYear={selectedYear}
            onAnalysisComplete={(results) => {
              console.log("Analysis results:", results)
            }}
          />
        </motion.div>
      </div>

      {/* Feature Info Panel */}
      {selectedFeature && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-80 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm border-l border-navy-200 dark:border-navy-700 shadow-lg"
        >
          <FeatureInfoPanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
        </motion.div>
      )}
    </div>
  )
}