"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"

// Stack Auth is not yet configured — redirect straight to dashboard.
// When NEXT_PUBLIC_STACK_PROJECT_ID is added to env vars, replace this
// with StackProvider + SignIn from @stackframe/stack.
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <FileText className="h-10 w-10 animate-pulse" />
        <p className="text-sm">Loading InvoiceFlow…</p>
      </div>
    </div>
  )
}
