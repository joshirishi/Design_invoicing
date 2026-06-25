import type React from "react"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <>{children}</>
}
