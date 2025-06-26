"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, Zap, BarChart3, Activity, TrendingUp, Play, Pause } from "lucide-react"

const highlights = [
  "Real-time traffic monitoring across 2,800+ intersections",
  "AI-powered predictions with 94% accuracy up to 2 hours ahead",
  "Multi-modal transport integration for seamless mobility",
  "Smart city solutions reducing congestion by 23%",
]

const liveMetrics = [
  { label: "Current Traffic Flow", value: 87, unit: "%", trend: "up", color: "text-green-500" },
  { label: "Active Incidents", value: 12, unit: "", trend: "down", color: "text-orange-500" },
  { label: "Network Efficiency", value: 94, unit: "%", trend: "up", color: "text-blue-500" },
  { label: "Response Time", value: 2.3, unit: "min", trend: "down", color: "text-teal-500" },
]

const quickActions = [
  { title: "View Live Traffic", href: "/traffic", icon: Activity, color: "bg-red-500" },
  { title: "Network Analysis", href: "/analysis", icon: BarChart3, color: "bg-blue-500" },
  { title: "AI Forecasting", href: "/forecast", icon: Zap, color: "bg-purple-500" },
  { title: "Generate Report", href: "/reports", icon: TrendingUp, color: "bg-green-500" },
]

export default function HomeBannerImproved() {
  const [currentHighlight, setCurrentHighlight] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentHighlight((prev) => (prev + 1) % highlights.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
      {/* Enhanced Background with Interactive Elements */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 bg-gradient-to-r from-orange-500/10 to-teal-500/10 rounded-full blur-xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + i * 10}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Live Status Bar */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="bg-navy-800/50 border-navy-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                    System Online
                  </Badge>
                  <span className="text-navy-300 text-sm">Last updated: {currentTime.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-navy-300 hover:text-white"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Header with Interactive Elements */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-teal-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Welcome to TransiGenius
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-navy-200 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            AI-Powered Urban Mobility Intelligence for Bangalore
          </motion.p>

          {/* Interactive Highlights with Controls */}
          <motion.div
            className="relative h-20 flex items-center justify-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={currentHighlight}
                className="text-lg text-teal-300 max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {highlights[currentHighlight]}
              </motion.p>
            </AnimatePresence>

            {/* Highlight Navigation Dots */}
            <div className="absolute bottom-0 flex gap-2">
              {highlights.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHighlight(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentHighlight ? "bg-teal-400" : "bg-navy-600"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Live Metrics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Live Network Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {liveMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="bg-navy-800/50 border-navy-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-navy-300">{metric.label}</span>
                      <TrendingUp className={`h-4 w-4 ${metric.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {metric.value}
                      {metric.unit}
                    </div>
                    {metric.label.includes("Flow") || metric.label.includes("Efficiency") ? (
                      <Progress value={metric.value} className="h-2" />
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card className="bg-navy-800/50 border-navy-700/50 backdrop-blur-sm hover:bg-navy-700/50 transition-all cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div
                      className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-3`}
                    >
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold">{action.title}</h3>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced CTA with Multiple Options */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-teal-500 hover:from-orange-600 hover:to-teal-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300"
              asChild
            >
              <a href="/dashboard" className="inline-flex items-center">
                Launch Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-navy-900 px-8 py-4 text-lg font-semibold rounded-xl"
              asChild
            >
              <a href="/traffic">View Live Traffic</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
