"use client"

import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

const BARS = 28

/* Deterministic pseudo-random heights so the server and client agree. */
function barProfile(i: number): { peak: number; low: number; duration: number; delay: number } {
  const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  const b = Math.abs(Math.sin(i * 78.233) * 12345.6789) % 1
  return { peak: 0.45 + a * 0.55, low: 0.12 + b * 0.18, duration: 0.7 + b * 0.7, delay: a * 0.6 }
}

/**
 * Decorative "listening" waveform. Purely visual (no audio is analysed):
 * scaleY-only animation, flat while paused, static under reduced motion.
 */
export function Waveform({ active, className }: { active: boolean; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden className={cn("flex h-8 items-center gap-[3px]", className)}>
      {Array.from({ length: BARS }, (_, i) => {
        const p = barProfile(i)
        const animate = active && !reduce
        return (
          <motion.span
            key={i}
            className={cn("h-full w-[3px] origin-center rounded-full", active ? "bg-primary" : "bg-border-strong")}
            initial={false}
            animate={
              animate
                ? { scaleY: [p.low, p.peak, p.low * 1.4, p.peak * 0.8, p.low] }
                : { scaleY: active ? p.peak * 0.7 : 0.12 }
            }
            transition={
              animate
                ? { duration: p.duration * 1.6, delay: p.delay, repeat: Infinity, ease: "easeInOut" }
                : { type: "spring", stiffness: 260, damping: 26 }
            }
          />
        )
      })}
    </div>
  )
}
