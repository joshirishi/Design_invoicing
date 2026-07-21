"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { DOC_REGISTRY, DOC_ORDER } from "@/components/gst-document-checklist"

type DetectedCategory = "bank_statement" | "upi_statement" | "gstr2b" | "tax_pnl" | "gst_document" | "unknown"

interface DetectionResult {
  category: DetectedCategory
  confidence: "high" | "medium" | "low"
  label: string
  preview: string
  gstDocType?: string
  period?: string | null
}

const UPI_SOURCES = [
  { value: "phonepe", label: "PhonePe" },
  { value: "gpay", label: "Google Pay" },
  { value: "bhim", label: "BHIM UPI" },
  { value: "amazonpay", label: "Amazon Pay" },
  { value: "other", label: "Other" },
]

const CATEGORY_LABELS: Record<DetectedCategory, string> = {
  bank_statement: "Bank statement",
  upi_statement: "UPI app statement",
  gstr2b: "GSTR-2B (ITC statement)",
  tax_pnl: "Broker Tax P&L (capital gains)",
  gst_document: "GST portal document",
  unknown: "Unrecognised",
}

interface Account {
  id: number
  nickname: string
}

interface UploadOutcome {
  message: string
  detail?: string
}

export function DocumentHub({ accounts = [] }: { accounts?: Account[] }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [category, setCategory] = useState<DetectedCategory>("unknown")
  const [gstDocType, setGstDocType] = useState<string>("")
  const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0].id) : "")
  const [upiSource, setUpiSource] = useState("phonepe")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null)

  const reset = () => {
    setFile(null)
    setDetection(null)
    setCategory("unknown")
    setGstDocType("")
    setError(null)
    setOutcome(null)
    const input = document.getElementById("document-hub-upload") as HTMLInputElement
    if (input) input.value = ""
  }

  const runDetection = async (selected: File) => {
    setFile(selected)
    setError(null)
    setOutcome(null)
    setDetection(null)
    setIsDetecting(true)
    try {
      const formData = new FormData()
      formData.append("file", selected)
      const res = await fetch("/api/documents/detect", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Couldn't inspect this file")
      const result = json as DetectionResult
      setDetection(result)
      setCategory(result.category)
      if (result.gstDocType) setGstDocType(result.gstDocType)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't inspect this file")
    } finally {
      setIsDetecting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) runDetection(selected)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) runDetection(dropped)
  }

  const handleConfirm = async () => {
    if (!file) return
    setIsSubmitting(true)
    setError(null)
    try {
      let outcome: UploadOutcome
      if (category === "bank_statement") {
        const formData = new FormData()
        formData.append("file", file)
        if (accountId) formData.append("account_id", accountId)
        const res = await fetch("/api/bank-statements/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        outcome = { message: "Bank statement added", detail: `${json.inserted} new transaction${json.inserted === 1 ? "" : "s"}, ${json.skipped} duplicate${json.skipped === 1 ? "" : "s"} skipped.` }
      } else if (category === "upi_statement") {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("source", upiSource)
        const res = await fetch("/api/upi-contacts/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        outcome = { message: "UPI contacts resolved", detail: `${json.imported} contact${json.imported === 1 ? "" : "s"} added to your name-resolution lookup.` }
      } else if (category === "gstr2b") {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/gstr2b/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        outcome = { message: "GSTR-2B reconciled", detail: `${json.imported} line item${json.imported === 1 ? "" : "s"} imported for period ${json.period}.` }
      } else if (category === "tax_pnl") {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/investment-statements/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        outcome = { message: "Capital gains recorded", detail: `${json.inserted} trade${json.inserted === 1 ? "" : "s"} imported, ${json.posted} posted to the ledger.` }
      } else if (category === "gst_document") {
        if (!gstDocType) throw new Error("Choose which GST document this is")
        const meta = DOC_REGISTRY[gstDocType]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("doc_type", gstDocType)
        if (meta?.frequency === "monthly") {
          const now = new Date()
          formData.append("period", `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`)
        }
        const res = await fetch("/api/gst/documents", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        outcome = { message: `${meta?.label ?? "Document"} saved`, detail: "Stored with your GST document records." }
      } else {
        throw new Error("Choose a document type before uploading")
      }
      setOutcome(outcome)
      setFile(null)
      setDetection(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const confidenceBadge = (c: DetectionResult["confidence"]) => {
    if (c === "high") return <Badge className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Confident match</Badge>
    if (c === "medium") return <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300">Likely match — please confirm</Badge>
    return <Badge variant="outline">Not sure — please choose</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a Document</CardTitle>
        <CardDescription>
          Drop any statement or GST download here — bank statement, UPI export, GSTR-2B JSON, broker Tax P&L, or a
          GST portal document. It's inspected automatically and routed to the right place; nothing is saved until
          you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!detection && !outcome && (
          <label
            htmlFor="document-hub-upload"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-2 w-full min-h-[120px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-6 text-center"
          >
            {isDetecting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Inspecting file…
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Drop a file here or click to browse</span>
                <span className="text-xs text-muted-foreground">PDF · CSV · XLS · XLSX · JSON</span>
              </>
            )}
            <input
              id="document-hub-upload"
              type="file"
              accept=".pdf,.csv,.xls,.xlsx,.json"
              onChange={handleFileChange}
              className="hidden"
              disabled={isDetecting}
            />
          </label>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}

        {detection && file && !outcome && (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{detection.preview}</p>
                </div>
              </div>
              {confidenceBadge(detection.confidence)}
            </div>

            <div className="space-y-1.5">
              <Label>We think this is</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DetectedCategory)}>
                <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as DetectedCategory[])
                    .filter((c) => c !== "unknown")
                    .map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {category === "bank_statement" && accounts.length > 1 && (
              <div className="space-y-1.5">
                <Label>Which account is this from?</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {category === "upi_statement" && (
              <div className="space-y-1.5">
                <Label>Which app is this from?</Label>
                <Select value={upiSource} onValueChange={setUpiSource}>
                  <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UPI_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {category === "gst_document" && (
              <div className="space-y-1.5">
                <Label>Which GST document is this?</Label>
                <Select value={gstDocType} onValueChange={setGstDocType}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select document type" /></SelectTrigger>
                  <SelectContent>
                    {DOC_ORDER.map((t) => <SelectItem key={t} value={t}>{DOC_REGISTRY[t].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleConfirm} disabled={isSubmitting || (category === "gst_document" && !gstDocType)}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</> : <><Sparkles className="h-4 w-4 mr-2" />Confirm & Upload</>}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={isSubmitting}>
                <RotateCcw className="h-4 w-4 mr-2" />Start over
              </Button>
            </div>
          </div>
        )}

        {outcome && (
          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />{outcome.message}
            </div>
            {outcome.detail && <p className="text-sm text-muted-foreground">{outcome.detail}</p>}
            <Button variant="outline" size="sm" onClick={reset} className="w-fit mt-1">
              Add another document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
