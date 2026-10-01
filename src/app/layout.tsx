import type { Metadata, Viewport } from "next"

import { AppProviders } from "@/components/providers/app-providers"
import { fontMono, fontSans } from "@/lib/fonts"

import "./globals.css"

const TITLE = "WID — AI Meeting Intelligence"
const DESCRIPTION =
  "WID turns meetings into clear notes, decisions, action items and searchable knowledge."

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: { default: TITLE, template: "%s — WID" },
  description: DESCRIPTION,
  applicationName: "WID",
  openGraph: {
    type: "website",
    siteName: "WID",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#101210" },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <body className="min-h-dvh">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
