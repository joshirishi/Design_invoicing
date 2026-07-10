"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wand2, CheckCircle2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackfillResult {
  total: number
  categorized: number
  aiCategorized: number
  stillUncategorized?: number
  suggestionsCreated: number
  aiRateLimited?: boolean
}

export function BackfillButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/categorize/backfill", { method: "POST" })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Backfill failed"); return }
      setResult(json)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <Button variant="outline" size="sm" onClick={run} disabled={running} title="Re-categorize every uncategorized transaction and regenerate invoice/purchase suggestions">
        {running ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
        {running ? "Re-categorizing…" : "Re-categorize all"}
      </Button>
      {result && (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span>
              {result.categorized} of {result.total} categorized ({result.aiCategorized} via AI) · {result.suggestionsCreated} new suggestion{result.suggestionsCreated === 1 ? "" : "s"}
            </span>
          </div>
          {result.aiRateLimited && (
            <span className="text-xs text-amber-600">
              AI rate-limited — re-run shortly to categorize remaining {result.stillUncategorized ?? 0}
            </span>
          )}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
