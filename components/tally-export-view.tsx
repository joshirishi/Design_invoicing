"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Download, FileText, ShoppingBag, DollarSign, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface Summary {
  salesCount: number
  salesTotal: number
  purchasesCount: number
  purchasesTotal: number
  receiptsCount: number
  receiptsTotal: number
  totalVouchers: number
}

interface TallyExportViewProps {
  currentFY: string
  fyOptions: string[]
}

const VOUCHER_TYPES = [
  { id: "sales",     label: "Sales Vouchers",    icon: FileText,    desc: "From invoices" },
  { id: "purchases", label: "Purchase Vouchers",  icon: ShoppingBag, desc: "From purchase bills" },
  { id: "receipts",  label: "Receipt Vouchers",   icon: DollarSign,  desc: "From payments received" },
] as const

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

export function TallyExportView({ currentFY, fyOptions }: TallyExportViewProps) {
  const [fy, setFy]             = useState(currentFY)
  const [enabled, setEnabled]   = useState({ sales: true, purchases: true, receipts: true })
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)

  const activeTypes = Object.entries(enabled).filter(([, v]) => v).map(([k]) => k).join(",")

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummary(null)
    try {
      const res = await fetch(`/api/tally-export?fy=${encodeURIComponent(fy)}&types=${activeTypes}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load summary")
      setSummary(data.summary)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fy, activeTypes])

  useEffect(() => {
    loadSummary()
    setDownloaded(false)
  }, [loadSummary])

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch("/api/tally-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fy, types: activeTypes.split(",") }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Export failed")
      }

      // Trigger browser download
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const match = contentDisposition.match(/filename="([^"]+)"/)
      a.href     = url
      a.download = match?.[1] ?? `Tally_Export_${fy}.xml`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDownloaded(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const noTypes = !Object.values(enabled).some(Boolean)
  const noData  = summary?.totalVouchers === 0

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Config card ───────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Export Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          {/* FY selector */}
          <div className="space-y-1.5">
            <Label>Financial Year</Label>
            <Select value={fy} onValueChange={(v) => { setFy(v); setDownloaded(false) }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    FY {f} (Apr–Mar)
                    {f === currentFY && <span className="ml-2 text-xs text-muted-foreground">Current</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voucher type toggles */}
          <div className="space-y-1.5">
            <Label>Voucher Types</Label>
            <div className="space-y-3 pt-1">
              {VOUCHER_TYPES.map(({ id, label, icon: Icon, desc }) => (
                <div key={id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${enabled[id] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled[id]}
                    onCheckedChange={(v) => { setEnabled((e) => ({ ...e, [id]: v })); setDownloaded(false) }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary card ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Preview</CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : noTypes ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Enable at least one voucher type to preview.
            </p>
          ) : summary ? (
            <div className="space-y-3">
              {/* Three summary rows */}
              {[
                { key: "sales",     label: "Sales Vouchers",   icon: FileText,    count: summary.salesCount,     total: summary.salesTotal },
                { key: "purchases", label: "Purchase Vouchers", icon: ShoppingBag, count: summary.purchasesCount, total: summary.purchasesTotal },
                { key: "receipts",  label: "Receipt Vouchers",  icon: DollarSign,  count: summary.receiptsCount,  total: summary.receiptsTotal },
              ].map(({ key, label, icon: Icon, count, total }) => (
                enabled[key as keyof typeof enabled] && (
                  <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${count === 0 ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{fmt(total)}</span>
                      <Badge variant={count > 0 ? "secondary" : "outline"} className="tabular-nums">
                        {count} voucher{count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                )
              ))}

              <div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
                <span>Total vouchers</span>
                <Badge variant="default" className="text-sm px-3">{summary.totalVouchers}</Badge>
              </div>

              {noData && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No records found for FY {fy}. Add invoices or purchases first.
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Download button + instructions ───────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Button
            onClick={handleDownload}
            disabled={downloading || noTypes || noData || loading}
            className="w-full h-12 text-base gap-2"
            size="lg"
          >
            {downloading
              ? <><Loader2 className="h-5 w-5 animate-spin" />Generating XML…</>
              : downloaded
              ? <><CheckCircle2 className="h-5 w-5" />Download again</>
              : <><Download className="h-5 w-5" />Download Tally XML</>
            }
          </Button>

          {downloaded && (
            <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>XML downloaded. Import it into Tally Prime via <strong>Import Data → Vouchers</strong>. The file is ready to import as-is.</p>
            </div>
          )}

          {/* How-to instructions */}
          <div className="text-xs text-muted-foreground space-y-1.5 border rounded-lg p-3 bg-muted/30">
            <p className="font-medium text-sm text-foreground">How to import into Tally Prime</p>
            <ol className="list-decimal list-inside space-y-1 ml-0.5">
              <li>Open Tally Prime → select your company</li>
              <li>Go to <strong>Gateway of Tally → Import → Data</strong></li>
              <li>Select <strong>Vouchers</strong> as the import type</li>
              <li>Choose the downloaded XML file</li>
              <li>Click <strong>Import</strong> — vouchers appear instantly</li>
            </ol>
            <p className="pt-1 text-amber-700 bg-amber-50 rounded px-2 py-1">
              Tip: Import into a test company first to verify before importing into your live company.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
