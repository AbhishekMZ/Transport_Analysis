"use client"

import { motion } from "framer-motion"
import { Card, type CardProps } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AnimatedCardProps extends CardProps {
  delay?: number
  hover?: boolean
}

export function AnimatedCard({ children, className, delay = 0, hover = true, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={hover ? { y: -5, transition: { duration: 0.2 } } : undefined}
    >
      <Card
        className={cn(
          "transigenius-card transition-all duration-200",
          hover && "hover:shadow-xl hover:shadow-navy-200/20 dark:hover:shadow-navy-900/20",
          className,
        )}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  )
}
