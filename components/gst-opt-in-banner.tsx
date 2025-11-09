"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface GSTOptInBannerProps {
  onDismiss?: () => void
}

export function GSTOptInBanner({ onDismiss }: GSTOptInBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  const handleOptIn = () => {
    router.push("/dashboard/settings?tab=gst")
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950 dark:to-indigo-950">
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Enable GST Sync</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Connect to the GST portal to automatically sync your tax data. Track output GST, input GST credits, and
            reconcile your returns with actual filings.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleOptIn} size="sm" className="gap-2">
              Set Up GST Integration
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleOptIn} size="sm" variant="outline">
              Try Mock Data First
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-blue-600 dark:text-blue-400">
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
