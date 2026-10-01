import type { Tag } from "@/types"

export const tagCatalog = {
  planning: { id: "tag_planning", label: "Planning", tone: "accent" },
  launch: { id: "tag_launch", label: "Launch", tone: "accent" },
  beta: { id: "tag_beta", label: "Beta", tone: "accent" },
  engineering: { id: "tag_engineering", label: "Engineering", tone: "neutral" },
  client: { id: "tag_client", label: "Client", tone: "info" },
  sales: { id: "tag_sales", label: "Sales", tone: "info" },
  pricing: { id: "tag_pricing", label: "Pricing", tone: "warning" },
  research: { id: "tag_research", label: "Research", tone: "neutral" },
  design: { id: "tag_design", label: "Design", tone: "neutral" },
  leadership: { id: "tag_leadership", label: "Leadership", tone: "neutral" },
  oneOnOne: { id: "tag_one_on_one", label: "1:1", tone: "neutral" },
  sprint: { id: "tag_sprint", label: "Sprint", tone: "neutral" },
  risk: { id: "tag_risk", label: "Risk", tone: "danger" },
} as const satisfies Record<string, Tag>

export type TagKey = keyof typeof tagCatalog

export const tags: Tag[] = Object.values(tagCatalog)
