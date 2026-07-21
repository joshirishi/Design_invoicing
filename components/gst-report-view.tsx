"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gstr2bReconciliationView } from "@/components/gstr2b-reconciliation-view"
import { fetchFromAPI } from "@/lib/fetch"
import { Calendar, TrendingUp, TrendingDown, ArrowRight, Download, ExternalLink, Loader2, Info, X } from "lucide-react"

interface OutputRow { month: string; total_gst_collected: string; total_cgst: string; total_sgst: string; total_igst: string; total_invoiced: string; invoice_count: string }
interface ReconRow { month: string; total_received: string; gst_on_received: string; payment_count: string }
interface B2BRow { month: string; client_name: string | null; client_gstin: string | null; place_of_supply: string | null; taxable_value: string; cgst_amount: string; sgst_amount: string; igst_amount: string }
interface HsnRow { hsn_code: string; total_qty: string; taxable_value: string; cgst: string; sgst: string; igst: string; invoice_count: number }
interface Purchase { id: string; vendor_name: string; invoice_date: string; amount: string; cgst: string; sgst: string; igst: string }

interface GSTReport {
  outputGST: OutputRow[]
  reconciledPayments: ReconRow[]
  b2bBreakdown: B2BRow[]
  hsnSummary: HsnRow[]
  summary: {
    totalOutputGST: number
    totalReconciledGST: number
    unreconciledGST: number
    reconciledPercentage: number
    outputByHead: { cgst: number; sgst: number; igst: number }
    inputByHead: { cgst: number; sgst: number; igst: number }
    netByHead: { cgst: number; sgst: number; igst: number }
  }
}

function fmt(v: string | number) {
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function GSTReportView() {
  const currentYear = new Date().getFullYear()
  const [report, setReport] = useState<GSTReport | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-03-31`)
  const [igstNoteDismissed, setIgstNoteDismissed] = useState(true)

  useEffect(() => {
    setIgstNoteDismissed(localStorage.getItem("gst-igst-note-dismissed") === "1")
  }, [])

  const dismissIgstNote = () => {
    localStorage.setItem("gst-igst-note-dismissed", "1")
    setIgstNoteDismissed(true)
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const [rpt, purList] = await Promise.all([
        fetchFromAPI(`/api/gst-report?startDate=${startDate}&endDate=${endDate}`),
        fetchFromAPI(`/api/purchases`),
      ])
      setReport(rpt)
      setPurchases(purList)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalInputGST = purchases.reduce((s, p) => s + Number(p.cgst) + Number(p.sgst) + Number(p.igst), 0)
  const netGSTPayable = (report?.summary.totalOutputGST || 0) - totalInputGST
  const totalTaxableValue = (report?.outputGST || []).reduce((s, r) => s + (Number(r.total_invoiced) - Number(r.total_gst_collected)), 0)

  const exportGSTR1 = () => {
    if (!report) return
    const gstr1 = {
      gstin: "", // Will be filled from profile
      fp: endDate.slice(0, 7).replace("-", ""), // MMYYYY
      b2b: report.b2bBreakdown.map((row) => ({
        pos: row.place_of_supply || "",
        typ: "Regular",
        sply_ty: Number(row.igst_amount) > 0 ? "INTER" : "INTRA",
        client_name: row.client_name,
        client_gstin: row.client_gstin,
        month: fmtMonth(row.month),
        txval: Number(row.taxable_value),
        cgst: Number(row.cgst_amount),
        sgst: Number(row.sgst_amount),
        igst: Number(row.igst_amount),
      })),
      hsn: report.hsnSummary.map((row) => ({
        hsn_sc: row.hsn_code,
        qty: Number(row.total_qty),
        txval: Number(row.taxable_value),
        cgst: Number(row.cgst),
        sgst: Number(row.sgst),
        igst: Number(row.igst),
      })),
      _meta: { generated_at: new Date().toISOString(), invoice_count: report.outputGST.reduce((s, r) => s + Number(r.invoice_count), 0) },
      _note: "This JSON mirrors the data GSTR-1 asks for, but is not verified against the GST portal's offline-tool import schema. Use the B2B and HSN CSV exports below to paste values into the portal, or as a reference while filling it in by hand.",
    }
    const blob = new Blob([JSON.stringify(gstr1, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `GSTR1_${startDate}_${endDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportB2BCsv = () => {
    if (!report) return
    downloadCsv(
      `GSTR1_B2B_${startDate}_${endDate}.csv`,
      ["Month", "Client Name", "Client GSTIN", "Place of Supply", "Taxable Value", "CGST", "SGST", "IGST"],
      report.b2bBreakdown.map((r) => [fmtMonth(r.month), r.client_name || "", r.client_gstin || "", r.place_of_supply || "", r.taxable_value, r.cgst_amount, r.sgst_amount, r.igst_amount]),
    )
  }

  const exportHsnCsv = () => {
    if (!report) return
    downloadCsv(
      `GSTR1_HSN_Summary_${startDate}_${endDate}.csv`,
      ["HSN Code", "Total Quantity", "Taxable Value", "CGST", "SGST", "IGST", "Invoice Count"],
      report.hsnSummary.map((r) => [r.hsn_code, r.total_qty, r.taxable_value, r.cgst, r.sgst, r.igst, r.invoice_count]),
    )
  }

  const exportGSTR3B = () => {
    if (!report) return
    const gstr3b = {
      period: `${startDate} to ${endDate}`,
      "3_1a_outward_taxable_supplies": {
        taxable_value: totalTaxableValue,
        igst: report.summary.outputByHead.igst,
        cgst: report.summary.outputByHead.cgst,
        sgst: report.summary.outputByHead.sgst,
      },
      "4A_itc_available": {
        igst: report.summary.inputByHead.igst,
        cgst: report.summary.inputByHead.cgst,
        sgst: report.summary.inputByHead.sgst,
      },
      net_tax_payable_by_head: report.summary.netByHead,
      net_tax_payable_overall: Math.max(0, netGSTPayable),
      tax_credit_excess_overall: netGSTPayable < 0 ? Math.abs(netGSTPayable) : 0,
      _note: "Net-per-head figures are a simple subtraction (Output − Input) per tax head. Real GSTR-3B cross-utilization rules (IGST credit can offset CGST/SGST liability, but CGST credit cannot offset SGST liability and vice versa) are NOT modeled here — verify the offset order before filing.",
      _generated: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(gstr3b, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `GSTR3B_Summary_${startDate}_${endDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading GST report…</div>
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Report Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={fetchReport}>Generate</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            GSTR-1 and GSTR-3B are filed monthly — set this to a single calendar month before exporting for filing.
            The wider default range above is useful for a general GST health check, not for an actual return.
          </p>
        </CardContent>
      </Card>

      {/* One-time note: IGST is now included in the totals below */}
      {!igstNoteDismissed && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 px-4 py-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="flex-1 text-blue-800 dark:text-blue-200">
            Updated calculation — GST totals now correctly include IGST for inter-state invoices.
            If you have inter-state clients, the numbers below may be higher than before.
          </p>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" onClick={dismissIgstNote}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="gstr1">GSTR-1 (Outward Supplies)</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B (Filing Summary)</TabsTrigger>
          <TabsTrigger value="itc-reconciliation">ITC Reconciliation</TabsTrigger>
        </TabsList>

        {/* ── Summary tab — existing quick-glance content ─────────────────── */}
        <TabsContent value="summary" className="pt-4 space-y-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Quick Net Payable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Output GST (from invoices)</span>
                  </div>
                  <span className="font-bold text-red-600">{fmt(report?.summary.totalOutputGST || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Input GST Credit (from purchases)</span>
                  </div>
                  <span className="font-bold text-green-600">− {fmt(totalInputGST)}</span>
                </div>
                <div className="flex justify-between items-center py-3 rounded-lg bg-primary/5 px-4">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base">Net Tax Payable to Govt</span>
                  </div>
                  <span className={`text-xl font-bold ${netGSTPayable >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {netGSTPayable >= 0 ? fmt(netGSTPayable) : `Credit: ${fmt(Math.abs(netGSTPayable))}`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This is a rough same-period estimate. See the GSTR-3B tab for the per-tax-head breakdown
                the actual filing form requires.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Output GST</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{fmt(report?.summary.totalOutputGST || 0)}</p>
                <p className="text-xs text-muted-foreground">On {report?.outputGST.reduce((s, r) => s + Number(r.invoice_count), 0)} invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Input GST Credit</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{fmt(totalInputGST)}</p>
                <p className="text-xs text-muted-foreground">On {purchases.length} purchases</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">GST Received</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{fmt(report?.summary.totalReconciledGST || 0)}</p>
                <p className="text-xs text-muted-foreground">Via reconciled payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(report?.summary.reconciledPercentage || 0).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Of invoiced GST received</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Output GST — Monthly Breakdown</CardTitle></CardHeader>
              <CardContent>
                {!report?.outputGST.length ? (
                  <p className="text-sm text-muted-foreground py-4">No invoices in this period.</p>
                ) : (
                  <div className="space-y-3">
                    {report.outputGST.map((row) => (
                      <div key={row.month} className="flex items-center justify-between pb-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{fmtMonth(row.month)}</p>
                          <p className="text-xs text-muted-foreground">{row.invoice_count} invoices · Invoiced: {fmt(row.total_invoiced)}</p>
                          <p className="text-xs text-muted-foreground">CGST: {fmt(row.total_cgst)} · SGST: {fmt(row.total_sgst)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{fmt(row.total_gst_collected)}</p>
                          <p className="text-xs text-muted-foreground">total GST</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Input GST Credit — Purchases</CardTitle></CardHeader>
              <CardContent>
                {!purchases.length ? (
                  <p className="text-sm text-muted-foreground py-4">No purchases logged. <a href="/dashboard/purchases" className="underline text-primary">Add purchases</a> to claim input credit.</p>
                ) : (
                  <div className="space-y-3">
                    {purchases.slice(0, 8).map((p) => (
                      <div key={p.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{p.vendor_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.invoice_date).toLocaleDateString("en-IN")} · {fmt(p.amount)} (excl.)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{fmt(Number(p.cgst) + Number(p.sgst) + Number(p.igst))}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">input GST</Badge>
                        </div>
                      </div>
                    ))}
                    {purchases.length > 8 && <p className="text-xs text-muted-foreground text-center">+{purchases.length - 8} more — <a href="/dashboard/purchases" className="underline">view all</a></p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── GSTR-1 tab ────────────────────────────────────────────────── */}
        <TabsContent value="gstr1" className="pt-4 space-y-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6 space-y-2 text-sm">
              <p className="font-medium">What is GSTR-1?</p>
              <p className="text-muted-foreground">
                GSTR-1 is the monthly return where you report every sale you made — due the <strong>11th</strong>{" "}
                of the following month. It's split into two parts below: which client you billed and how much
                tax (Table 4, for B2B/registered clients), and what you sold grouped by HSN code — the standard
                classification code for goods/services (Table 12). Your CA or the GST portal uses these exact
                numbers; nothing here is estimated.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">B2B Invoices (Table 4)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">One row per client, place of supply, and month — this is what determines whether CGST+SGST or IGST applies.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportB2BCsv} disabled={!report?.b2bBreakdown.length}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {!report?.b2bBreakdown.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  No B2B invoices in this period — this table only includes clients with a GSTIN on file.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Client</th>
                        <th className="py-2 pr-2 font-medium">GSTIN</th>
                        <th className="py-2 pr-2 font-medium">Place of Supply</th>
                        <th className="py-2 pr-2 font-medium text-right">Taxable Value</th>
                        <th className="py-2 pr-2 font-medium text-right">CGST</th>
                        <th className="py-2 pr-2 font-medium text-right">SGST</th>
                        <th className="py-2 pl-2 font-medium text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.b2bBreakdown.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-2 font-medium">{r.client_name || "—"}</td>
                          <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">{r.client_gstin || "—"}</td>
                          <td className="py-2 pr-2">{r.place_of_supply || "—"}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.taxable_value)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.cgst_amount)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.sgst_amount)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{fmt(r.igst_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">HSN Summary (Table 12)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Every sale grouped by HSN/SAC code — required regardless of whether the buyer is registered for GST.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportHsnCsv} disabled={!report?.hsnSummary.length}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {!report?.hsnSummary.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  No invoices with an HSN code in this period — HSN is set per line item (or per invoice) when you create it.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">HSN/SAC Code</th>
                        <th className="py-2 pr-2 font-medium text-right">Quantity</th>
                        <th className="py-2 pr-2 font-medium text-right">Taxable Value</th>
                        <th className="py-2 pr-2 font-medium text-right">CGST</th>
                        <th className="py-2 pr-2 font-medium text-right">SGST</th>
                        <th className="py-2 pl-2 font-medium text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.hsnSummary.map((r) => (
                        <tr key={r.hsn_code}>
                          <td className="py-2 pr-2 font-mono">{r.hsn_code}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{r.total_qty}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.taxable_value)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.cgst)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.sgst)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{fmt(r.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportGSTR1}>
              <Download className="h-4 w-4 mr-2" />
              Export Combined JSON
            </Button>
            <Button variant="outline" onClick={() => window.open("https://www.gst.gov.in", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open GST Portal
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The CSV exports above use the exact columns GSTR-1 asks for — use those to paste into the portal's
            web form. The combined JSON mirrors the same data but hasn't been verified against the portal's
            offline-tool import schema, so treat it as a reference file, not a guaranteed upload format.
          </p>
        </TabsContent>

        {/* ── GSTR-3B tab ───────────────────────────────────────────────── */}
        <TabsContent value="gstr3b" className="pt-4 space-y-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6 space-y-2 text-sm">
              <p className="font-medium">What is GSTR-3B?</p>
              <p className="text-muted-foreground">
                GSTR-3B is the monthly summary return where you actually pay — due the <strong>20th</strong> of
                the following month, after GSTR-1 (11th) and before GSTR-2B becomes available (14th). Unlike
                GSTR-1's invoice-level detail, this is just totals: what you owe (Table 3.1) minus what you can
                claim back from GST you already paid on business purchases (Table 4A) — and critically, GST law
                keeps IGST, CGST, and SGST as separate "buckets" that don't fully net against each other, which
                is why the numbers below are split by tax head instead of one single figure.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3.1(a) — Outward Taxable Supplies</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Taxable Value</p><p className="font-bold">{fmt(totalTaxableValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">IGST</p><p className="font-bold text-red-600">{fmt(report?.summary.outputByHead.igst || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">CGST</p><p className="font-bold text-red-600">{fmt(report?.summary.outputByHead.cgst || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">SGST</p><p className="font-bold text-red-600">{fmt(report?.summary.outputByHead.sgst || 0)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">4(A) — ITC Available</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">IGST</p><p className="font-bold text-green-600">{fmt(report?.summary.inputByHead.igst || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">CGST</p><p className="font-bold text-green-600">{fmt(report?.summary.inputByHead.cgst || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">SGST</p><p className="font-bold text-green-600">{fmt(report?.summary.inputByHead.sgst || 0)}</p></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                From your logged purchases. This assumes every rupee of input GST is eligible to claim — GST law
                excludes some categories (e.g. motor vehicles, personal expenses); that filtering isn't applied here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader><CardTitle className="text-base">Net Tax Payable, Per Head</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                {(["igst", "cgst", "sgst"] as const).map((head) => {
                  const val = report?.summary.netByHead[head] || 0
                  return (
                    <div key={head} className="rounded-lg bg-primary/5 px-3 py-2">
                      <p className="text-xs text-muted-foreground uppercase">{head}</p>
                      <p className={`font-bold ${val >= 0 ? "text-red-600" : "text-green-600"}`}>
                        {val >= 0 ? fmt(val) : `Credit: ${fmt(Math.abs(val))}`}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 px-3 py-2 text-xs">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-800 dark:text-amber-200">
                  Each figure above is a simple Output − Input subtraction within its own tax head. Real GSTR-3B
                  offset rules let IGST credit cover CGST or SGST liability (in a specific order), but CGST credit
                  can never offset SGST liability or vice versa. If any head above shows a credit while another
                  shows a payable, check the actual offset order before filing — don't just sum these three.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportGSTR3B}>
              <Download className="h-4 w-4 mr-2" />
              Export GSTR-3B JSON
            </Button>
            <Button variant="outline" onClick={() => window.open("https://www.gst.gov.in", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open GST Portal
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="itc-reconciliation" className="pt-4">
          <Gstr2bReconciliationView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
