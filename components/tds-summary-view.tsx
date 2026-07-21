"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Loader2 } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"

interface SummaryRow { client_name: string; section: string; gross: number; tds: number; count: number }
interface FlaggedRow { id: string; client_name: string; payment_date: string; section: string; actualRate: number; expectedRate: number }

interface TdsSummary {
  summary: SummaryRow[]
  flagged: FlaggedRow[]
  totalTds: number
  totalGross: number
  paymentCount: number
}

function fmt(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TdsSummaryView() {
  const [data, setData] = useState<TdsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFromAPI("/api/tds-summary")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading TDS summary…</div>
  }

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-2 text-sm">
          <p className="font-medium">What is this?</p>
          <p className="text-muted-foreground">
            When a client pays you for professional services, they're often required to deduct TDS (Tax
            Deducted at Source) before paying you — the rest lands in your bank, and the deducted amount is
            already paid to the government on your behalf. This report totals what's been deducted so far,
            so you can reconcile it against <strong>Form 26AS</strong> (the government's own record of TDS
            credited to your PAN) at filing time — mismatches here are the kind of thing that delays a refund
            or triggers a notice if left unresolved.
          </p>
        </CardContent>
      </Card>

      {data && data.flagged.length > 0 && (
        <Card className="border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {data.flagged.length} payment{data.flagged.length !== 1 ? "s" : ""} with an unexpected TDS rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.flagged.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium">{f.client_name}</p>
                    <p className="text-xs text-muted-foreground">{f.payment_date} · Section {f.section}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">Deducted at {f.actualRate}%</p>
                    <p className="text-xs text-muted-foreground">Expected ~{f.expectedRate}%</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Not necessarily wrong — clients sometimes have a lower-deduction certificate, or apply a
              different rate for a company vs. an individual. Worth confirming with the client, not silently correcting.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">TDS Deducted by Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.summary.length ? (
            <p className="text-sm text-muted-foreground py-4">
              No TDS recorded yet. When you record a payment, mark whether the client deducted TDS —
              this report will fill in from there.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Client</th>
                    <th className="py-2 pr-2 font-medium">Section</th>
                    <th className="py-2 pr-2 font-medium text-right">Gross Amount</th>
                    <th className="py-2 pl-2 font-medium text-right">TDS Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.summary.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2 font-medium">{r.client_name}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className="text-xs font-normal">{r.section}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.gross)}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">{fmt(r.tds)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2 pr-2" colSpan={2}>Total</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{fmt(data.totalGross)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">{fmt(data.totalTds)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
