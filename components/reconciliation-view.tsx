"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import type { BankTransaction, Payment } from "@/lib/types"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryBadge } from "@/components/category-badge"

interface ReconciliationViewProps {
  transactions: (BankTransaction & { payment?: Payment & { invoice?: { invoice_number: string } } })[]
  payments: (Payment & { invoice?: { invoice_number: string } })[]
}

// Suggest a payment match if credit amount is within ±5% of payment amount
function getSuggestedMatch(creditAmount: number, payments: (Payment & { invoice?: { invoice_number: string } })[]) {
  const tolerance = 0.05
  return payments.find((p) => {
    const diff = Math.abs(Number(p.amount) - creditAmount) / creditAmount
    return diff <= tolerance
  })
}

type TabKey = "credits" | "debits" | "reconciled"

export function ReconciliationView({ transactions, payments }: ReconciliationViewProps) {
  const router = useRouter()
  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({})
  const [isReconciling, setIsReconciling] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("credits")

  const unreconciledCredits = transactions.filter((t) => !t.reconciled && t.credit && Number(t.credit) > 0)
  const unreconciledDebits  = transactions.filter((t) => !t.reconciled && t.debit  && Number(t.debit)  > 0)
  const reconciledTxns      = transactions.filter((t) => t.reconciled)

  const handleReconcile = async (transactionId: string, paymentId: string) => {
    setIsReconciling(transactionId)
    try {
      await fetchFromAPI("/api/reconcile", {
        method: "POST",
        body: JSON.stringify({ transactionId, paymentId }),
      })
      router.refresh()
      setSelectedPayments((prev) => { const s = { ...prev }; delete s[transactionId]; return s })
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
        body: JSON.stringify({ transactionId, paymentId }),
      })
      router.refresh()
    } catch (error) {
      console.error("Error unreconciling:", error)
    } finally {
      setIsReconciling(null)
    }
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "credits",    label: "Incoming (Credits)", count: unreconciledCredits.length },
    { key: "debits",     label: "Outgoing (Debits)",  count: unreconciledDebits.length  },
    { key: "reconciled", label: "Reconciled",          count: reconciledTxns.length      },
  ]

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Unreconciled Credits</p>
          <p className="text-2xl font-bold text-green-600">{unreconciledCredits.length}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Unreconciled Debits</p>
          <p className="text-2xl font-bold text-amber-600">{unreconciledDebits.length}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Reconciled</p>
          <p className="text-2xl font-bold">{reconciledTxns.length}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Credits tab ───────────────────────────────────────────────── */}
      {activeTab === "credits" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              Incoming Money — Match to Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unreconciledCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground">All credit transactions are reconciled.</p>
            ) : (
              <div className="space-y-4">
                {unreconciledCredits.map((transaction) => {
                  const creditAmt = Number(transaction.credit)
                  const suggested = getSuggestedMatch(creditAmt, payments)
                  const selectedId = selectedPayments[transaction.id] || (suggested?.id ?? "")
                  const isWorking = isReconciling === transaction.id
                  const confidencePct = suggested
                    ? Math.round((1 - Math.abs(Number(suggested.amount) - creditAmt) / creditAmt) * 100)
                    : 0

                  return (
                    <div key={transaction.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="font-medium truncate">{transaction.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                          </p>
                          <CategoryBadge
                            transactionId={transaction.id}
                            description={transaction.description || ""}
                            category={transaction.category || "Uncategorized"}
                            source={transaction.category_source ?? undefined}
                          />
                        </div>
                        {transaction.reference_number && (
                          <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                        )}
                        {suggested && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Auto-match suggestion: <strong>{suggested.invoice?.invoice_number || "Payment"}</strong>
                            <span className="text-muted-foreground">({confidencePct}% match)</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-green-600">
                          +₹{creditAmt.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={selectedId}
                          onValueChange={(value) =>
                            setSelectedPayments((prev) => ({ ...prev, [transaction.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select payment" />
                          </SelectTrigger>
                          <SelectContent>
                            {payments.map((payment) => (
                              <SelectItem key={payment.id} value={payment.id}>
                                {payment.invoice?.invoice_number || "Payment"} — ₹
                                {Number(payment.amount).toLocaleString("en-IN")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleReconcile(transaction.id, selectedId || selectedPayments[transaction.id])}
                          disabled={!(selectedId || selectedPayments[transaction.id]) || isWorking}
                        >
                          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                          {!isWorking && "Match"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Debits tab ────────────────────────────────────────────────── */}
      {activeTab === "debits" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-amber-600" />
              Outgoing Money — Expenses &amp; Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unreconciledDebits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unreconciled debit transactions.</p>
            ) : (
              <div className="space-y-3">
                {unreconciledDebits.map((transaction) => {
                  const debitAmt = Number(transaction.debit)
                  const isWorking = isReconciling === transaction.id
                  const desc = (transaction.description || "").toLowerCase()
                  const isCCPayment =
                    desc.includes("infinity") || desc.includes("cc payment") || desc.includes("credit card")

                  return (
                    <div key={transaction.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{transaction.description}</p>
                          {isCCPayment && (
                            <Badge variant="outline" className="text-xs shrink-0">CC Payment</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                          </p>
                          <CategoryBadge
                            transactionId={transaction.id}
                            description={transaction.description || ""}
                            category={transaction.category || "Uncategorized"}
                            source={transaction.category_source ?? undefined}
                          />
                        </div>
                        {transaction.reference_number && (
                          <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-red-600">
                          −₹{debitAmt.toLocaleString("en-IN")}
                        </p>
                      </div>
                      {/* Debits can still be manually reconciled to a payment record */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={selectedPayments[transaction.id] ?? ""}
                          onValueChange={(value) =>
                            setSelectedPayments((prev) => ({ ...prev, [transaction.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Link payment (opt.)" />
                          </SelectTrigger>
                          <SelectContent>
                            {payments.map((payment) => (
                              <SelectItem key={payment.id} value={payment.id}>
                                {payment.invoice?.invoice_number || "Payment"} — ₹
                                {Number(payment.amount).toLocaleString("en-IN")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleReconcile(transaction.id, selectedPayments[transaction.id])
                          }
                          disabled={!selectedPayments[transaction.id] || isWorking}
                        >
                          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                          {!isWorking && "Link"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Reconciled tab ───────────────────────────────────────────── */}
      {activeTab === "reconciled" && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciled Transactions ({reconciledTxns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reconciledTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reconciled transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {reconciledTxns.map((transaction) => {
                  const isCredit = transaction.credit && Number(transaction.credit) > 0
                  const amount = isCredit ? Number(transaction.credit) : Number(transaction.debit)
                  return (
                    <div key={transaction.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <Badge className="bg-green-500/10 text-green-700 shrink-0">Reconciled</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                        </p>
                        {transaction.payment?.invoice?.invoice_number && (
                          <p className="text-sm text-muted-foreground">
                            Matched: {transaction.payment.invoice.invoice_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "−"}₹{amount.toLocaleString("en-IN")}
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
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unmatched Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Invoice Payments ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{payment.invoice?.invoice_number || "Payment"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    ₹{Number(payment.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
