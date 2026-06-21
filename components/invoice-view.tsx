"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, Send, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import type { Invoice, Profile } from "@/lib/types"
import { numberToWords } from "@/lib/utils/number-to-words"
import { fetchFromAPI } from "@/lib/db"

interface InvoiceViewProps {
  invoice: Invoice
  profile: Profile | null
}

export function InvoiceView({ invoice, profile }: InvoiceViewProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "unpaid": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "overdue": return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "partially_paid": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      default: return ""
    }
  }

  const handleSendEmail = async () => {
    setSending(true)
    setSendError(null)
    try {
      await fetchFromAPI(`/api/invoices/${invoice.id}/send`, { method: "POST" })
      setSent(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h1>
          <p className="text-muted-foreground">Invoice Details</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.client?.email && (
            sent ? (
              <Button variant="outline" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Email Sent
              </Button>
            ) : (
              <Button variant="outline" onClick={handleSendEmail} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : <><Send className="h-4 w-4 mr-2" />Send to Client</>}
              </Button>
            )
          )}
          <Button variant="outline" onClick={() => window.open(`/dashboard/invoices/${invoice.id}/pdf`, "_blank")}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Link href={`/dashboard/invoices/${invoice.id}/pdf`} target="_blank">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </Link>
        </div>
      </div>
      {sendError && <p className="text-sm text-destructive">{sendError}</p>}
      {invoice.sent_at && <p className="text-xs text-muted-foreground">Last sent: {new Date(invoice.sent_at).toLocaleString("en-IN")}</p>}

      <Card className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold uppercase">{profile?.full_name || "Your Name"}</h2>
            <p className="text-sm text-muted-foreground mt-1">Multi Disciplinary Designer, Consultant</p>
            <p className="text-sm mt-2">{profile?.email}</p>
            <p className="text-sm">{profile?.phone}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold">TAX INVOICE</h3>
            <p className="text-sm mt-2">Date: {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</p>
            <Badge className={`mt-2 ${getStatusColor(invoice.status)}`}>{invoice.status.replace("_", " ")}</Badge>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8">
          <p className="text-sm font-semibold mb-2">To:</p>
          <p className="font-semibold">{invoice.client?.name}</p>
          <p className="text-sm">{invoice.client?.address}</p>
          {invoice.client?.gstin && <p className="text-sm">GSTIN: {invoice.client.gstin}</p>}
        </div>

        {/* Invoice Number */}
        <div className="mb-6">
          <p className="text-sm font-semibold">INVOICE # {invoice.invoice_number}</p>
        </div>

        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-sm font-semibold">NO</th>
                <th className="text-left p-3 text-sm font-semibold">DESCRIPTION</th>
                <th className="text-left p-3 text-sm font-semibold">HSN</th>
                <th className="text-left p-3 text-sm font-semibold">DATE</th>
                <th className="text-right p-3 text-sm font-semibold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 text-sm">1</td>
                <td className="p-3 text-sm">{invoice.description}</td>
                <td className="p-3 text-sm">{invoice.hsn_code}</td>
                <td className="p-3 text-sm">
                  {invoice.service_date ? new Date(invoice.service_date).toLocaleDateString("en-IN") : "-"}
                </td>
                <td className="p-3 text-sm text-right">
                  ₹{Number(invoice.amount_before_tax).toLocaleString("en-IN")}/-
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Amount Before Tax</span>
              <span>₹{Number(invoice.amount_before_tax).toLocaleString("en-IN")}/-</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>CGST {invoice.cgst_rate}%</span>
              <span>+ ₹{Number(invoice.cgst_amount).toLocaleString("en-IN")}/-</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SGST {invoice.sgst_rate}%</span>
              <span>+ ₹{Number(invoice.sgst_amount).toLocaleString("en-IN")}/-</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total Payable Amount</span>
              <span>₹{Number(invoice.total_amount).toLocaleString("en-IN")}/-</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-semibold">Total Amount in words</p>
          <p className="text-sm">{numberToWords(Number(invoice.total_amount))}</p>
        </div>

        {/* Terms */}
        {invoice.terms && (
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2">Terms</p>
            <p className="text-xs text-muted-foreground">{invoice.terms}</p>
          </div>
        )}

        {/* Bank Details */}
        {profile && (
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-semibold mb-2">Bank Details</p>
              <p>Bank Name: {profile.bank_name || "N/A"}</p>
              <p>A/C Name: {profile.account_name || "N/A"}</p>
              <p>A/C No.: {profile.account_number || "N/A"}</p>
              <p>IFSC Code: {profile.ifsc_code || "N/A"}</p>
              {profile.swift_code && <p>Swift Code: {profile.swift_code}</p>}
            </div>
            <div>
              <p className="font-semibold mb-2">Tax Details</p>
              {profile.pan_no && <p>PAN No.: {profile.pan_no}</p>}
              {profile.gstin && <p>GST No.: {profile.gstin}</p>}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
