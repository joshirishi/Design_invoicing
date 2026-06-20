import type React from "react"
import { checkAuth } from "@/lib/check-auth"

// This server component runs checkAuth() before rendering any dashboard page.
// If the user is not authenticated or not the allowed email, checkAuth() calls
// Next.js redirect() which sends them to /auth/login automatically.
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  await checkAuth()
  return <>{children}</>
}
