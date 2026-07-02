"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2,
  Image as ImageIcon, FileSearch, Pencil,
} from "lucide-react"
import { useRouter } from "next/navigation"

// ── GST options ───────────────────────────────────────────
const GST_OPTIONS = [0, 5, 12, 18, 28]

// ── Types ─────────────────────────────────────────────────
interface ImportResult {
  inserted: number; skipped: number; total: number
  parseErrors?: Array<{ line: number; message: string }>
}

interface OcrLineItem {
  description: string; hsn_code: string | null; quantity: number; rate: number; gst_rate: number
}

interface OcrData {
  invoice_number: string | null; client_name: string | null; client_gstin: string | null
  invoice_date: string | null; line_items: OcrLineItem[]
  cgst_rate: number | null; sgst_rate: number | null; total_amount: number | null; terms: string | null
}

type TabKey = "csv" | "image"

// ── Main component ────────────────────────────────────────
export function InvoiceImportModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>("csv")

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvResult, setCsvResult] = useState<ImportResult | null>(null)

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrScanning, setOcrScanning] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrData, setOcrData] = useState<OcrData | null>(null)
  const [ocrSaving, setOcrSaving] = useState(false)
  const [ocrSaved, setOcrSaved] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setCsvFile(null); setCsvError(null); setCsvResult(null)
      setOcrFile(null); setOcrError(null); setOcrData(null); setOcrSaved(false)
    }
  }

  // ── CSV import ──────────────────────────────────────────
  const handleCsvImport = async () => {
    if (!csvFile) { setCsvError("Please select a CSV file"); return }
    setCsvUploading(true); setCsvError(null)
    try {
      const fd = new FormData(); fd.append("file", csvFile)
      const res = await fetch("/api/invoices/import", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { setCsvError(json.error ?? "Import failed"); return }
      setCsvResult(json); setCsvFile(null)
      router.refresh()
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setCsvUploading(false)
    }
  }

  // ── OCR scan ────────────────────────────────────────────
  const handleOcrScan = async () => {
    if (!ocrFile) { setOcrError("Please select a file"); return }
    setOcrScanning(true); setOcrError(null); setOcrData(null)
    try {
      const fd = new FormData(); fd.append("file", ocrFile)
      const res = await fetch("/api/invoices/ocr", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { setOcrError(json.detail || json.error || "Scan failed"); return }
      setOcrData(json.data as OcrData)
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setOcrScanning(false)
    }
  }

  // ── Save OCR'd invoice ──────────────────────────────────
  const handleOcrSave = async () => {
    if (!ocrData) return
    setOcrSaving(true); setOcrError(null)
    try {
      // Compute line item financials
      const lineItems = (ocrData.line_items ?? []).map((item) => {
        const half = (item.gst_rate ?? 18) / 2
        const amt  = Math.round((item.quantity ?? 1) * (item.rate ?? 0) * 100) / 100
        const cgst = Math.round(amt * (half / 100) * 100) / 100
        return {
          description: item.description,
          hsn_code: item.hsn_code ?? null,
          quantity: item.quantity ?? 1,
          rate: item.rate ?? 0,
          cgst_rate: half, sgst_rate: half,
          cgst_amount: cgst, sgst_amount: cgst,
          amount: amt,
        }
      })

      const subtotal = lineItems.reduce((s, r) => s + r.amount, 0)
      const cgstTotal = lineItems.reduce((s, r) => s + r.cgst_amount, 0)
      const sgstTotal = lineItems.reduce((s, r) => s + r.sgst_amount, 0)

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number:   ocrData.invoice_number || null,
          client_name:      ocrData.client_name || null,
          client_gstin:     ocrData.client_gstin || null,
          invoice_date:     ocrData.invoice_date ?? new Date().toISOString().split("T")[0],
          description:      lineItems[0]?.description ?? "Imported invoice",
          terms:            ocrData.terms ?? null,
          status:           "unpaid",
          payment_due_days: 30,
          line_items:       lineItems,
          amount_before_tax: subtotal,
          cgst_rate:  lineItems[0]?.cgst_rate ?? 9,
          sgst_rate:  lineItems[0]?.sgst_rate ?? 9,
          cgst_amount: cgstTotal, sgst_amount: sgstTotal,
          total_amount: subtotal + cgstTotal + sgstTotal,
          import_source: "ocr",
        }),
      })
      const json = await res.json()
      if (!res.ok) { setOcrError(json.error ?? "Save failed"); return }
      setOcrSaved(true)
      router.refresh()
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setOcrSaving(false)
    }
  }

  const updateOcrField = (field: keyof OcrData, value: unknown) =>
    setOcrData((prev) => prev ? { ...prev, [field]: value } : prev)

  const updateOcrLineItem = (i: number, field: keyof OcrLineItem, value: unknown) =>
    setOcrData((prev) => {
      if (!prev) return prev
      const items = [...prev.line_items]
      items[i] = { ...items[i], [field]: value }
      return { ...prev, line_items: items }
    })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />Import Invoices
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import Invoices</SheetTitle>
          <SheetDescription>Upload a CSV file or scan a photo / PDF using AI.</SheetDescription>
        </SheetHeader>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b mx-4 my-4">
          {(["csv", "image"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "csv" ? "CSV Bulk Import" : "Image / PDF (AI)"}
            </button>
          ))}
        </div>

        {/* ── CSV Tab ── */}
        {tab === "csv" && (
          <div className="space-y-4 px-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Step 1 — Download the template</p>
              <Button variant="outline" size="sm" onClick={() => window.open("/api/invoices/import", "_blank")}>
                <Download className="h-4 w-4 mr-2" />Download CSV Template
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Step 2 — Upload filled CSV</p>
              <label htmlFor="csv-import-file" className="flex items-center gap-3 cursor-pointer border rounded-md px-4 py-3 hover:bg-muted/40">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{csvFile ? csvFile.name : "Choose CSV file…"}</span>
                <input id="csv-import-file" type="file" accept=".csv"
                  onChange={(e) => { setCsvFile(e.target.files?.[0] ?? null); setCsvError(null); setCsvResult(null) }}
                  className="hidden" disabled={csvUploading} />
              </label>
              {csvError && <p className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{csvError}</p>}
              {csvResult && (
                <div className="text-sm space-y-0.5">
                  <p className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium"><CheckCircle2 className="h-4 w-4" />Import complete</p>
                  <p className="text-muted-foreground">{csvResult.inserted} imported · {csvResult.skipped} skipped</p>
                </div>
              )}
            </div>

            <Button onClick={handleCsvImport} disabled={!csvFile || csvUploading || !!csvResult} className="w-full">
              {csvUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</> : <><Upload className="h-4 w-4 mr-2" />Import</>}
            </Button>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">Column reference</summary>
              <div className="mt-2 space-y-1 pl-2">
                <p><strong className="text-foreground">invoice_number</strong> — required</p>
                <p><strong className="text-foreground">client_name</strong> — required, auto-created if new</p>
                <p><strong className="text-foreground">invoice_date</strong> — DD/MM/YYYY or YYYY-MM-DD</p>
                <p><strong className="text-foreground">amount_before_tax</strong> — numeric only</p>
                <p><strong className="text-foreground">cgst_rate / sgst_rate</strong> — default 9</p>
                <p><strong className="text-foreground">status</strong> — paid / unpaid / overdue</p>
              </div>
            </details>
          </div>
        )}

        {/* ── Image / PDF Tab ── */}
        {tab === "image" && (
          <div className="space-y-4 px-4">
            {!ocrData && !ocrSaved && (
              <>
                <div className="rounded-lg border-2 border-dashed p-6 space-y-3 text-center">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop your invoice image or PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG · JPG · WEBP · PDF (text-based)</p>
                  </div>
                  <label htmlFor="ocr-file" className="cursor-pointer">
                    <span className="text-sm text-primary underline">{ocrFile ? ocrFile.name : "Choose file"}</span>
                    <input id="ocr-file" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf"
                      onChange={(e) => { setOcrFile(e.target.files?.[0] ?? null); setOcrError(null) }}
                      className="hidden" />
                  </label>
                </div>

                {ocrError && <p className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{ocrError}</p>}

                <Button onClick={handleOcrScan} disabled={!ocrFile || ocrScanning} className="w-full">
                  {ocrScanning
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning with AI…</>
                    : <><FileSearch className="h-4 w-4 mr-2" />Scan with AI</>}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Uses Gemini 2.5 Flash via Vercel AI Gateway
                </p>
              </>
            )}

            {ocrSaved && (
              <div className="text-center space-y-3 py-6">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
                <p className="font-medium">Invoice saved!</p>
                <p className="text-sm text-muted-foreground">Review and update the client link on the invoice page.</p>
                <Button variant="outline" onClick={() => { setOcrFile(null); setOcrData(null); setOcrSaved(false) }}>Scan Another</Button>
              </div>
            )}

            {ocrData && !ocrSaved && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <Pencil className="h-4 w-4" />Review extracted data — edit anything before saving
                </div>

                {/* Header fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Number</Label>
                    <Input value={ocrData.invoice_number ?? ""} onChange={(e) => updateOcrField("invoice_number", e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Date</Label>
                    <Input type="date" value={ocrData.invoice_date ?? ""} onChange={(e) => updateOcrField("invoice_date", e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Client Name</Label>
                    <Input value={ocrData.client_name ?? ""} onChange={(e) => updateOcrField("client_name", e.target.value)} className="text-sm" />
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Line Items</p>
                  {(ocrData.line_items ?? []).map((item, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 text-sm">
                      <Input value={item.description} onChange={(e) => updateOcrLineItem(i, "description", e.target.value)} placeholder="Description" />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" value={item.quantity} onChange={(e) => updateOcrLineItem(i, "quantity", parseFloat(e.target.value))} className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Rate (₹)</Label>
                          <Input type="number" value={item.rate} onChange={(e) => updateOcrLineItem(i, "rate", parseFloat(e.target.value))} className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">GST %</Label>
                          <Select value={String(item.gst_rate ?? 18)} onValueChange={(v) => updateOcrLineItem(i, "gst_rate", Number(v))}>
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {GST_OPTIONS.map((r) => (
                                <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {ocrError && <p className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{ocrError}</p>}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setOcrData(null); setOcrFile(null) }} className="flex-1">Re-scan</Button>
                  <Button onClick={handleOcrSave} disabled={ocrSaving} className="flex-1">
                    {ocrSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Invoice"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
