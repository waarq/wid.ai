import type { ContactValues } from "./contact-schema"

export class ContactSubmitError extends Error {
  constructor() {
    super("We couldn’t send your message. Nothing was lost, so please try again.")
    this.name = "ContactSubmitError"
  }
}

/**
 * Mock submission. Nothing leaves the browser. Resolves after a short delay;
 * an address on the reserved `error.test` domain rejects so the error state can
 * be exercised. Replace the body with a real request when a backend exists.
 */
export async function submitContactMessage(values: ContactValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (values.email.toLowerCase().endsWith("@error.test")) throw new ContactSubmitError()
}
