import { ComingSoon } from "@/components/marketing/layout/coming-soon"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WIT Blog",
  description: "There are no posts on the WIT blog yet.",
  path: "/blog",
})

export default function BlogPage() {
  return (
    <ComingSoon
      eyebrow="Resources"
      title="No posts yet."
      description="We have not published anything on the blog. When we do, it will be about meetings, decisions and follow-through."
      heading="Nothing here yet"
      items={[
        "No articles have been published",
        "The product is shown as a demonstration",
        "Questions are welcome on the contact page",
      ]}
    />
  )
}
