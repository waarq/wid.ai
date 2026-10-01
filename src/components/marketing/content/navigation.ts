export interface NavItem {
  label: string
  href: string
}

/** Marketing navbar. Product and Solutions are real destinations on the features page. */
export const primaryNav: NavItem[] = [
  { label: "Product", href: "/features" },
  { label: "Solutions", href: "/features#built-for" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
]

export const authNav = {
  login: { label: "Log in", href: "/login" },
  register: { label: "Get started", href: "/register" },
} as const

export interface FooterColumn {
  title: string
  links: NavItem[]
}

export const footerColumns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]
