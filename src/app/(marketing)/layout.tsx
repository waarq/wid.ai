import { MarketingFooter } from "@/components/marketing/layout/marketing-footer"
import { MarketingNavbar } from "@/components/marketing/layout/marketing-navbar"

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only fixed top-3 left-3 z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Skip to content
      </a>
      <MarketingNavbar />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
