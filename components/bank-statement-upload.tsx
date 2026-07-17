"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

const ACCEPTED = ".csv,.xls,.xlsx,.pdf"
const FORMAT_LABELS: Record<string, string> = {
  csv: "CSV",
  xls: "Excel (XLS)",
  xlsx: "Excel (XLSX)",
  pdf: "PDF",
}

interface UploadResult {
  inserted: number
  skipped: number
  total: number
  autoMatched: number
  suggestionsCreated?: number
  batchId: string
}

interface Account {
  id: number
  nickname: string
}

export function BankStatementUpload({ accounts = [] }: { accounts?: Account[] }) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0].id) : "")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) { setError("Please select a file"); return }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!["csv", "xls", "xlsx", "pdf"].includes(ext)) {
      setError(`".${ext}" is not supported. Use CSV, XLS, XLSX or PDF.`)
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (accountId) formData.append("account_id", accountId)

      const res = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Upload failed")
        return
      }

      setResult(json as UploadResult)
      setFile(null)
      // Reset the file input
      const input = document.getElementById("bank-file-upload") as HTMLInputElement
      if (input) input.value = ""
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleReconcile = async () => {
    if (!result?.batchId) return
    setIsReconciling(true)
    setError(null)
    try {
      const res = await fetch(`/api/reconcile?batchId=${result.batchId}`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Reconcile failed"); return }
      setResult((prev) => prev ? { ...prev, autoMatched: json.matched ?? 0, suggestionsCreated: json.suggestionsCreated ?? 0 } : prev)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconcile failed")
    } finally {
      setIsReconciling(false)
    }
  }

  const ext = file?.name.split(".").pop()?.toLowerCase() ?? ""
  const formatLabel = FORMAT_LABELS[ext] ?? "File"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Bank Statement</CardTitle>
        <CardDescription>
          Supports CSV, Excel (XLS/XLSX), and PDF from ICICI and most Indian banks.
          Duplicates are automatically skipped.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Account selector — only shown once a second account exists */}
          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label>Which account is this statement from?</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Drop zone */}
          <label
            htmlFor="bank-file-upload"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-2 w-full min-h-[120px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-6 text-center"
          >
            {file ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatLabel} · {(file.size / 1024).toFixed(0)} KB</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Drop your bank statement here</span>
                <span className="text-xs text-muted-foreground">CSV · XLS · XLSX · PDF</span>
              </>
            )}
            <input
              id="bank-file-upload"
              type="file"
              accept={ACCEPTED}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Upload Statement</>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="flex flex-col gap-3 text-sm border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Upload complete
              </div>
              <span className="text-muted-foreground">
                {result.inserted} new transactions added · {result.skipped} duplicates skipped
              </span>
              {result.autoMatched > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{result.autoMatched} transaction{result.autoMatched > 1 ? "s" : ""} auto-reconciled with invoices</span>
                </div>
              )}
              {!!result.suggestionsCreated && result.suggestionsCreated > 0 && (
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{result.suggestionsCreated} new invoice/purchase suggestion{result.suggestionsCreated > 1 ? "s" : ""} ready for review</span>
                </div>
              )}
              {result.inserted > 0 && result.autoMatched === 0 && result.suggestionsCreated === undefined && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="w-fit"
                >
                  {isReconciling
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Reconciling…</>
                    : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Auto-reconcile with invoices</>
                  }
                </Button>
              )}
            </div>
          )}

          {/* Format hint */}
          {!result && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer font-medium mb-2">Expected column names</summary>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`CSV / Excel:
  Date, Description, Debit, Credit, Balance, Reference
  — or ICICI format: Txn Date, Withdrawal Amt, Deposit Amt, Closing Balance

PDF:
  ICICI account/credit card PDF statements are supported.
  Text extraction is automatic.`}
              </pre>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
