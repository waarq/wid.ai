export interface Plan {
  id: string
  name: string
  audience: string
  summary: string
  features: string[]
  cta: { label: string; href: string }
}

/** No prices are invented. The page states that pricing is shown for demonstration. */
export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    audience: "For trying WIT",
    summary: "See what a meeting looks like once it is understood.",
    features: [
      "Manual capture",
      "Meeting brief with decisions and actions",
      "Searchable transcript",
      "Private by default",
    ],
    cta: { label: "Get started", href: "/register" },
  },
  {
    id: "starter",
    name: "Starter",
    audience: "For individuals",
    summary: "A personal meeting memory you can ask questions of.",
    features: [
      "Everything in Free",
      "Ask a meeting",
      "Follow-up email drafts",
      "Playlist of saved moments",
    ],
    cta: { label: "Get started", href: "/register" },
  },
  {
    id: "team",
    name: "Team",
    audience: "For growing teams",
    summary: "Shared context, with sharing you control.",
    features: [
      "Everything in Starter",
      "Team calls and sharing controls",
      "Alerts for mentions and changed decisions",
      "Deals workspace",
    ],
    cta: { label: "Talk to us", href: "/contact" },
  },
  {
    id: "business",
    name: "Business",
    audience: "For organizations",
    summary: "Administration and support for larger rollouts.",
    features: [
      "Everything in Team",
      "Admin and retention controls",
      "Priority support",
      "Guided onboarding",
    ],
    cta: { label: "Talk to us", href: "/contact" },
  },
]

export const pricingDisclaimer = "Pricing shown for product demonstration."
