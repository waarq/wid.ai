import type { MetadataRoute } from "next"

import { siteUrl } from "@/components/marketing/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in product routes are not for crawlers.
        disallow: [
          "/my-calls",
          "/team-calls",
          "/playlist",
          "/alerts",
          "/deals",
          "/settings",
          "/profile",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
