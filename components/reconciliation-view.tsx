"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import type { BankTransaction, Payment } from "@/lib/types"
import { fetchFromAPI } from "@/lib/db"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReconciliationViewProps {
  transactions: (BankTransaction & { payment?: Payment & { invoice?: { invoice_number: string } } })[]
  payments: (Payment & { invoice?: { invoice_number: string } })[]
}

export function ReconciliationView({ transactions, payments }: ReconciliationViewProps) {
  const router = useRouter()
  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({})
  const [isReconciling, setIsReconciling] = useState<string | null>(null)

  const handleReconcile = async (transactionId: string, paymentId: string) => {
    setIsReconciling(transactionId)

    try {
      await fetchFromAPI("/api/reconcile", {
        method: "POST",
        body: JSON.stringify({
          transactionId,
          paymentId,
        }),
      })

      router.refresh()
      setSelectedPayments((prev) => {
        const newState = { ...prev }
        delete newState[transactionId]
        return newState
      })
    } catch (error) {
      console.error("Error reconciling:", error)
    } finally {
      setIsReconciling(null)
    }
  }

  const handleUnreconcile = async (transactionId: string, paymentId: string | null) => {
    setIsReconciling(transactionId)

    try {
      await fetchFromAPI("/api/reconcile", {
        method: "DELETE",
        body: JSON.stringify({
          transactionId,
          paymentId,
        }),
      })

      router.refresh()
    } catch (error) {
      console.error("Error unreconciling:", error)
    } finally {
      setIsReconciling(null)
    }
  }

  const unreconciledTransactions = transactions.filter((t) => !t.reconciled && t.credit && Number(t.credit) > 0)
  const reconciledTransactions = transactions.filter((t) => t.reconciled)

  return (
    <div className="space-y-6">
      {/* Unreconciled Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Unreconciled Transactions ({unreconciledTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unreconciledTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">All transactions are reconciled!</p>
          ) : (
            <div className="space-y-4">
              {unreconciledTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                    </p>
                    {transaction.reference_number && (
                      <p className="text-sm text-muted-foreground">Ref: {transaction.reference_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +₹{Number(transaction.credit).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedPayments[transaction.id] || ""}
                      onValueChange={(value) => setSelectedPayments((prev) => ({ ...prev, [transaction.id]: value }))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select payment" />
                      </SelectTrigger>
                      <SelectContent>
                        {payments.map((payment) => (
                          <SelectItem key={payment.id} value={payment.id}>
                            {payment.invoice?.invoice_number || "Payment"} - ₹
                            {Number(payment.amount).toLocaleString("en-IN")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleReconcile(transaction.id, selectedPayments[transaction.id])}
                      disabled={!selectedPayments[transaction.id] || isReconciling === transaction.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isReconciling === transaction.id ? "..." : "Match"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciled Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciled Transactions ({reconciledTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciledTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reconciled transactions yet.</p>
          ) : (
            <div className="space-y-4">
              {reconciledTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.description}</p>
                      <Badge className="bg-green-500/10 text-green-700">Reconciled</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                    </p>
                    {transaction.payment?.invoice?.invoice_number && (
                      <p className="text-sm text-muted-foreground">
                        Matched with: {transaction.payment.invoice.invoice_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +₹{Number(transaction.credit).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnreconcile(transaction.id, transaction.payment_id)}
                    disabled={isReconciling === transaction.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Unmatch
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmatched Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Payments ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{payment.invoice?.invoice_number || "Payment"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="font-bold">₹{Number(payment.amount).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
