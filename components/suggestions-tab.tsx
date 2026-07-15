"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Sparkles, Check, X, FileText, ShoppingCart, PencilLine, CheckCheck } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"

interface Suggestion {
  id: number
  suggestion_type: "invoice" | "purchase"
  bank_transaction_id: string
  bank_description: string
  transaction_date: string
  debit: number | null
  credit: number | null
  account_name: string | null
  confidence: number
  suggested_payload: Record<string, any>
}

interface Party { id: number; name: string }

// Fields the user can edit before accepting — kept intentionally minimal (matches
// what /api/invoices and /api/purchases actually consume for a simple, no-line-item record).
function InvoiceForm({ payload, onChange, clients }: { payload: any; onChange: (p: any) => void; clients: Party[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Client name</Label>
        <Input list="client-options" value={payload.client_name ?? ""} onChange={(e) => onChange({ ...payload, client_name: e.target.value, client_id: null })} />
        <datalist id="client-options">
          {clients.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label>Client GSTIN</Label>
        <Input value={payload.client_gstin ?? ""} onChange={(e) => onChange({ ...payload, client_gstin: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Invoice date</Label>
        <Input type="date" value={payload.invoice_date ?? ""} onChange={(e) => onChange({ ...payload, invoice_date: e.target.value })} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={2} value={payload.description ?? ""} onChange={(e) => onChange({ ...payload, description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Amount before tax (₹)</Label>
        <Input type="number" value={payload.amount_before_tax ?? 0} onChange={(e) => onChange({ ...payload, amount_before_tax: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>CGST amount (₹)</Label>
        <Input type="number" value={payload.cgst_amount ?? 0} onChange={(e) => onChange({ ...payload, cgst_amount: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>SGST amount (₹)</Label>
        <Input type="number" value={payload.sgst_amount ?? 0} onChange={(e) => onChange({ ...payload, sgst_amount: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>IGST amount (₹)</Label>
        <Input type="number" value={payload.igst_amount ?? 0} onChange={(e) => onChange({ ...payload, igst_amount: Number(e.target.value) })} />
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        Total: ₹{(Number(payload.amount_before_tax || 0) + Number(payload.cgst_amount || 0) + Number(payload.sgst_amount || 0) + Number(payload.igst_amount || 0)).toLocaleString("en-IN")}
      </div>
    </div>
  )
}

function PurchaseForm({ payload, onChange, vendors }: { payload: any; onChange: (p: any) => void; vendors: Party[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Vendor name</Label>
        <Input list="vendor-options" value={payload.vendor_name ?? ""} onChange={(e) => onChange({ ...payload, vendor_name: e.target.value, vendor_id: null })} />
        <datalist id="vendor-options">
          {vendors.map((v) => <option key={v.id} value={v.name} />)}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label>Vendor GSTIN</Label>
        <Input value={payload.vendor_gstin ?? ""} onChange={(e) => onChange({ ...payload, vendor_gstin: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Bill date</Label>
        <Input type="date" value={payload.invoice_date ?? ""} onChange={(e) => onChange({ ...payload, invoice_date: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Vendor invoice #</Label>
        <Input value={payload.invoice_number ?? ""} onChange={(e) => onChange({ ...payload, invoice_number: e.target.value })} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={2} value={payload.description ?? ""} onChange={(e) => onChange({ ...payload, description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Amount (₹, before tax)</Label>
        <Input type="number" value={payload.amount ?? 0} onChange={(e) => onChange({ ...payload, amount: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>CGST (₹)</Label>
        <Input type="number" value={payload.cgst ?? 0} onChange={(e) => onChange({ ...payload, cgst: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>SGST (₹)</Label>
        <Input type="number" value={payload.sgst ?? 0} onChange={(e) => onChange({ ...payload, sgst: Number(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label>IGST (₹)</Label>
        <Input type="number" value={payload.igst ?? 0} onChange={(e) => onChange({ ...payload, igst: Number(e.target.value) })} />
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        Total: ₹{(Number(payload.amount || 0) + Number(payload.cgst || 0) + Number(payload.sgst || 0) + Number(payload.igst || 0)).toLocaleString("en-IN")}
      </div>
    </div>
  )
}

export function SuggestionsTab() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [clients, setClients] = useState<Party[]>([])
  const [vendors, setVendors] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Suggestion | null>(null)
  const [draft, setDraft] = useState<any>(null)
  const [working, setWorking] = useState<number | null>(null)
  const [bulkWorking, setBulkWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sugs, cs, vs] = await Promise.all([
        fetchFromAPI("/api/reconciliation-suggestions"),
        fetchFromAPI("/api/clients").catch(() => []),
        fetchFromAPI("/api/vendors").catch(() => []),
      ])
      setSuggestions(sugs ?? [])
      setClients(cs ?? [])
      setVendors(vs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openEditor = (s: Suggestion) => {
    setEditing(s)
    setDraft({ ...s.suggested_payload })
  }

  const accept = async (id: number, payload: any) => {
    setWorking(id)
    try {
      await fetchFromAPI("/api/reconciliation-suggestions", {
        method: "PATCH",
        body: JSON.stringify({ id, payload }),
      })
      setEditing(null)
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept suggestion")
    } finally {
      setWorking(null)
    }
  }

  // Bulk-accept every suggestion above 90% confidence, sequentially (avoids racing
  // concurrent writes against the same org's data) — reports partial failures rather
  // than swallowing them.
  const acceptHighConfidence = async () => {
    const highConfidence = suggestions.filter((s) => s.confidence > 90)
    if (highConfidence.length === 0) return
    setBulkWorking(true)
    setError(null)
    let succeeded = 0
    const failures: string[] = []
    for (const s of highConfidence) {
      try {
        await fetchFromAPI("/api/reconciliation-suggestions", {
          method: "PATCH",
          body: JSON.stringify({ id: s.id, payload: s.suggested_payload }),
        })
        succeeded++
        setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
      } catch (err) {
        failures.push(err instanceof Error ? err.message : `Suggestion #${s.id} failed`)
      }
    }
    if (failures.length > 0) {
      setError(`${succeeded} of ${highConfidence.length} accepted — ${failures.length} failed: ${failures.join("; ")}`)
    }
    router.refresh()
    setBulkWorking(false)
  }

  const dismiss = async (id: number) => {
    setWorking(id)
    try {
      await fetchFromAPI(`/api/reconciliation-suggestions?id=${id}`, { method: "DELETE" })
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss suggestion")
    } finally {
      setWorking(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => <div key={n} className="h-20 rounded-lg border bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Suggested Invoices &amp; Purchases
        </CardTitle>
        {suggestions.some((s) => s.confidence > 90) && (
          <Button size="sm" variant="outline" onClick={acceptHighConfidence} disabled={bulkWorking}>
            {bulkWorking
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Accepting…</>
              : <><CheckCheck className="h-3.5 w-3.5 mr-1.5" />Accept all &gt;90% confidence</>}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No suggestions right now. They appear here when a categorized bank transaction doesn't match an existing invoice or purchase.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => {
              const amount = s.suggestion_type === "invoice" ? Number(s.credit) : Number(s.debit)
              const isWorking = working === s.id
              return (
                <div key={s.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.suggestion_type === "invoice"
                        ? <Badge className="bg-green-100 text-green-800 text-xs gap-1"><FileText className="h-3 w-3" />New Invoice</Badge>
                        : <Badge className="bg-amber-100 text-amber-800 text-xs gap-1"><ShoppingCart className="h-3 w-3" />New Purchase</Badge>}
                      <Badge variant="outline" className="text-xs">{s.account_name}</Badge>
                      <span className="text-xs text-muted-foreground">{Math.round(s.confidence)}% confidence</span>
                    </div>
                    <p className="font-medium truncate text-sm">{s.bank_description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.transaction_date).toLocaleDateString("en-IN")} ·{" "}
                      {s.suggestion_type === "invoice" ? s.suggested_payload.client_name : s.suggested_payload.vendor_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${s.suggestion_type === "invoice" ? "text-green-600" : "text-red-600"}`}>
                      {s.suggestion_type === "invoice" ? "+" : "−"}₹{amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => openEditor(s)} disabled={isWorking}>
                      <PencilLine className="h-3.5 w-3.5 mr-1" />Review
                    </Button>
                    <Button size="sm" className="h-8" onClick={() => accept(s.id, s.suggested_payload)} disabled={isWorking}>
                      {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      {!isWorking && "Accept"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => dismiss(s.id)} disabled={isWorking}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Review {editing?.suggestion_type === "invoice" ? "Invoice" : "Purchase"} Suggestion
            </DialogTitle>
            <DialogDescription>
              Edit any field before creating the record. This will link it to the bank transaction and mark it reconciled.
            </DialogDescription>
          </DialogHeader>
          {editing && draft && (
            editing.suggestion_type === "invoice"
              ? <InvoiceForm payload={draft} onChange={setDraft} clients={clients} />
              : <PurchaseForm payload={draft} onChange={setDraft} vendors={vendors} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && accept(editing.id, draft)} disabled={working === editing?.id}>
              {working === editing?.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Create &amp; Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
