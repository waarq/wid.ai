import { z } from "zod"

/** "Use another account" in the Google account chooser. */
export const otherGoogleAccountSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your Google account email.")
    .max(254, "That email is too long.")
    .email("Enter a valid email, like name@company.com."),
})
export type OtherGoogleAccountValues = z.infer<typeof otherGoogleAccountSchema>
