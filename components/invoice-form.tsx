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
import type { Client, Profile } from "@/lib/types"

interface InvoiceFormProps {
  clients: Client[]
  profile: Profile | null
}

export function InvoiceForm({ clients, profile }: InvoiceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    client_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    description: "",
    hsn_code: "998314",
    service_date: new Date().toISOString().split("T")[0],
    amount_before_tax: "",
    cgst_rate: "9",
    sgst_rate: "9",
    payment_due_days: "7",
    terms:
      "Invoices are payable within seven days upon receipt. Design documents including, but not limited to, sketches/comps, designs, illustrations, photography, models, and all other design documents are the exclusive property of Designer.",
  })

  const calculateTax = () => {
    const amount = Number(formData.amount_before_tax) || 0
    const cgstRate = Number(formData.cgst_rate) || 0
    const sgstRate = Number(formData.sgst_rate) || 0

    const cgstAmount = (amount * cgstRate) / 100
    const sgstAmount = (amount * sgstRate) / 100
    const totalAmount = amount + cgstAmount + sgstAmount

    return { cgstAmount, sgstAmount, totalAmount }
  }

  const { cgstAmount, sgstAmount, totalAmount } = calculateTax()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const invoiceData = {
        client_id: Number(formData.client_id),
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        service_date: formData.service_date || null,
        description: formData.description,
        hsn_code: formData.hsn_code || null,
        amount_before_tax: Number(formData.amount_before_tax),
        cgst_rate: Number(formData.cgst_rate),
        sgst_rate: Number(formData.sgst_rate),
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        total_amount: totalAmount,
        terms: formData.terms || null,
        status: "unpaid",
        payment_due_days: Number(formData.payment_due_days),
      }

      const result = await fetchFromAPI("/api/invoices", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      })

      console.log("[v0] Invoice created successfully:", result.id)
      router.push(`/dashboard/invoices/${result.id}`)
    } catch (err) {
      console.error("[v0] Error creating invoice:", err)
      setError(err instanceof Error ? err.message : "Failed to create invoice")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Invoice Number *</Label>
                  <Input
                    id="invoice_number"
                    required
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="INV-2025-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_date">Service Date</Label>
                  <Input
                    id="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Payment for services rendered..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    placeholder="998314"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount_before_tax">Amount Before Tax *</Label>
                  <Input
                    id="amount_before_tax"
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount_before_tax}
                    onChange={(e) => setFormData({ ...formData, amount_before_tax: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cgst_rate">CGST Rate (%)</Label>
                  <Input
                    id="cgst_rate"
                    type="number"
                    step="0.01"
                    value={formData.cgst_rate}
                    onChange={(e) => setFormData({ ...formData, cgst_rate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sgst_rate">SGST Rate (%)</Label>
                  <Input
                    id="sgst_rate"
                    type="number"
                    step="0.01"
                    value={formData.sgst_rate}
                    onChange={(e) => setFormData({ ...formData, sgst_rate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_due_days">Payment Due (Days)</Label>
                  <Input
                    id="payment_due_days"
                    type="number"
                    value={formData.payment_due_days}
                    onChange={(e) => setFormData({ ...formData, payment_due_days: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Before Tax</span>
                <span className="font-medium">₹{Number(formData.amount_before_tax || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CGST ({formData.cgst_rate}%)</span>
                <span className="font-medium">₹{cgstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SGST ({formData.sgst_rate}%)</span>
                <span className="font-medium">₹{sgstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
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

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !formData.client_id}>
            {isLoading ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </form>
  )
}
