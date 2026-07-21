"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Info } from "lucide-react"

interface ReconRow { supplier_gstin: string; supplier_name: string | null; gstr2b_tax: number; purchases_tax: number; diff: number }
interface Reconciliation {
  period: string
  matched: ReconRow[]
  availableNotClaimed: ReconRow[]
  claimedNotInGstr2b: ReconRow[]
  purchasesMissingGstin: number
  totalGstr2bTax: number
  totalPurchasesTax: number
}

function fmt(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function monthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    out.push({ value: `${mm}${yyyy}`, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) })
  }
  return out
}

export function Gstr2bReconciliationView() {
  const options = monthOptions()
  const [period, setPeriod] = useState(options[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ imported: number } | null>(null)
  const [recon, setRecon] = useState<Reconciliation | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRecon = async (p: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gstr2b/reconciliation?period=${p}`)
      const json = await res.json()
      setRecon(res.ok ? json : null)
    } catch {
      setRecon(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) { setUploadError("Select the GSTR-2B JSON file first"); return }
    setIsUploading(true); setUploadError(null); setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/gstr2b/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) { setUploadError(json.error ?? "Upload failed"); return }
      setUploadResult(json)
      setFile(null)
      if (json.period) { setPeriod(json.period); fetchRecon(json.period) }
    } catch (e: any) {
      setUploadError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-2 text-sm">
          <p className="font-medium">What is this?</p>
          <p className="text-muted-foreground">
            GSTR-2B is the government's own record of what your suppliers say they sold you — auto-generated
            from their GSTR-1 filings, available by the <strong>14th</strong> of each month. It's the source
            of truth for how much Input Tax Credit (ITC) you're actually allowed to claim. If you've logged a
            purchase that your supplier hasn't reported yet, claiming that ITC risks a reversal later — this
            compares the two side by side, by supplier, so nothing gets missed or over-claimed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload GSTR-2B</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Download from gst.gov.in → Returns → GSTR-2B → Download <strong>JSON</strong> (not PDF or Excel —
            only the JSON has the structured data this needs).
          </p>
          <label
            htmlFor="gstr2b-upload"
            className="flex flex-col items-center justify-center gap-2 w-full min-h-[90px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-5 text-center"
          >
            {file ? (
              <><FileText className="h-6 w-6 text-primary" /><span className="text-sm font-medium">{file.name}</span></>
            ) : (
              <><Upload className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Drop the GSTR-2B JSON here</span></>
            )}
            <input
              id="gstr2b-upload"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(null); setUploadResult(null) }}
            />
          </label>
          <Button onClick={handleUpload} disabled={!file || isUploading} size="sm">
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
          </Button>
          {uploadError && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{uploadError}</span>
            </div>
          )}
          {uploadResult && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />{uploadResult.imported} line items imported
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Select value={period} onValueChange={(v) => { setPeriod(v); fetchRecon(v) }}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchRecon(period)} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          View Reconciliation
        </Button>
      </div>

      {recon && (
        <>
          {recon.purchasesMissingGstin > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 px-4 py-3 text-sm">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-blue-800 dark:text-blue-200">
                {recon.purchasesMissingGstin} purchase{recon.purchasesMissingGstin !== 1 ? "s" : ""} this month{" "}
                {recon.purchasesMissingGstin !== 1 ? "have" : "has"} no vendor GSTIN on file, so{" "}
                {recon.purchasesMissingGstin !== 1 ? "they" : "it"} can't be matched to a GSTR-2B supplier at all —
                add the GSTIN on the vendor record to include {recon.purchasesMissingGstin !== 1 ? "them" : "it"} here.
              </p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle2 className="h-4 w-4" />Matched ({recon.matched.length})</CardTitle></CardHeader>
            <CardContent>
              {recon.matched.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No suppliers matched this period.</p>
              ) : (
                <ReconTable rows={recon.matched} />
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-300">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-4 w-4" />ITC Available, Not Yet Claimed ({recon.availableNotClaimed.length})</CardTitle></CardHeader>
            <CardContent>
              {recon.availableNotClaimed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nothing here — you're not leaving credit on the table this period.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Your supplier reported these, but there's no matching Purchase logged — check if you missed entering a bill.</p>
                  <ReconTable rows={recon.availableNotClaimed} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-destructive/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Claimed, Not in Supplier's GSTR-2B ({recon.claimedNotInGstr2b.length})</CardTitle></CardHeader>
            <CardContent>
              {recon.claimedNotInGstr2b.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nothing here — no reversal risk this period.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">You've logged ITC your supplier hasn't reported yet — real if they're just late filing, but risky to claim until they do.</p>
                  <ReconTable rows={recon.claimedNotInGstr2b} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function ReconTable({ rows }: { rows: ReconRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Supplier</th>
            <th className="py-2 pr-2 font-medium">GSTIN</th>
            <th className="py-2 pr-2 font-medium text-right">GSTR-2B Tax</th>
            <th className="py-2 pl-2 font-medium text-right">Purchases Tax</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.supplier_gstin}>
              <td className="py-2 pr-2 font-medium">{r.supplier_name || "—"}</td>
              <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">{r.supplier_gstin}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.gstr2b_tax)}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{fmt(r.purchases_tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
