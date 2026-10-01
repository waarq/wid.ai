import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { getSafeNextPath } from "@/lib/auth/routes"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create your WID account with Google.",
  robots: { index: false },
}

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams
  return <AuthCard intent="register" next={getSafeNextPath(typeof next === "string" ? next : null)} />
}
