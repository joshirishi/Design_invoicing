"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, AlertCircle } from "lucide-react"
import type { Client, Profile, InvoiceLineItem } from "@/lib/types"
import { isInterState } from "@/lib/financial-year"

const GST_OPTIONS = [
  { label: "0%",  combined: 0,  half: 0 },
  { label: "5%",  combined: 5,  half: 2.5 },
  { label: "12%", combined: 12, half: 6 },
  { label: "18%", combined: 18, half: 9 },
  { label: "28%", combined: 28, half: 14 },
]

interface LineItemRow {
  description: string
  hsn_code: string
  quantity: string
  rate: string
  gst_combined: number
}

function emptyRow(): LineItemRow {
  return { description: "", hsn_code: "998314", quantity: "1", rate: "", gst_combined: 18 }
}

// Computes a line item — switches between IGST or CGST+SGST based on inter-state flag
function computeRow(row: LineItemRow, interState: boolean): InvoiceLineItem {
  const qty    = parseFloat(row.quantity) || 1
  const rate   = parseFloat(row.rate)     || 0
  const gst    = GST_OPTIONS.find((o) => o.combined === row.gst_combined) ?? GST_OPTIONS[3]
  const amount = Math.round(qty * rate * 100) / 100
  const taxAmt = Math.round(amount * (gst.combined / 100) * 100) / 100

  if (interState) {
    return {
      description: row.description,
      hsn_code:    row.hsn_code || null,
      quantity: qty, rate,
      cgst_rate: 0, sgst_rate: 0, igst_rate: gst.combined,
      cgst_amount: 0, sgst_amount: 0, igst_amount: taxAmt,
      amount,
    }
  }
  const halfAmt = Math.round(amount * (gst.half / 100) * 100) / 100
  return {
    description: row.description,
    hsn_code:    row.hsn_code || null,
    quantity: qty, rate,
    cgst_rate: gst.half, sgst_rate: gst.half, igst_rate: 0,
    cgst_amount: halfAmt, sgst_amount: halfAmt, igst_amount: 0,
    amount,
  }
}

interface InvoiceFormProps {
  clients: Client[]
  profile: Profile | null
}

export function InvoiceForm({ clients, profile }: InvoiceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [header, setHeader] = useState({
    client_id:        "",
    invoice_number:   "",
    invoice_date:     new Date().toISOString().split("T")[0],
    service_date:     new Date().toISOString().split("T")[0],
    payment_due_days: "30",
    terms: "Payment due within the agreed terms. All design documents remain the exclusive property of the designer until payment is received in full.",
  })

  const [rows, setRows] = useState<LineItemRow[]>([emptyRow()])

  // Determine if selected client is inter-state (IGST applies)
  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === header.client_id) ?? null,
    [clients, header.client_id],
  )
  const interState = isInterState(profile?.state_code, selectedClient?.state_code)

  const updateHeader = (field: string, value: string) =>
    setHeader((prev) => ({ ...prev, [field]: value }))

  const updateRow = useCallback((index: number, field: keyof LineItemRow, value: string | number) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }, [])

  const addRow    = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (index: number) =>
    setRows((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)

  const computed  = rows.map((r) => computeRow(r, interState))
  const subtotal  = computed.reduce((s, r) => s + r.amount, 0)
  const totalCgst = computed.reduce((s, r) => s + r.cgst_amount, 0)
  const totalSgst = computed.reduce((s, r) => s + r.sgst_amount, 0)
  const totalIgst = computed.reduce((s, r) => s + r.igst_amount, 0)
  const grandTotal = subtotal + totalCgst + totalSgst + totalIgst

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!header.client_id)      { setError("Please select a client"); return }
    if (!header.invoice_number) { setError("Invoice number is required"); return }
    if (rows.some((r) => !r.description || !r.rate)) {
      setError("Each line item needs a description and rate"); return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchFromAPI("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          client_id:        Number(header.client_id),
          invoice_number:   header.invoice_number,
          invoice_date:     header.invoice_date,
          service_date:     header.service_date || null,
          description:      rows[0].description,
          terms:            header.terms || null,
          status:           "unpaid",
          payment_due_days: Number(header.payment_due_days),
          place_of_supply:  selectedClient?.state_code ?? null,
          line_items:       computed,
          // header-level totals for backwards compat
          amount_before_tax: subtotal,
          cgst_rate:  computed[0]?.cgst_rate  ?? 0,
          sgst_rate:  computed[0]?.sgst_rate  ?? 0,
          igst_rate:  computed[0]?.igst_rate  ?? 0,
          cgst_amount: totalCgst,
          sgst_amount: totalSgst,
          igst_amount: totalIgst,
          total_amount: grandTotal,
        }),
      })
      router.push(`/dashboard/invoices/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Details</CardTitle>
            {header.client_id && (
              <Badge variant={interState ? "destructive" : "secondary"} className="text-xs font-medium">
                {interState ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Client */}
          <div className="space-y-1.5">
            <Label htmlFor="client">Client *</Label>
            <Select value={header.client_id} onValueChange={(v) => updateHeader("client_id", v)}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {c.state_code ? <span className="text-muted-foreground ml-1">({c.state_code})</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {header.client_id && !selectedClient?.state_code && (
              <p className="text-xs text-amber-600">
                No state code on this client — add it in Clients to auto-determine GST type.
              </p>
            )}
          </div>

          {/* Invoice number */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice_number">Invoice Number *</Label>
            <Input
              id="invoice_number"
              value={header.invoice_number}
              onChange={(e) => updateHeader("invoice_number", e.target.value)}
              placeholder="INV-001"
              required
            />
          </div>

          {/* Invoice date */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice_date">Invoice Date</Label>
            <Input
              id="invoice_date"
              type="date"
              value={header.invoice_date}
              onChange={(e) => updateHeader("invoice_date", e.target.value)}
            />
          </div>

          {/* Service date */}
          <div className="space-y-1.5">
            <Label htmlFor="service_date">Service Date</Label>
            <Input
              id="service_date"
              type="date"
              value={header.service_date}
              onChange={(e) => updateHeader("service_date", e.target.value)}
            />
          </div>

          {/* Payment due */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_due_days">Payment Due (Days)</Label>
            <Input
              id="payment_due_days"
              type="number"
              min="0"
              value={header.payment_due_days}
              onChange={(e) => updateHeader("payment_due_days", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Line Items ───────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden sm:grid grid-cols-[2fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Description *</span>
            <span>HSN/SAC</span>
            <span>Qty</span>
            <span>Rate (₹) *</span>
            <span>GST %</span>
            <span className="text-right">Amount (₹)</span>
            <span />
          </div>

          {rows.map((row, i) => {
            const c = computeRow(row, interState)
            const lineTotal = c.amount + c.cgst_amount + c.sgst_amount + c.igst_amount
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr_auto] gap-2 items-start border rounded-lg p-3 sm:p-2 sm:border-0 sm:rounded-none sm:px-1">
                <div>
                  <Label className="sm:hidden text-xs mb-1 block">Description *</Label>
                  <Textarea value={row.description} onChange={(e) => updateRow(i, "description", e.target.value)} placeholder="Service description" className="min-h-[60px] text-sm resize-y" required />
                </div>
                <div>
                  <Label className="sm:hidden text-xs mb-1 block">HSN/SAC</Label>
                  <Input value={row.hsn_code} onChange={(e) => updateRow(i, "hsn_code", e.target.value)} placeholder="998314" className="text-sm" />
                </div>
                <div>
                  <Label className="sm:hidden text-xs mb-1 block">Qty</Label>
                  <Input type="number" min="0.001" step="0.001" value={row.quantity} onChange={(e) => updateRow(i, "quantity", e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="sm:hidden text-xs mb-1 block">Rate (₹) *</Label>
                  <Input type="number" min="0" step="0.01" value={row.rate} onChange={(e) => updateRow(i, "rate", e.target.value)} placeholder="0.00" className="text-sm" required />
                </div>
                <div>
                  <Label className="sm:hidden text-xs mb-1 block">GST %</Label>
                  <Select value={String(row.gst_combined)} onValueChange={(v) => updateRow(i, "gst_combined", Number(v))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GST_OPTIONS.map((o) => (
                        <SelectItem key={o.combined} value={String(o.combined)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-sm font-medium tabular-nums">{fmt(lineTotal)}</span>
                </div>
                <div className="flex items-center justify-end">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-1">
            <Plus className="h-4 w-4 mr-1.5" />Add Line Item
          </Button>
        </CardContent>
      </Card>

      {/* ── Totals + Terms ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={header.terms} onChange={(e) => updateHeader("terms", e.target.value)} className="min-h-[120px] resize-y text-sm" placeholder="Payment terms…" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">₹{fmt(subtotal)}</span>
            </div>

            {interState ? (
              /* IGST breakdown by rate */
              [...new Set(rows.map((r) => r.gst_combined))].map((rate) => {
                const rowsAtRate = computed.filter((_, idx) => rows[idx].gst_combined === rate)
                const igstHere = rowsAtRate.reduce((s, r) => s + r.igst_amount, 0)
                if (igstHere === 0) return null
                return (
                  <div key={rate} className="flex justify-between text-muted-foreground">
                    <span>IGST @ {rate}%</span>
                    <span className="tabular-nums">₹{fmt(igstHere)}</span>
                  </div>
                )
              })
            ) : (
              /* CGST + SGST breakdown by rate */
              [...new Set(rows.map((r) => r.gst_combined))].map((rate) => {
                const gst = GST_OPTIONS.find((o) => o.combined === rate)!
                const rowsAtRate = computed.filter((_, idx) => rows[idx].gst_combined === rate)
                const cgstHere = rowsAtRate.reduce((s, r) => s + r.cgst_amount, 0)
                const sgstHere = rowsAtRate.reduce((s, r) => s + r.sgst_amount, 0)
                if (cgstHere === 0 && sgstHere === 0) return null
                return (
                  <div key={rate}>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST @ {gst.half}%</span>
                      <span className="tabular-nums">₹{fmt(cgstHere)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST @ {gst.half}%</span>
                      <span className="tabular-nums">₹{fmt(sgstHere)}</span>
                    </div>
                  </div>
                )
              })
            )}

            <div className="flex justify-between border-t pt-2 font-bold text-base">
              <span>Grand Total</span>
              <span className="tabular-nums">₹{fmt(grandTotal)}</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive pt-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create Invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
