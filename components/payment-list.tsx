"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Payment } from "@/lib/types"

interface PaymentListProps {
  payments: (Payment & { invoice?: { invoice_number: string }; client?: { name: string } })[]
}

export function PaymentList({ payments }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No payments recorded yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <Card key={payment.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">
                  {payment.invoice?.invoice_number || payment.client?.name || "Payment"}
                </h3>
                {payment.reconciled && <Badge className="bg-green-500/10 text-green-700">Reconciled</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Date: {new Date(payment.payment_date).toLocaleDateString("en-IN")}
              </p>
              {payment.payment_method && (
                <p className="text-sm text-muted-foreground">Method: {payment.payment_method}</p>
              )}
              {payment.reference_number && (
                <p className="text-sm text-muted-foreground">Ref: {payment.reference_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹{Number(payment.amount).toLocaleString("en-IN")}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
