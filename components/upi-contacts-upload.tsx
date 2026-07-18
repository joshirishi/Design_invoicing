"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

const SOURCES = [
  { value: "phonepe", label: "PhonePe" },
  { value: "gpay", label: "Google Pay" },
  { value: "bhim", label: "BHIM UPI" },
  { value: "amazonpay", label: "Amazon Pay" },
  { value: "other", label: "Other" },
]

export function UpiContactsUpload() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState("phonepe")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number } | null>(null)

  async function handleUpload() {
    if (!file) { setError("Select a statement file first"); return }
    setIsUploading(true); setError(null); setResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("source", source)
      const res = await fetch("/api/upi-contacts/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Upload failed"); return }
      setResult(json)
      setFile(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload UPI App Statement</CardTitle>
        <CardDescription>
          PhonePe, Google Pay, BHIM, or Amazon Pay export — used only to resolve counterparty names
          (e.g. "GURUNATH A" → "Gurunath Dhavad"). No transactions or amounts are imported; those stay
          sourced from your bank/credit-card statement to avoid counting the same money twice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <label
          htmlFor="upi-contacts-upload"
          className="flex flex-col items-center justify-center gap-2 w-full min-h-[90px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-5 text-center"
        >
          {file ? (
            <>
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">Drop your statement here</span>
              <span className="text-xs text-muted-foreground">PDF · CSV · XLS · XLSX</span>
            </>
          )}
          <input
            id="upi-contacts-upload"
            type="file"
            accept=".pdf,.csv,.xls,.xlsx"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); setResult(null) }}
          />
        </label>

        <Button onClick={handleUpload} disabled={!file || isUploading} size="sm">
          {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {result.imported} contact{result.imported !== 1 ? "s" : ""} added to your name-resolution lookup
          </div>
        )}
      </CardContent>
    </Card>
  )
}
