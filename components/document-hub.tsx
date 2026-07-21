"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Bot, X, RotateCcw,
} from "lucide-react"
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
  aiAssisted?: boolean
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

type ItemStatus = "detecting" | "ready" | "uploading" | "done" | "error"

interface DocItem {
  id: string
  file: File
  status: ItemStatus
  detection: DetectionResult | null
  category: DetectedCategory
  gstDocType: string
  accountId: string
  upiSource: string
  message: string | null // outcome detail on success, error text on failure
}

let nextId = 0

export function DocumentHub({ accounts = [] }: { accounts?: Account[] }) {
  const router = useRouter()
  const [items, setItems] = useState<DocItem[]>([])
  const [isProcessingAll, setIsProcessingAll] = useState(false)

  const defaultAccountId = accounts[0] ? String(accounts[0].id) : ""

  const addFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const newItems: DocItem[] = fileArray.map((file) => ({
      id: String(nextId++),
      file,
      status: "detecting",
      detection: null,
      category: "unknown",
      gstDocType: "",
      accountId: defaultAccountId,
      upiSource: "phonepe",
      message: null,
    }))
    setItems((prev) => [...prev, ...newItems])

    // Detected sequentially — batches are a handful of files, and this keeps
    // Gemini-fallback calls from firing in a burst.
    for (const item of newItems) {
      try {
        const formData = new FormData()
        formData.append("file", item.file)
        const res = await fetch("/api/documents/detect", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Couldn't inspect this file")
        const detection = json as DetectionResult
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "ready", detection, category: detection.category, gstDocType: detection.gstDocType ?? "" }
              : i,
          ),
        )
      } catch (e) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", message: e instanceof Error ? e.message : "Couldn't inspect this file" } : i,
          ),
        )
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const updateItem = (id: string, patch: Partial<DocItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearDone = () => {
    setItems((prev) => prev.filter((i) => i.status !== "done"))
  }

  async function uploadOne(item: DocItem): Promise<{ ok: boolean; message: string }> {
    try {
      if (item.category === "bank_statement") {
        const formData = new FormData()
        formData.append("file", item.file)
        if (item.accountId) formData.append("account_id", item.accountId)
        const res = await fetch("/api/bank-statements/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        return { ok: true, message: `${json.inserted} new transaction${json.inserted === 1 ? "" : "s"}, ${json.skipped} duplicate${json.skipped === 1 ? "" : "s"} skipped.` }
      }
      if (item.category === "upi_statement") {
        const formData = new FormData()
        formData.append("file", item.file)
        formData.append("source", item.upiSource)
        const res = await fetch("/api/upi-contacts/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        return { ok: true, message: `${json.imported} contact${json.imported === 1 ? "" : "s"} resolved.` }
      }
      if (item.category === "gstr2b") {
        const formData = new FormData()
        formData.append("file", item.file)
        const res = await fetch("/api/gstr2b/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        return { ok: true, message: `${json.imported} line item${json.imported === 1 ? "" : "s"} imported for period ${json.period}.` }
      }
      if (item.category === "tax_pnl") {
        const formData = new FormData()
        formData.append("file", item.file)
        if (item.accountId) formData.append("account_id", item.accountId)
        const res = await fetch("/api/investment-statements/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        return { ok: true, message: `${json.inserted} trade${json.inserted === 1 ? "" : "s"} imported, ${json.posted} posted to the ledger.` }
      }
      if (item.category === "gst_document") {
        if (!item.gstDocType) throw new Error("Choose which GST document this is")
        const meta = DOC_REGISTRY[item.gstDocType]
        const formData = new FormData()
        formData.append("file", item.file)
        formData.append("doc_type", item.gstDocType)
        if (meta?.frequency === "monthly") {
          const now = new Date()
          formData.append("period", `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`)
        }
        const res = await fetch("/api/gst/documents", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        return { ok: true, message: `${meta?.label ?? "Document"} saved to your GST records.` }
      }
      throw new Error("Choose a document type before uploading")
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Upload failed" }
    }
  }

  const processOne = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    updateItem(id, { status: "uploading", message: null })
    const result = await uploadOne(item)
    updateItem(id, { status: result.ok ? "done" : "error", message: result.message })
    router.refresh()
  }

  const processAll = async () => {
    setIsProcessingAll(true)
    // Sequential — bank-statement inserts use timestamp-derived batch ids, and
    // reading per-row progress is easier to follow than a burst of parallel calls.
    const pending = items.filter((i) => i.status === "ready" || i.status === "error")
    for (const item of pending) {
      await processOne(item.id)
    }
    setIsProcessingAll(false)
  }

  const confidenceBadge = (d: DetectionResult) => {
    if (d.aiAssisted) return <Badge className="gap-1 bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"><Bot className="h-3 w-3" /> AI guess</Badge>
    if (d.confidence === "high") return <Badge className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Confident</Badge>
    if (d.confidence === "medium") return <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300">Likely</Badge>
    return <Badge variant="outline">Not sure</Badge>
  }

  const readyCount = items.filter((i) => i.status === "ready").length
  const doneCount = items.filter((i) => i.status === "done").length
  const errorCount = items.filter((i) => i.status === "error").length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Documents</CardTitle>
        <CardDescription>
          Drop one or many files here — bank statements, UPI exports, GSTR-2B JSON, broker Tax P&L, GST portal
          documents, all at once. Each one is inspected and shown below with where it's headed; edit anything that
          looks wrong, then process them together. If a format isn't one we recognise structurally, AI takes a best
          guess instead of giving up. Either way, nothing is saved until you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="document-hub-upload"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 w-full min-h-[100px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors px-4 py-5 text-center"
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          <span className="text-sm font-medium">Drop files here or click to browse — multiple at once is fine</span>
          <span className="text-xs text-muted-foreground">PDF · CSV · XLS · XLSX · JSON</span>
          <input
            id="document-hub-upload"
            type="file"
            multiple
            accept=".pdf,.csv,.xls,.xlsx,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {items.length} file{items.length === 1 ? "" : "s"}
                {doneCount > 0 && ` · ${doneCount} done`}
                {errorCount > 0 && ` · ${errorCount} failed`}
              </p>
              <div className="flex items-center gap-2">
                {doneCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearDone}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Clear completed
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={processAll}
                  disabled={isProcessingAll || (readyCount === 0 && errorCount === 0)}
                >
                  {isProcessingAll
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                    : <><Sparkles className="h-4 w-4 mr-2" />Confirm & Upload All</>}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 bg-muted/20 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        {item.status === "detecting" && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Inspecting…
                          </p>
                        )}
                        {item.detection && item.status !== "detecting" && (
                          <p className="text-xs text-muted-foreground">{item.detection.preview}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.detection && confidenceBadge(item.detection)}
                      {item.status === "done" && <Badge className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Done</Badge>}
                      {item.status === "error" && <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>}
                      {item.status !== "uploading" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(item.status === "ready" || item.status === "error") && (
                    <div className="flex flex-wrap items-end gap-2 pl-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Goes to</p>
                        <Select value={item.category} onValueChange={(v) => updateItem(item.id, { category: v as DetectedCategory })}>
                          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CATEGORY_LABELS) as DetectedCategory[])
                              .filter((c) => c !== "unknown")
                              .map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {(item.category === "bank_statement" || item.category === "tax_pnl") && accounts.length > 1 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Account</p>
                          <Select value={item.accountId} onValueChange={(v) => updateItem(item.id, { accountId: v })}>
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {item.category === "upi_statement" && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">App</p>
                          <Select value={item.upiSource} onValueChange={(v) => updateItem(item.id, { upiSource: v })}>
                            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UPI_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {item.category === "gst_document" && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Document type</p>
                          <Select value={item.gstDocType} onValueChange={(v) => updateItem(item.id, { gstDocType: v })}>
                            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {DOC_ORDER.map((t) => <SelectItem key={t} value={t}>{DOC_REGISTRY[t].label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => processOne(item.id)}
                        disabled={isProcessingAll || (item.category === "gst_document" && !item.gstDocType)}
                      >
                        {item.status === "error" ? "Retry" : "Upload this one"}
                      </Button>
                    </div>
                  )}

                  {item.status === "uploading" && (
                    <p className="pl-6 text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                    </p>
                  )}

                  {item.message && item.status !== "error" && (
                    <p className="pl-6 text-xs text-muted-foreground">{item.message}</p>
                  )}
                  {item.message && item.status === "error" && (
                    <p className="pl-6 text-xs text-destructive">{item.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
