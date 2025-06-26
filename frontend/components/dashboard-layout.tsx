"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Map, BarChart3, Activity, Zap, FileText, Settings, Menu, X, Sun, Moon, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const pathname = usePathname()

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: Map },
    { name: "Network Analysis", href: "/analysis", icon: BarChart3 },
    { name: "Real-time Traffic", href: "/traffic", icon: Activity },
    { name: "ML Forecasting", href: "/forecast", icon: Zap },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const sidebarVariants = {
    open: { width: "16rem" },
    closed: { width: "5rem" },
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  }

  return (
    <div className={cn("h-screen flex", darkMode && "dark")}>
      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={sidebarOpen ? "open" : "closed"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="transigenius-gradient text-white flex flex-col shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="p-4 border-b border-navy-700/50">
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-2xl font-heading font-bold bg-gradient-to-r from-orange-400 to-teal-400 bg-clip-text text-transparent">
                    TransiGenius
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-navy-700/50 transition-colors duration-200"
            >
              <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-2">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                    !sidebarOpen && "justify-center",
                    isActive
                      ? "bg-gradient-to-r from-orange-500/20 to-teal-500/20 text-white shadow-lg"
                      : "text-navy-200 hover:bg-navy-700/50 hover:text-white",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-teal-500/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                      isActive ? "text-orange-400" : "text-navy-300 group-hover:text-teal-400",
                    )}
                  />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 relative z-10"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </a>
              </motion.div>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="p-2 border-t border-navy-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "w-full text-white hover:bg-navy-700/50 transition-colors duration-200",
              sidebarOpen ? "justify-start" : "justify-center",
            )}
          >
            <motion.div animate={{ rotate: darkMode ? 180 : 0 }} transition={{ duration: 0.3 }}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="ml-3"
                >
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-navy-50 to-white dark:from-navy-950 dark:to-navy-900"
      >
        {children}
      </motion.div>
    </div>
  )
}
