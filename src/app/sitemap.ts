import type { MetadataRoute } from "next"

import { siteUrl } from "@/components/marketing/seo"

const routes = [
  { path: "/", priority: 1 },
  { path: "/features", priority: 0.9 },
  { path: "/how-it-works", priority: 0.9 },
  { path: "/pricing", priority: 0.8 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
  { path: "/help", priority: 0.4 },
  { path: "/docs", priority: 0.3 },
  { path: "/blog", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, priority }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority,
  }))
}
