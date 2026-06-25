import type React from "react"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"
import { DashboardLayout } from "@/components/dashboard-layout"

// Auth guard + sidebar wrapper for ALL dashboard pages.
// By putting DashboardLayout here, individual pages don't need to import it.
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
