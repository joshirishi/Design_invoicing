"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { fetchFromAPI } from "@/lib/fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderOpen, Link2 } from "lucide-react"
import type { CapitalGainEntry } from "@/lib/types"

const TYPE_COLORS: Record<string, string> = {
  STCG: "bg-amber-50 text-amber-700 border-amber-200",
  LTCG: "bg-green-50 text-green-700 border-green-200",
}

interface UnmatchedTxn {
  id: string
  transaction_date: string
  description: string
  credit: number | null
  resolved_name: string | null
}

function formatINR(n: number): string {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CapitalGainsView({
  entries: initial,
}: {
  entries: CapitalGainEntry[]
}) {
  const [entries, setEntries] = useState<CapitalGainEntry[]>(initial)

  const [selectedFy, setSelectedFy] = useState<string>("all")
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [unmatchedTxns, setUnmatchedTxns] = useState<UnmatchedTxn[] | null>(null)

  const fyOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.financial_year).filter(Boolean))).sort().reverse() as string[], [entries])
  const filtered = useMemo(
    () => (selectedFy === "all" ? entries : entries.filter((e) => e.financial_year === selectedFy)),
    [entries, selectedFy],
  )

  const totals = filtered.reduce(
    (acc, e) => {
      if (e.gain_type === "STCG") acc.stcg += Number(e.gain_amount)
      else acc.ltcg += Number(e.gain_amount)
      return acc
    },
    { stcg: 0, ltcg: 0 },
  )

  async function openLink(entry: CapitalGainEntry) {
    setLinkingId(entry.id)
    setUnmatchedTxns(null)
    try {
      const res = await fetch("/api/bank-transactions?type=credits&limit=50")
      const json = await res.json()
      setUnmatchedTxns(json.transactions ?? [])
    } catch {
      setUnmatchedTxns([])
    }
  }

  async function handleLink(entryId: number, txnId: string | null) {
    try {
      const updated = await fetchFromAPI("/api/capital-gains", {
        method: "PUT",
        body: JSON.stringify({ id: entryId, linked_bank_transaction_id: txnId }),
      })
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setLinkingId(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Broker Tax P&L exports are uploaded from Documents now — this page shows what's been imported and
            lets you link each entry to the matching bank credit.
          </p>
          <Link href="/dashboard/documents">
            <Button variant="outline" size="sm" className="shrink-0 gap-2">
              <FolderOpen className="h-4 w-4" />
              Add a Tax P&L export
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Select value={selectedFy} onValueChange={setSelectedFy}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {fyOptions.map((fy) => <SelectItem key={fy} value={fy}>FY{fy}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className={TYPE_COLORS.STCG}>STCG ₹{formatINR(totals.stcg)}</Badge>
        <Badge variant="outline" className={TYPE_COLORS.LTCG}>LTCG ₹{formatINR(totals.ltcg)}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capital Gains</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No capital gains entries yet — upload a Tax P&L export above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Symbol</th>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium text-right">Cost Basis</th>
                    <th className="py-2 pr-2 font-medium text-right">Sale Value</th>
                    <th className="py-2 pr-2 font-medium text-right">Gain/Loss</th>
                    <th className="py-2 pl-2 font-medium">Bank Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-2 font-medium">{e.symbol}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[e.gain_type]}`}>{e.gain_type}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatINR(e.cost_basis)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatINR(e.sale_value)}</td>
                      <td className={`py-2 pr-2 text-right tabular-nums font-medium ${Number(e.gain_amount) >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {formatINR(e.gain_amount)}
                      </td>
                      <td className="py-2 pl-2">
                        {e.linked_bank_transaction_id ? (
                          <Badge variant="secondary" className="text-xs font-normal">Linked</Badge>
                        ) : linkingId === e.id ? (
                          <Select onValueChange={(v) => handleLink(e.id, v)}>
                            <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="Select transaction…" /></SelectTrigger>
                            <SelectContent>
                              {unmatchedTxns === null ? (
                                <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                              ) : unmatchedTxns.length === 0 ? (
                                <SelectItem value="__none__" disabled>No unmatched credits</SelectItem>
                              ) : (
                                unmatchedTxns.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.transaction_date} · ₹{formatINR(t.credit ?? 0)} · {t.resolved_name ? `${t.resolved_name} (${t.description.slice(0, 20)})` : t.description.slice(0, 30)}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openLink(e)}>
                            <Link2 className="h-3 w-3 mr-1" />Link
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
