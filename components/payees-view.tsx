"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, UserCog, Search, IndianRupee, Download, Link2 } from "lucide-react"
import type { Payee, PayeePayment } from "@/lib/types"

const TYPE_COLORS: Record<string, string> = {
  employee: "bg-blue-50 text-blue-700 border-blue-200",
  contractor: "bg-purple-50 text-purple-700 border-purple-200",
}

const TDS_RATES: Record<string, number> = { "194J": 10, "194C": 1 }

function formatINR(n: number): string {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Indian FY quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar
function quarterOf(dateStr: string): { fy: string; quarter: string } {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const fyStart = month >= 4 ? year : year - 1
  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`
  const quarter = month >= 4 && month <= 6 ? "Q1" : month >= 7 && month <= 9 ? "Q2" : month >= 10 && month <= 12 ? "Q3" : "Q4"
  return { fy, quarter }
}

function emptyPayeeForm(): Omit<Payee, "id" | "org_id" | "created_at" | "updated_at"> {
  return { name: "", pan_no: null, payee_type: "contractor", email: null, phone: null }
}

export function PayeesView({
  payees: initialPayees,
  payments: initialPayments,
}: {
  payees: Payee[]
  payments: PayeePayment[]
}) {
  const [payees, setPayees] = useState<Payee[]>(initialPayees)
  const [payments, setPayments] = useState<PayeePayment[]>(initialPayments)
  const [search, setSearch] = useState("")

  // Add/Edit Payee dialog
  const [payeeOpen, setPayeeOpen] = useState(false)
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null)
  const [payeeForm, setPayeeForm] = useState(emptyPayeeForm())
  const [savingPayee, setSavingPayee] = useState(false)
  const [payeeError, setPayeeError] = useState<string | null>(null)

  // Record Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payingPayee, setPayingPayee] = useState<Payee | null>(null)
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [tdsSection, setTdsSection] = useState<string>("none")
  const [tdsRate, setTdsRate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // TDS Certificates tab
  const quarterOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of payments) {
      const { fy, quarter } = quarterOf(p.payment_date)
      set.add(`${fy}__${quarter}`)
    }
    return Array.from(set).sort().reverse()
  }, [payments])
  const [selectedQuarter, setSelectedQuarter] = useState<string>(quarterOptions[0] ?? "")

  // Recent Payments — link a payee payment to the bank transaction it corresponds
  // to, so it isn't double-counted as both raw bank activity and a payee record.
  const [linkingPaymentId, setLinkingPaymentId] = useState<number | null>(null)
  const [unmatchedTxns, setUnmatchedTxns] = useState<{ id: string; transaction_date: string; description: string; debit: number | null; resolved_name: string | null }[] | null>(null)

  // Suggested links — best-guess matches, never auto-applied, one click to confirm.
  const [suggestions, setSuggestions] = useState<Map<number, { transactionId: string; confidence: number; transaction: { transaction_date: string; description: string; debit: number; resolved_name: string | null } }>>(new Map())
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch("/api/payee-payments/suggestions")
      .then((r) => r.json())
      .then((rows: { paymentId: number; transactionId: string; confidence: number; transaction: { transaction_date: string; description: string; debit: number; resolved_name: string | null } }[]) => {
        if (!Array.isArray(rows)) return
        setSuggestions(new Map(rows.map((r) => [r.paymentId, { transactionId: r.transactionId, confidence: r.confidence, transaction: r.transaction }])))
      })
      .catch(() => {})
  }, [])

  async function confirmSuggestion(paymentId: number, transactionId: string) {
    setConfirmingId(paymentId)
    try {
      await handleLinkPayment(paymentId, transactionId)
    } finally {
      setConfirmingId(null)
    }
  }

  async function openLinkPayment(paymentId: number) {
    setLinkingPaymentId(paymentId)
    setUnmatchedTxns(null)
    try {
      const res = await fetch("/api/bank-transactions?type=debits&limit=50")
      const json = await res.json()
      setUnmatchedTxns(json.transactions ?? [])
    } catch {
      setUnmatchedTxns([])
    }
  }

  async function handleLinkPayment(paymentId: number, txnId: string | null) {
    try {
      const updated = await fetchFromAPI("/api/payee-payments", {
        method: "PUT",
        body: JSON.stringify({ id: paymentId, linked_bank_transaction_id: txnId }),
      })
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setLinkingPaymentId(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const filtered = payees.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const paymentsByPayee = useMemo(() => {
    const m = new Map<number, PayeePayment[]>()
    for (const p of payments) {
      if (!m.has(p.payee_id)) m.set(p.payee_id, [])
      m.get(p.payee_id)!.push(p)
    }
    return m
  }, [payments])

  const ytdPaid = (payeeId: number) => (paymentsByPayee.get(payeeId) ?? []).reduce((s, p) => s + Number(p.amount), 0)

  const quarterSummary = useMemo(() => {
    if (!selectedQuarter) return []
    const [fy, quarter] = selectedQuarter.split("__")
    const rows = new Map<number, { payee: Payee; gross: number; tds: number }>()
    for (const p of payments) {
      const q = quarterOf(p.payment_date)
      if (q.fy !== fy || q.quarter !== quarter) continue
      const payee = payees.find((py) => py.id === p.payee_id)
      if (!payee) continue
      const existing = rows.get(payee.id) ?? { payee, gross: 0, tds: 0 }
      existing.gross += Number(p.amount)
      existing.tds += Number(p.tds_amount)
      rows.set(payee.id, existing)
    }
    return Array.from(rows.values()).sort((a, b) => a.payee.name.localeCompare(b.payee.name))
  }, [payments, payees, selectedQuarter])

  function openAddPayee() {
    setEditingPayee(null)
    setPayeeForm(emptyPayeeForm())
    setPayeeError(null)
    setPayeeOpen(true)
  }

  function openEditPayee(p: Payee) {
    setEditingPayee(p)
    setPayeeForm({ name: p.name, pan_no: p.pan_no, payee_type: p.payee_type, email: p.email, phone: p.phone })
    setPayeeError(null)
    setPayeeOpen(true)
  }

  async function handleSavePayee() {
    if (!payeeForm.name.trim()) { setPayeeError("Payee name is required"); return }
    setSavingPayee(true); setPayeeError(null)
    try {
      if (editingPayee) {
        const updated = await fetchFromAPI("/api/payees", { method: "PUT", body: JSON.stringify({ id: editingPayee.id, ...payeeForm }) })
        setPayees((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await fetchFromAPI("/api/payees", { method: "POST", body: JSON.stringify(payeeForm) })
        setPayees((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setPayeeOpen(false)
    } catch (e: any) { setPayeeError(e.message) }
    finally { setSavingPayee(false) }
  }

  async function handleDeletePayee(id: number) {
    if (!confirm("Delete this payee? Their payment history will remain but no longer be editable here.")) return
    try {
      await fetchFromAPI(`/api/payees?id=${id}`, { method: "DELETE" })
      setPayees((prev) => prev.filter((p) => p.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  function openRecordPayment(payee: Payee) {
    setPayingPayee(payee)
    setAmount("")
    setPaymentDate(new Date().toISOString().split("T")[0])
    setTdsSection("none")
    setTdsRate("")
    setPaymentMethod("")
    setReferenceNumber("")
    setPaymentError(null)
    setPaymentOpen(true)
  }

  function handleTdsSectionChange(section: string) {
    setTdsSection(section)
    setTdsRate(section === "none" ? "" : String(TDS_RATES[section] ?? 0))
  }

  const grossAmount = Number(amount) || 0
  const effectiveRate = tdsSection === "none" ? 0 : Number(tdsRate) || 0
  const computedTds = Math.round(((grossAmount * effectiveRate) / 100) * 100) / 100
  const computedNet = grossAmount - computedTds

  async function handleRecordPayment() {
    setPaymentError(null)
    if (!payingPayee) return
    if (grossAmount <= 0) { setPaymentError("Amount must be greater than 0"); return }
    setSavingPayment(true)
    try {
      const created = await fetchFromAPI("/api/payee-payments", {
        method: "POST",
        body: JSON.stringify({
          payee_id: payingPayee.id,
          amount: grossAmount,
          tds_section: tdsSection === "none" ? null : tdsSection,
          tds_rate: effectiveRate,
          payment_date: paymentDate,
          payment_method: paymentMethod || null,
          reference_number: referenceNumber || null,
        }),
      })
      setPayments((prev) => [created, ...prev])
      setPaymentOpen(false)
    } catch (e: any) { setPaymentError(e.message) }
    finally { setSavingPayment(false) }
  }

  function exportQuarterCsv() {
    const [fy, quarter] = selectedQuarter.split("__")
    const header = "Payee,PAN,Type,Gross Paid,TDS Deducted,Net Paid,Financial Year,Quarter\n"
    const rows = quarterSummary
      .map((r) =>
        [r.payee.name, r.payee.pan_no ?? "", r.payee.payee_type, r.gross.toFixed(2), r.tds.toFixed(2), (r.gross - r.tds).toFixed(2), fy, quarter]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tds-certificates-${fy}-${quarter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const quarterTotals = quarterSummary.reduce((acc, r) => ({ gross: acc.gross + r.gross, tds: acc.tds + r.tds }), { gross: 0, tds: 0 })

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payees">
        <TabsList>
          <TabsTrigger value="payees">Payees</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tds-certificates">TDS Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="payees" className="pt-4 space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search payees…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={openAddPayee} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />Add Payee
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <UserCog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">{payees.length === 0 ? "No payees yet" : "No payees match your search"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {payees.length === 0 ? "Add employees or contractors you pay for their services." : "Try a different search term."}
                </p>
                {payees.length === 0 && (
                  <Button className="mt-4" size="sm" onClick={openAddPayee}>
                    <Plus className="h-4 w-4 mr-1.5" />Add First Payee
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.name}</p>
                        {p.pan_no && <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.pan_no}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPayee(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeletePayee(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <Badge variant="outline" className={`text-xs font-normal ${TYPE_COLORS[p.payee_type]}`}>
                      {p.payee_type === "employee" ? "Employee" : "Contractor"}
                    </Badge>

                    <p className="text-xs text-muted-foreground">
                      YTD paid: <span className="font-medium text-foreground">₹{formatINR(ytdPaid(p.id))}</span>
                    </p>

                    <Button variant="outline" size="sm" className="w-full" onClick={() => openRecordPayment(p)}>
                      <IndianRupee className="h-3.5 w-3.5 mr-1.5" />Record Payment
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Date</th>
                        <th className="py-2 pr-2 font-medium">Payee</th>
                        <th className="py-2 pr-2 font-medium text-right">Amount</th>
                        <th className="py-2 pr-2 font-medium text-right">TDS</th>
                        <th className="py-2 pl-2 font-medium">Bank Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">{p.payment_date}</td>
                          <td className="py-2 pr-2 font-medium">{payees.find((py) => py.id === p.payee_id)?.name ?? "—"}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">₹{formatINR(p.amount)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{p.tds_amount > 0 ? `₹${formatINR(p.tds_amount)}` : "—"}</td>
                          <td className="py-2 pl-2">
                            {p.linked_bank_transaction_id ? (
                              <Badge variant="secondary" className="text-xs font-normal">Linked</Badge>
                            ) : suggestions.has(p.id) && !dismissedSuggestions.has(p.id) ? (
                              <div className="flex items-center gap-1.5">
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Suggested: </span>
                                  {suggestions.get(p.id)!.transaction.resolved_name && (
                                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{suggestions.get(p.id)!.transaction.resolved_name} · </span>
                                  )}
                                  {suggestions.get(p.id)!.transaction.transaction_date} · ₹{formatINR(suggestions.get(p.id)!.transaction.debit)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  disabled={confirmingId === p.id}
                                  onClick={() => confirmSuggestion(p.id, suggestions.get(p.id)!.transactionId)}
                                >
                                  {confirmingId === p.id ? "…" : "Confirm"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-1.5 text-muted-foreground"
                                  onClick={() => setDismissedSuggestions((prev) => new Set(prev).add(p.id))}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : linkingPaymentId === p.id ? (
                              <Select onValueChange={(v) => handleLinkPayment(p.id, v)}>
                                <SelectTrigger className="h-7 w-56 text-xs"><SelectValue placeholder="Select transaction…" /></SelectTrigger>
                                <SelectContent>
                                  {unmatchedTxns === null ? (
                                    <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                                  ) : unmatchedTxns.length === 0 ? (
                                    <SelectItem value="__none__" disabled>No unmatched debits</SelectItem>
                                  ) : (
                                    unmatchedTxns.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.transaction_date} · ₹{formatINR(t.debit ?? 0)} · {t.resolved_name ? `${t.resolved_name} (${t.description.slice(0, 20)})` : t.description.slice(0, 30)}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openLinkPayment(p.id)}>
                                <Link2 className="h-3 w-3 mr-1" />Link
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tds-certificates" className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {quarterOptions.map((q) => {
                  const [fy, quarter] = q.split("__")
                  return (
                    <SelectItem key={q} value={q}>
                      {quarter} FY{fy}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportQuarterCsv} disabled={quarterSummary.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">TDS Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {quarterSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No payments with TDS in this quarter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Payee</th>
                        <th className="py-2 pr-2 font-medium">PAN</th>
                        <th className="py-2 pr-2 font-medium text-right">Gross Paid</th>
                        <th className="py-2 pl-2 font-medium text-right">TDS Deducted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {quarterSummary.map((r) => (
                        <tr key={r.payee.id}>
                          <td className="py-2 pr-2 font-medium">{r.payee.name}</td>
                          <td className="py-2 pr-2 text-muted-foreground font-mono text-xs">{r.payee.pan_no ?? "—"}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{formatINR(r.gross)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{formatINR(r.tds)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-2 pr-2" colSpan={2}>Total</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatINR(quarterTotals.gross)}</td>
                        <td className="py-2 pl-2 text-right tabular-nums">{formatINR(quarterTotals.tds)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Payee Dialog */}
      <Dialog open={payeeOpen} onOpenChange={setPayeeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayee ? "Edit Payee" : "Add Payee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={payeeForm.name} onChange={(e) => setPayeeForm((f) => ({ ...f, name: e.target.value }))} placeholder="Employee or contractor name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={payeeForm.payee_type} onValueChange={(v) => setPayeeForm((f) => ({ ...f, payee_type: v as Payee["payee_type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>PAN</Label>
                <Input
                  value={payeeForm.pan_no ?? ""}
                  onChange={(e) => setPayeeForm((f) => ({ ...f, pan_no: e.target.value.toUpperCase() || null }))}
                  placeholder="AAGCC1503R"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={payeeForm.email ?? ""} onChange={(e) => setPayeeForm((f) => ({ ...f, email: e.target.value || null }))} placeholder="name@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={payeeForm.phone ?? ""} onChange={(e) => setPayeeForm((f) => ({ ...f, phone: e.target.value || null }))} placeholder="+91-9999999999" />
              </div>
            </div>
            {payeeError && <p className="text-sm text-destructive">{payeeError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayeeOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayee} disabled={savingPayee}>{savingPayee ? "Saving…" : "Save Payee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment — {payingPayee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (gross) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>TDS Section</Label>
              <Select value={tdsSection} onValueChange={handleTdsSectionChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No TDS</SelectItem>
                  <SelectItem value="194J">194J — Professional / consulting services</SelectItem>
                  <SelectItem value="194C">194C — Contract work (maintenance, printing, etc.)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                194J: professional or consulting fees (default 10%) · 194C: contract/labor work, not professional advice (default 1% for individuals)
              </p>
            </div>

            {tdsSection !== "none" && (
              <div className="space-y-1.5">
                <Label>TDS Rate (%)</Label>
                <Input type="number" step="0.01" value={tdsRate} onChange={(e) => setTdsRate(e.target.value)} className="w-28" />
                <p className="text-xs text-muted-foreground">Adjust if this payee is a company (194C is 2%) or has a lower-deduction certificate.</p>
              </div>
            )}

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Gross amount</span><span className="tabular-nums">₹{formatINR(grossAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TDS deducted</span><span className="tabular-nums">₹{formatINR(computedTds)}</span></div>
              <div className="flex justify-between font-semibold"><span>Net payable</span><span className="tabular-nums">₹{formatINR(computedNet)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Bank transfer" />
              </div>
              <div className="space-y-1.5">
                <Label>Reference Number</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="UTR / cheque no." />
              </div>
            </div>

            {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={savingPayment}>{savingPayment ? "Saving…" : "Save Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
