"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Invoice, Client } from "@/lib/types"

interface PaymentFormProps {
  invoices: (Invoice & { client?: { name: string } })[]
  clients: Client[]
}

const TDS_RATES: Record<string, number> = { "194J": 10, "194C": 1 }

export function PaymentForm({ invoices, clients }: PaymentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    invoice_id: "",
    client_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "",
    reference_number: "",
    notes: "",
  })
  const [tdsSection, setTdsSection] = useState<string>("none")
  const [tdsRate, setTdsRate] = useState("")

  function handleTdsSectionChange(section: string) {
    setTdsSection(section)
    setTdsRate(section === "none" ? "" : String(TDS_RATES[section] ?? 0))
  }

  const grossAmount = Number(formData.amount) || 0
  const effectiveTdsRate = tdsSection === "none" ? 0 : Number(tdsRate) || 0
  const computedTdsAmount = Math.round(((grossAmount * effectiveTdsRate) / 100) * 100) / 100
  const netReceived = grossAmount - computedTdsAmount

  const selectedInvoice = invoices.find((inv) => inv.id === formData.invoice_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await fetchFromAPI("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: formData.invoice_id || null,
          client_id: formData.client_id || null,
          amount: Number(formData.amount),
          payment_date: formData.payment_date,
          payment_method: formData.payment_method || null,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          tds_section: tdsSection === "none" ? null : tdsSection,
          tds_amount: computedTdsAmount,
        }),
      })

      router.push("/dashboard/payments")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Invoice (Optional)</Label>
              <Select
                value={formData.invoice_id}
                onValueChange={(value) => {
                  const invoice = invoices.find((inv) => inv.id === value)
                  setFormData({
                    ...formData,
                    invoice_id: value,
                    client_id: invoice?.client_id || "",
                    amount: invoice?.total_amount.toString() || "",
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.client?.name} - ₹
                      {Number(invoice.total_amount).toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formData.invoice_id && (
              <div className="space-y-2">
                <Label htmlFor="client_id">Client (Optional)</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Input
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="Bank Transfer, Cash, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Transaction ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Did the client deduct TDS from this payment?</Label>
              <Select value={tdsSection} onValueChange={handleTdsSectionChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No TDS deducted</SelectItem>
                  <SelectItem value="194J">194J — Professional / consulting services</SelectItem>
                  <SelectItem value="194C">194C — Contract work (maintenance, printing, etc.)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                194J: professional or consulting fees (default 10%) · 194C: contract/labor work, not professional advice (default 1%).
                This is TDS your client withheld — different from TDS you deduct when paying your own contractors (tracked under Payees).
              </p>
            </div>

            {tdsSection !== "none" && (
              <div className="space-y-3">
                <div className="space-y-2 max-w-[140px]">
                  <Label htmlFor="tds_rate">TDS Rate (%)</Label>
                  <Input id="tds_rate" type="number" step="0.01" value={tdsRate} onChange={(e) => setTdsRate(e.target.value)} />
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross amount</span><span className="tabular-nums">₹{grossAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TDS deducted</span><span className="tabular-nums">₹{computedTdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-semibold"><span>Net received in bank</span><span className="tabular-nums">₹{netReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this payment"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Recording..." : "Record Payment"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
