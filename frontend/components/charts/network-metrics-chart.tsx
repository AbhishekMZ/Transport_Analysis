"use client"

import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface NetworkMetricsChartProps {
  data: Array<{
    name: string
    value: number
    category: string
  }>
}

export default function NetworkMetricsChart({ data }: NetworkMetricsChartProps) {
  const getBarColor = (category: string) => {
    switch (category) {
      case "critical":
        return "#f97316"
      case "moderate":
        return "#14b8a6"
      case "low":
        return "#6366f1"
      default:
        return "#94a3b8"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="name"
            className="text-navy-600 dark:text-navy-300"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis className="text-navy-600 dark:text-navy-300" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
