import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

/*
 * Access is routed by src/proxy.ts (unauthenticated -> /login,
 * completed -> /my-calls). That is UX only; the backend authorizes.
 */
export default function OnboardingPage() {
  return <OnboardingFlow />
}
