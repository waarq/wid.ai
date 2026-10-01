import { z } from "zod"

import { EMAIL_TYPES, JOB_FUNCTIONS } from "@/types"

/** Shared by the Profile screen and Settings > General, which mirror each other. */
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60, "Keep your first name under 60 characters."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60, "Keep your last name under 60 characters."),
  timezone: z.string().min(1, "Choose your timezone."),
  jobFunction: z.enum(JOB_FUNCTIONS, { errorMap: () => ({ message: "Choose the job function closest to yours." }) }),
  emailType: z.enum(EMAIL_TYPES, { errorMap: () => ({ message: "Tell us which kind of email you use." }) }),
})
export type ProfileValues = z.infer<typeof profileSchema>
