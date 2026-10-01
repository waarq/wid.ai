"use client"

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

/** Gentle entrance for the hero preview. Transform and opacity only; static for reduced motion. */
export function HeroMotion({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.1 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
