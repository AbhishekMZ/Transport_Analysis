"use client"

import { motion } from "framer-motion"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends ButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "transigenius"
    | "transigenius-secondary"
}

export function AnimatedButton({ children, className, variant = "default", ...props }: AnimatedButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "transigenius":
        return "transigenius-button"
      case "transigenius-secondary":
        return "transigenius-button-secondary"
      default:
        return ""
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        className={cn(getVariantClasses(), "transition-all duration-200", className)}
        variant={variant === "transigenius" || variant === "transigenius-secondary" ? "default" : variant}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}
