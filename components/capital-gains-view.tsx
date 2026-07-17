"use client"

import { useMemo, useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Link2 } from "lucide-react"
import type { BankAccount, CapitalGainEntry } from "@/lib/types"

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
  accounts,
}: {
  entries: CapitalGainEntry[]
  accounts: BankAccount[]
}) {
  const [entries, setEntries] = useState<CapitalGainEntry[]>(initial)
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState<string>(
    accounts.find((a) => a.account_type === "demat")?.id
      ? String(accounts.find((a) => a.account_type === "demat")!.id)
      : accounts[0]
        ? String(accounts[0].id)
        : "",
  )
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inserted: number; posted: number; financialYear: string | null } | null>(null)

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

  async function handleUpload() {
    if (!file) { setError("Select a Tax P&L file first"); return }
    setIsUploading(true); setError(null); setResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (accountId) formData.append("account_id", accountId)
      const res = await fetch("/api/investment-statements/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Upload failed"); return }
      setResult(json)
      setFile(null)
      const fresh = await fetchFromAPI("/api/capital-gains")
      setEntries(fresh)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Broker Tax P&L</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your broker's Tax P&L export (Zerodha-format XLS/XLSX) — Short Term and Long Term
            realized trades are ingested as capital gains, kept separate from business revenue.
          </p>

          {accounts.length > 1 && (
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="max-w-sm"><SelectValue placeholder="Which account?" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <label
            htmlFor="tax-pnl-upload"
            className="flex flex-col items-center justify-center gap-2 w-full min-h-[100px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-6 text-center"
          >
            {file ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Drop your Tax P&L export here</span>
                <span className="text-xs text-muted-foreground">XLS · XLSX</span>
              </>
            )}
            <input
              id="tax-pnl-upload"
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); setResult(null) }}
            />
          </label>

          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
          </Button>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          {result && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 border rounded-lg p-3 bg-muted/30">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.inserted} trade{result.inserted !== 1 ? "s" : ""} imported for FY{result.financialYear ?? "—"} · {result.posted} posted to your ledger
            </div>
          )}
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
