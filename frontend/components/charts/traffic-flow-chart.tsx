"use client"

import { motion } from "framer-motion"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface TrafficFlowChartProps {
  data: Array<{
    time: string
    flow: number
    prediction?: number
  }>
  showPrediction?: boolean
}

export default function TrafficFlowChart({ data, showPrediction = false }: TrafficFlowChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" className="text-navy-600 dark:text-navy-300" fontSize={12} />
          <YAxis className="text-navy-600 dark:text-navy-300" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Area
            type="monotone"
            dataKey="flow"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#flowGradient)"
            name="Traffic Flow"
          />
          {showPrediction && (
            <Area
              type="monotone"
              dataKey="prediction"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#predictionGradient)"
              name="Prediction"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
