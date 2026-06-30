"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger,
} from "@/components/ui/sheet"
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

      const res = await fetch("/api/invoices/import", { method: "POST", body: formData })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? "Import failed"); return }

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

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) { setFile(null); setError(null); setResult(null) }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Invoices
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import Invoices from CSV</SheetTitle>
          <SheetDescription>
            Bulk import your existing invoices. Clients are auto-created if they don't exist.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-2">
          {/* Step 1 */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Step 1 — Download the template</p>
            <p className="text-xs text-muted-foreground">
              Fill in your invoice data. Required: invoice_number, client_name, amount_before_tax.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {/* Step 2 */}
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
                      {result.parseErrors.length} row{result.parseErrors.length > 1 ? "s" : ""} had errors
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
              <p><span className="font-medium text-foreground">invoice_number</span> — required, unique</p>
              <p><span className="font-medium text-foreground">client_name</span> — required, auto-created if new</p>
              <p><span className="font-medium text-foreground">invoice_date</span> — DD/MM/YYYY or YYYY-MM-DD</p>
              <p><span className="font-medium text-foreground">amount_before_tax</span> — numeric, no ₹ symbol</p>
              <p><span className="font-medium text-foreground">cgst_rate / sgst_rate</span> — default 9</p>
              <p><span className="font-medium text-foreground">status</span> — paid / unpaid / overdue</p>
              <p><span className="font-medium text-foreground">description, hsn_code, payment_due_days</span> — optional</p>
            </div>
          </details>
        </div>

        <SheetFooter className="px-4">
          <Button onClick={handleImport} disabled={!file || isUploading || !!result} className="w-full">
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Import</>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
