"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw, Search } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { CategoryBadge } from "@/components/category-badge"
import { SuggestionsTab } from "@/components/suggestions-tab"

interface BankTxn {
  id: string
  transaction_date: string
  description: string
  reference_number: string | null
  debit: number | null
  credit: number | null
  balance: number | null
  reconciled: boolean
  category: string | null
  category_source: string | null
  category_confidence: number | null
  ledger_id: number | null
  payment_id: string | null
  purchase_id: string | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  invoice_number: string | null
}

interface Account {
  id: number
  nickname: string
}

interface Counts { credits: string; debits: string; reconciled: string }

type TabKey = "credits" | "debits" | "reconciled" | "suggested"

const PAGE = 50

export function ReconciliationView({ payments, accounts = [] }: { payments: Payment[]; accounts?: Account[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("credits")
  const [transactions, setTransactions] = useState<BankTxn[]>([])
  const [counts, setCounts] = useState<Counts>({ credits: "…", debits: "…", reconciled: "…" })
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({})
  const [isReconciling, setIsReconciling] = useState<string | null>(null)
  const [suggestedCount, setSuggestedCount] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [accountId, setAccountId] = useState<string>("all")

  // Debounce search input ~300ms before it triggers a refetch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetch("/api/reconciliation-suggestions")
      .then((r) => r.json())
      .then((rows) => setSuggestedCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => setSuggestedCount(0))
  }, [])

  const fetchPage = useCallback(async (tab: TabKey, pageOffset: number, append = false, q = "", acctId = "all") => {
    if (tab === "suggested") { setLoading(false); return }
    append ? setLoadingMore(true) : setLoading(true)
    setFetchError(null)
    try {
      const qParam = q ? `&q=${encodeURIComponent(q)}` : ""
      const acctParam = acctId !== "all" ? `&account_id=${acctId}` : ""
      const res = await fetch(`/api/bank-transactions?type=${tab}&offset=${pageOffset}&limit=${PAGE}${qParam}${acctParam}`)
      const json = await res.json()
      if (!res.ok) { setFetchError(json.error ?? "Failed to load transactions"); return }
      if (!append) {
        setTransactions(json.transactions ?? [])
        setCounts(json.counts ?? counts)
      } else {
        setTransactions((prev) => [...prev, ...(json.transactions ?? [])])
      }
      setHasMore((json.transactions ?? []).length === PAGE)
      setOffset(pageOffset + PAGE)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(0)
    setTransactions([])
    fetchPage(activeTab, 0, false, debouncedSearch, accountId)
  }, [activeTab, debouncedSearch, accountId, fetchPage])

  const handleReconcile = async (transactionId: string, paymentId: string) => {
    setIsReconciling(transactionId)
    try {
      await fetchFromAPI("/api/reconcile", {
        method: "POST",
        body: JSON.stringify({ transactionId, paymentId }),
      })
      fetchPage(activeTab, 0, false, debouncedSearch, accountId)
      setSelectedPayments((prev) => { const s = { ...prev }; delete s[transactionId]; return s })
    } catch (err) {
      console.error("Reconcile error:", err)
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
      fetchPage(activeTab, 0, false, debouncedSearch, accountId)
    } catch (err) {
      console.error("Unreconcile error:", err)
    } finally {
      setIsReconciling(null)
    }
  }

  const tabs: { key: TabKey; label: string; count: string }[] = [
    { key: "credits",    label: "Incoming (Credits)", count: counts.credits },
    { key: "debits",     label: "Outgoing (Debits)",  count: counts.debits  },
    { key: "reconciled", label: "Reconciled",          count: counts.reconciled },
    { key: "suggested",  label: "Suggested",           count: suggestedCount == null ? "…" : String(suggestedCount) },
  ]

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Unreconciled Credits</p>
          <p className="text-2xl font-bold text-green-600">{counts.credits}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Unreconciled Debits</p>
          <p className="text-2xl font-bold text-amber-600">{counts.debits}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Reconciled</p>
          <p className="text-2xl font-bold">{counts.reconciled}</p>
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
            {t.count !== "…" && Number(t.count) > 0 && (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + account filter — filters the current tab's list only, not Suggested */}
      {activeTab !== "suggested" && (
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {accounts.length > 1 && (
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="flex-1">{fetchError}</span>
          <Button size="sm" variant="outline" onClick={() => fetchPage(activeTab, 0, false, debouncedSearch, accountId)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
          </Button>
        </div>
      )}

      {/* Suggested tab — editable pre-filled invoice/purchase forms */}
      {activeTab === "suggested" && <SuggestionsTab />}

      {/* Loading skeleton */}
      {activeTab !== "suggested" && loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Transaction list */}
      {activeTab !== "suggested" && !loading && !fetchError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {activeTab === "credits"    && <><ArrowUpCircle   className="h-5 w-5 text-green-600" />Incoming Money — Match to Invoices</>}
              {activeTab === "debits"     && <><ArrowDownCircle className="h-5 w-5 text-amber-600" />Outgoing Money — Expenses &amp; Payments</>}
              {activeTab === "reconciled" && <>Reconciled Transactions ({counts.reconciled})</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {activeTab === "credits"    && "No unreconciled credit transactions."}
                {activeTab === "debits"     && "No unreconciled debit transactions."}
                {activeTab === "reconciled" && "No reconciled transactions yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => {
                  const isCredit = activeTab === "credits" || (txn.credit && Number(txn.credit) > 0)
                  const amount = isCredit ? Number(txn.credit) : Number(txn.debit)
                  const isWorking = isReconciling === txn.id
                  const selectedId = selectedPayments[txn.id] ?? ""

                  return (
                    <div key={txn.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="font-medium truncate text-sm">{txn.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.transaction_date).toLocaleDateString("en-IN")}
                          </p>
                          {txn.category && (
                            <CategoryBadge
                              transactionId={txn.id}
                              description={txn.description || ""}
                              category={txn.category}
                              source={txn.category_source ?? undefined}
                              chartAccountId={txn.ledger_id}
                            />
                          )}
                          {activeTab === "reconciled" && txn.payment_id && (
                            <Badge className="bg-green-500/10 text-green-700 text-xs">Matched</Badge>
                          )}
                        </div>
                        {txn.reference_number && (
                          <p className="text-xs text-muted-foreground">Ref: {txn.reference_number}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "−"}₹{amount.toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* Match controls — credits & debits only */}
                      {activeTab !== "reconciled" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={selectedId}
                            onValueChange={(v) => setSelectedPayments((p) => ({ ...p, [txn.id]: v }))}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue placeholder="Link payment" />
                            </SelectTrigger>
                            <SelectContent>
                              {payments.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.invoice_number ?? "Payment"} — ₹{Number(p.amount).toLocaleString("en-IN")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleReconcile(txn.id, selectedId)}
                            disabled={!selectedId || isWorking}
                          >
                            {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            {!isWorking && "Match"}
                          </Button>
                        </div>
                      )}

                      {/* Unmatch — reconciled tab only */}
                      {activeTab === "reconciled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0"
                          onClick={() => handleUnreconcile(txn.id, txn.payment_id)}
                          disabled={isWorking}
                        >
                          {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
                          {!isWorking && "Unmatch"}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchPage(activeTab, offset, true, debouncedSearch, accountId)}
                  disabled={loadingMore}
                >
                  {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</> : "Load More"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unmatched payments sidebar */}
      {payments.length > 0 && activeTab === "credits" && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Unmatched Invoice Payments ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.invoice_number ?? "Payment"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 text-sm">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
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
