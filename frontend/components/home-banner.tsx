"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, MapPin, Zap, BarChart3, Users, Car, Bus, Activity } from "lucide-react"

const highlights = [
  "Real-time traffic monitoring across 2,800+ intersections",
  "AI-powered predictions with 94% accuracy up to 2 hours ahead",
  "Multi-modal transport integration for seamless mobility",
  "Smart city solutions reducing congestion by 23%",
]

const stats = [
  { label: "Active Vehicles", value: "2.8M+", icon: Car, color: "text-orange-500" },
  { label: "Bus Routes", value: "365", icon: Bus, color: "text-teal-500" },
  { label: "Daily Commuters", value: "12M+", icon: Users, color: "text-blue-500" },
  { label: "Network Uptime", value: "99.9%", icon: Activity, color: "text-green-500" },
]

export default function HomeBanner() {
  const [currentHighlight, setCurrentHighlight] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHighlight((prev) => (prev + 1) % highlights.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 bg-gradient-to-r from-orange-500/10 to-teal-500/10 rounded-full blur-xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h1
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-teal-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Welcome to
            <br />
            TransiGenius
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-navy-200 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Revolutionizing Bangalore's urban mobility with AI-powered traffic intelligence
          </motion.p>

          {/* Rotating Highlights */}
          <motion.div
            className="h-16 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
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
          </motion.div>
        </motion.div>

        {/* Live Network Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mb-16 flex justify-center"
        >
          <div className="relative">
            <svg width="400" height="200" viewBox="0 0 400 200" className="overflow-visible">
              {/* Network Connections */}
              <motion.path
                d="M50,100 Q200,50 350,100"
                stroke="url(#gradient1)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <motion.path
                d="M50,100 Q200,150 350,100"
                stroke="url(#gradient2)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
              />

              {/* Network Nodes */}
              {[
                { x: 50, y: 100, delay: 0 },
                { x: 200, y: 75, delay: 0.3 },
                { x: 200, y: 125, delay: 0.6 },
                { x: 350, y: 100, delay: 0.9 },
              ].map((node, i) => (
                <motion.circle
                  key={i}
                  cx={node.x}
                  cy={node.y}
                  r="8"
                  fill="url(#nodeGradient)"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: node.delay, duration: 0.6 }}
                >
                  <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                </motion.circle>
              ))}

              {/* Data Flow Particles */}
              {[...Array(3)].map((_, i) => (
                <motion.circle
                  key={`particle-${i}`}
                  r="3"
                  fill="#10b981"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    offsetDistance: ["0%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  style={{
                    offsetPath: i % 2 === 0 ? "path('M50,100 Q200,50 350,100')" : "path('M50,100 Q200,150 350,100')",
                  }}
                />
              ))}

              {/* Gradients */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
                <radialGradient id="nodeGradient">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </radialGradient>
              </defs>
            </svg>

            {/* Live Status Badge */}
            <motion.div
              className="absolute -top-4 -right-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Live Network
              </Badge>
            </motion.div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="bg-navy-800/50 border-navy-700/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <stat.icon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-navy-300">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {[
            {
              icon: MapPin,
              title: "Real-time Monitoring",
              description: "Track traffic patterns across 2,800+ intersections with 99.9% accuracy",
              color: "text-orange-500",
            },
            {
              icon: Zap,
              title: "AI Predictions",
              description: "Machine learning models predict traffic up to 2 hours ahead with 94% accuracy",
              color: "text-teal-500",
            },
            {
              icon: BarChart3,
              title: "Smart Analytics",
              description: "Advanced analytics processing 50TB+ of traffic data daily for insights",
              color: "text-blue-500",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 + index * 0.2, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card className="bg-navy-800/30 border-navy-700/30 backdrop-blur-sm h-full">
                <CardContent className="p-8">
                  <feature.icon className={`h-12 w-12 mb-4 ${feature.color}`} />
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-navy-300 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="text-center"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-teal-500 hover:from-orange-600 hover:to-teal-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300"
            asChild
          >
            <a href="/dashboard" className="inline-flex items-center">
              Explore Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
