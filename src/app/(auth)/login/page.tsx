import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { getSafeNextPath } from "@/lib/auth/routes"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to WIT with Google.",
  robots: { index: false },
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams
  return <AuthCard intent="sign_in" next={getSafeNextPath(typeof next === "string" ? next : null)} />
}
