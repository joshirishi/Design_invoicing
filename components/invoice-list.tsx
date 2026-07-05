"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Download, CheckCircle, Clock, AlertTriangle, Ban, Loader2, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Invoice } from "@/lib/types"
import { fetchFromAPI } from "@/lib/fetch"
import { getFinancialYear } from "@/lib/financial-year"

interface InvoiceListProps {
  invoices: Invoice[]
}

const STATUS_CONFIG = {
  paid:           { label: "Paid",     icon: CheckCircle,    className: "bg-green-500/10 text-green-700" },
  unpaid:         { label: "Unpaid",   icon: Clock,          className: "bg-yellow-500/10 text-yellow-700" },
  overdue:        { label: "Overdue",  icon: AlertTriangle,  className: "bg-red-500/10 text-red-700" },
  partially_paid: { label: "Partial",  icon: Ban,            className: "bg-blue-500/10 text-blue-700" },
} as const

export function InvoiceList({ invoices: initialInvoices }: InvoiceListProps) {
  const router = useRouter()
  const [invoices, setInvoices]       = useState(initialInvoices)
  const [updating, setUpdating]       = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [markPaidModal, setMarkPaidModal] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate]     = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentRef, setPaymentRef]       = useState("")
  const [saving, setSaving]               = useState(false)

  // ── Financial year state ────────────────────────────────────────────────────
  // Derive all FYs present in the data; default to the current one.
  const allFYs = useMemo(() => {
    const set = new Set<string>()
    invoices.forEach((inv) => {
      if (inv.invoice_date) set.add(getFinancialYear(inv.invoice_date))
    })
    return Array.from(set).sort().reverse() // newest first
  }, [invoices])

  const currentFY = getFinancialYear(new Date())
  const [selectedFY, setSelectedFY] = useState<string>(
    allFYs.includes(currentFY) ? currentFY : (allFYs[0] ?? currentFY)
  )

  const filtered = useMemo(
    () => invoices.filter((inv) => inv.invoice_date && getFinancialYear(inv.invoice_date) === selectedFY),
    [invoices, selectedFY]
  )

  // FY summary
  const fyTotal    = filtered.reduce((s, i) => s + Number(i.total_amount), 0)
  const fyPaid     = filtered.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0)
  const fyUnpaid   = fyTotal - fyPaid

  // ── Handlers ────────────────────────────────────────────────────────────────
  const updateStatus = async (invoiceId: string, status: string) => {
    setUpdating(invoiceId)
    try {
      await fetchFromAPI("/api/invoices", { method: "PUT", body: JSON.stringify({ id: invoiceId, status }) })
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status } : inv))
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return
    setDeleting(invoice.id)
    try {
      await fetchFromAPI(`/api/invoices?id=${invoice.id}`, { method: "DELETE" })
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id))
    } catch (err) {
      console.error("Failed to delete invoice:", err)
      alert("Delete failed. Please try again.")
    } finally {
      setDeleting(null)
    }
  }

  const openMarkPaid = (invoice: Invoice) => {
    setMarkPaidModal(invoice)
    setPaymentAmount(String(invoice.total_amount))
    setPaymentDate(new Date().toISOString().split("T")[0])
    setPaymentMethod("bank_transfer")
    setPaymentRef("")
  }

  const handleMarkPaid = async () => {
    if (!markPaidModal) return
    setSaving(true)
    try {
      await fetchFromAPI("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id:       markPaidModal.id,
          client_id:        markPaidModal.client_id,
          amount:           Number(paymentAmount),
          payment_date:     paymentDate,
          payment_method:   paymentMethod,
          reference_number: paymentRef || null,
          notes:            null,
        }),
      })
      const newStatus = Number(paymentAmount) >= Number(markPaidModal.total_amount) ? "paid" : "partially_paid"
      await fetchFromAPI("/api/invoices", {
        method: "PUT",
        body: JSON.stringify({ id: markPaidModal.id, status: newStatus }),
      })
      setInvoices((prev) => prev.map((i) => i.id === markPaidModal.id ? { ...i, status: newStatus } : i))
      setMarkPaidModal(null)
    } catch (err) {
      console.error("Failed to record payment:", err)
    } finally {
      setSaving(false)
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
      </Card>
    )
  }

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

  return (
    <>
      {/* ── Financial Year tabs ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {allFYs.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              selectedFY === fy
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            FY {fy}
          </button>
        ))}
      </div>

      {/* ── FY summary strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Total Billed</p>
          <p className="text-xl font-bold text-gray-900">{fmt(fyTotal)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Collected</p>
          <p className="text-xl font-bold text-green-600">{fmt(fyPaid)}</p>
          <p className="text-xs text-muted-foreground">{filtered.filter((i) => i.status === "paid").length} paid</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Outstanding</p>
          <p className="text-xl font-bold text-amber-600">{fmt(fyUnpaid)}</p>
          <p className="text-xs text-muted-foreground">{filtered.filter((i) => i.status !== "paid").length} pending</p>
        </Card>
      </div>

      {/* ── Invoice rows ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground text-sm">No invoices in FY {selectedFY}.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((invoice) => {
            const cfg = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unpaid
            const Icon = cfg.icon
            const isUpdating = updating === invoice.id
            const isDeleting = deleting === invoice.id

            return (
              <Card key={invoice.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  {/* Invoice info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                      <Badge className={`gap-1 text-xs ${cfg.className}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{(invoice as any).client_name ?? invoice.client?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">₹{Number(invoice.total_amount).toLocaleString("en-IN")}</p>
                  </div>

                  {/* Status changer */}
                  <div className="shrink-0 w-36">
                    {isUpdating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating…
                      </div>
                    ) : (
                      <Select value={invoice.status} onValueChange={(v) => updateStatus(invoice.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="partially_paid">Partial</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {invoice.status !== "paid" && (
                      <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => openMarkPaid(invoice)}>
                        Mark Paid
                      </Button>
                    )}
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/invoices/${invoice.id}/pdf`} target="_blank">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:border-red-200"
                      onClick={() => handleDelete(invoice)}
                      disabled={isDeleting}
                      title="Delete invoice"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Record Payment modal ──────────────────────────────────────── */}
      {markPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <Button variant="ghost" size="icon" onClick={() => setMarkPaidModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Invoice <strong>{markPaidModal.invoice_number}</strong> — Total ₹{Number(markPaidModal.total_amount).toLocaleString("en-IN")}
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount Received</Label>
                <Input id="pay-amount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment Date</Label>
                <Input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-method">Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="pay-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer / NEFT / RTGS</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Reference / UTR Number</Label>
                <Input id="pay-ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleMarkPaid} disabled={saving || !paymentAmount} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Confirm Payment"}
              </Button>
              <Button variant="outline" onClick={() => setMarkPaidModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
