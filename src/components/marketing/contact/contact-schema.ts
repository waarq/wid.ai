import { z } from "zod"

export const contactTopics = [
  { value: "sales", label: "Sales and plans" },
  { value: "support", label: "Help with the demo" },
  { value: "partnerships", label: "Partnerships" },
  { value: "other", label: "Something else" },
] as const

const topicValues = contactTopics.map((t) => t.value) as [
  (typeof contactTopics)[number]["value"],
  ...(typeof contactTopics)[number]["value"][],
]

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Keep your name under 80 characters."),
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  topic: z.enum(topicValues, { errorMap: () => ({ message: "Choose a topic." }) }),
  message: z
    .string()
    .trim()
    .min(10, "Write at least a sentence so we can help.")
    .max(2000, "Keep your message under 2,000 characters."),
})

export type ContactValues = z.infer<typeof contactSchema>
