"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Download, CheckCircle, Clock, AlertTriangle, Ban, Loader2, X } from "lucide-react"
import Link from "next/link"
import type { Invoice } from "@/lib/types"
import { fetchFromAPI } from "@/lib/db"

interface InvoiceListProps {
  invoices: Invoice[]
}

const STATUS_CONFIG = {
  paid: { label: "Paid", icon: CheckCircle, className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  unpaid: { label: "Unpaid", icon: Clock, className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  overdue: { label: "Overdue", icon: AlertTriangle, className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  partially_paid: { label: "Partial", icon: Ban, className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
} as const

export function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [markPaidModal, setMarkPaidModal] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentRef, setPaymentRef] = useState("")
  const [saving, setSaving] = useState(false)

  const updateStatus = async (invoiceId: string, status: string) => {
    setUpdating(invoiceId)
    try {
      await fetchFromAPI("/api/invoices", {
        method: "PUT",
        body: JSON.stringify({ id: invoiceId, status }),
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setUpdating(null)
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
      // Create payment record
      await fetchFromAPI("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: markPaidModal.id,
          client_id: markPaidModal.client_id,
          amount: Number(paymentAmount),
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: paymentRef || null,
          notes: null,
        }),
      })
      // Update invoice status
      const newStatus = Number(paymentAmount) >= Number(markPaidModal.total_amount) ? "paid" : "partially_paid"
      await fetchFromAPI("/api/invoices", {
        method: "PUT",
        body: JSON.stringify({ id: markPaidModal.id, status: newStatus }),
      })
      setMarkPaidModal(null)
      router.refresh()
    } catch (err) {
      console.error("Failed to record payment:", err)
    } finally {
      setSaving(false)
    }
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {invoices.map((invoice) => {
          const cfg = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unpaid
          const Icon = cfg.icon
          const isUpdating = updating === invoice.id

          return (
            <Card key={invoice.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4">
                {/* Invoice info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                    <Badge className={`gap-1 text-xs ${cfg.className}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{invoice.client?.name}</p>
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
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Mark as Paid modal */}
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
                <Input
                  id="pay-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment Date</Label>
                <Input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-method">Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
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
