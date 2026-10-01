import type { Metadata } from "next"

const SITE_NAME = "WIT"

export const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

interface PageMeta {
  /** Exact document title, e.g. "WIT Features". */
  title: string
  description: string
  /** Path used for the canonical URL and OpenGraph url, e.g. "/features". */
  path: string
}

/**
 * Per-page metadata. Titles are absolute so they do not pick up the root title
 * template. Canonical and OpenGraph URLs resolve against `metadataBase` in the
 * root layout. OpenGraph is re-declared because a page-level value replaces the root one.
 */
export function createMetadata({ title, description, path }: PageMeta): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description,
      url: path,
    },
    twitter: { card: "summary_large_image", title, description },
  }
}
