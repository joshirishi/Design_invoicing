"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ImportResult {
  inserted: number
  skipped: number
  total: number
  parseErrors?: Array<{ line: number; message: string }>
}

export function InvoiceImportModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) { setFile(selected); setError(null); setResult(null) }
  }

  const handleDownloadTemplate = () => {
    window.open("/api/invoices/import", "_blank")
  }

  const handleImport = async () => {
    if (!file) { setError("Please select a CSV file"); return }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/invoices/import", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Import failed")
        return
      }

      setResult(json as ImportResult)
      setFile(null)
      const input = document.getElementById("invoice-import-file") as HTMLInputElement
      if (input) input.value = ""
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setFile(null)
    setError(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Invoices
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Invoices from CSV</DialogTitle>
          <DialogDescription>
            Bulk import your existing invoices using the template below. Clients are created automatically if they don't exist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1 — Download template */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Step 1 — Download the template</p>
            <p className="text-xs text-muted-foreground">
              Fill in your invoice data following the column format. Required: invoice_number, client_name, amount_before_tax.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {/* Step 2 — Upload filled CSV */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Step 2 — Upload your filled CSV</p>

            <label
              htmlFor="invoice-import-file"
              className="flex items-center gap-3 cursor-pointer border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">
                {file ? file.name : "Choose CSV file…"}
              </span>
              <input
                id="invoice-import-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Import complete
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.inserted} invoices imported · {result.skipped} skipped (already exist)
                </p>
                {result.parseErrors && result.parseErrors.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      {result.parseErrors.length} row{result.parseErrors.length > 1 ? "s" : ""} skipped due to errors
                    </summary>
                    <ul className="mt-1 space-y-1 pl-4 list-disc">
                      {result.parseErrors.map((e, i) => (
                        <li key={i}>Line {e.line}: {e.message}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Column reference */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">CSV column reference</summary>
            <div className="mt-2 space-y-1 pl-2">
              <p><span className="font-medium text-foreground">invoice_number</span> — required, unique per account</p>
              <p><span className="font-medium text-foreground">client_name</span> — required, auto-created if new</p>
              <p><span className="font-medium text-foreground">invoice_date</span> — DD/MM/YYYY or YYYY-MM-DD</p>
              <p><span className="font-medium text-foreground">amount_before_tax</span> — numeric, no ₹ symbol</p>
              <p><span className="font-medium text-foreground">cgst_rate / sgst_rate</span> — default 9 (for 18% GST)</p>
              <p><span className="font-medium text-foreground">status</span> — paid / unpaid / overdue</p>
              <p><span className="font-medium text-foreground">description</span> — service description</p>
              <p><span className="font-medium text-foreground">hsn_code</span> — optional HSN/SAC code</p>
              <p><span className="font-medium text-foreground">payment_due_days</span> — default 7</p>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button onClick={handleImport} disabled={!file || isUploading || !!result}>
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Import</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
