"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2, AlertTriangle, Clock, Loader2, Plus, Trash2 } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { getFinancialYear } from "@/lib/financial-year"

interface Installment { label: string; dueDate: string; cumulativePct: number; cumulativeDue: number; paidByThen: number; shortfall: number; status: "paid" | "overdue" | "upcoming" }
interface Payment { id: number; payment_date: string; amount: number; challan_number: string | null; notes: string | null }
interface AdvanceTaxData {
  financialYear: string
  reference: { netProfit: number; capitalGains: number; tdsCredited: number }
  estimatedTaxLiability: number
  schedule: Installment[]
  payments: Payment[]
}

function fmt(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_META = {
  paid: { icon: CheckCircle2, color: "text-green-600", badge: "bg-green-50 text-green-700 border-green-200", label: "Paid" },
  overdue: { icon: AlertTriangle, color: "text-destructive", badge: "bg-red-50 text-red-700 border-red-200", label: "Overdue" },
  upcoming: { icon: Clock, color: "text-muted-foreground", badge: "bg-slate-50 text-slate-700 border-slate-200", label: "Upcoming" },
} as const

export function AdvanceTaxView() {
  const currentFy = getFinancialYear(new Date())
  const [data, setData] = useState<AdvanceTaxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [liabilityInput, setLiabilityInput] = useState("")
  const [saving, setSaving] = useState(false)

  const [logOpen, setLogOpen] = useState(false)
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [payAmount, setPayAmount] = useState("")
  const [challanNumber, setChallanNumber] = useState("")
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchFromAPI(`/api/advance-tax?fy=${currentFy}`)
      setData(result)
      setLiabilityInput(String(result.estimatedTaxLiability || ""))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveLiability = async () => {
    setSaving(true)
    try {
      await fetchFromAPI("/api/advance-tax", {
        method: "PUT",
        body: JSON.stringify({ financialYear: currentFy, estimatedTaxLiability: Number(liabilityInput) || 0 }),
      })
      await fetchData()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const logPayment = async () => {
    setLogError(null)
    if (!payAmount || Number(payAmount) <= 0) { setLogError("Enter an amount greater than 0"); return }
    setLogging(true)
    try {
      await fetchFromAPI("/api/advance-tax/payments", {
        method: "POST",
        body: JSON.stringify({ financialYear: currentFy, paymentDate: payDate, amount: Number(payAmount), challanNumber: challanNumber || null }),
      })
      setLogOpen(false)
      setPayAmount("")
      setChallanNumber("")
      await fetchData()
    } catch (e: any) {
      setLogError(e.message)
    } finally {
      setLogging(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading advance tax…</div>
  }

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-2 text-sm">
          <p className="font-medium">What is advance tax, and what does this page NOT do?</p>
          <p className="text-muted-foreground">
            If your total tax liability for the year (after TDS already deducted) exceeds ₹10,000, the law
            requires you to pay it in four instalments through the year — <strong>15%</strong> by 15 June,{" "}
            <strong>45%</strong> cumulative by 15 September, <strong>75%</strong> by 15 December, and{" "}
            <strong>100%</strong> by 15 March — rather than all at once when you file. Missing an instalment
            means interest under Sections 234B/234C.
          </p>
          <p className="text-muted-foreground">
            This page does <strong>not</strong> calculate your tax liability — that depends on your tax
            regime, slab, and how capital gains are taxed, which is a decision for you or your CA. Enter your
            own confirmed estimate below; this only tracks the instalment math and whether you're keeping pace.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Reference Figures — FY{currentFy}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Net Profit (P&amp;L, YTD)</p><p className="font-bold">{fmt(data?.reference.netProfit || 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">Capital Gains (YTD)</p><p className="font-bold">{fmt(data?.reference.capitalGains || 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">TDS Already Credited</p><p className="font-bold text-green-600">{fmt(data?.reference.tdsCredited || 0)}</p></div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These come straight from Financial Statements, Capital Gains, and the TDS Summary — use them (plus
            capital-gains tax treatment your CA applies) to arrive at your own liability estimate below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Your Estimated Total Tax Liability for FY{currentFy}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" value={liabilityInput} onChange={(e) => setLiabilityInput(e.target.value)} className="w-48" placeholder="0.00" />
            </div>
            <Button onClick={saveLiability} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Instalment Schedule</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Log Payment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Due By</th>
                  <th className="py-2 pr-2 font-medium text-right">Cumulative %</th>
                  <th className="py-2 pr-2 font-medium text-right">Cumulative Due</th>
                  <th className="py-2 pr-2 font-medium text-right">Paid by Then</th>
                  <th className="py-2 pl-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.schedule || []).map((inst) => {
                  const meta = STATUS_META[inst.status]
                  return (
                    <tr key={inst.label}>
                      <td className="py-2 pr-2 font-medium">{inst.label}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{inst.cumulativePct}%</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmt(inst.cumulativeDue)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmt(inst.paidByThen)}</td>
                      <td className="py-2 pl-2">
                        <Badge variant="outline" className={`text-xs font-normal gap-1 ${meta.badge}`}>
                          <meta.icon className="h-3 w-3" />{meta.label}
                          {inst.status !== "paid" && inst.shortfall > 0 && ` — ${fmt(inst.shortfall)} short`}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!!data?.payments.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payments Logged</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium">{p.payment_date}</p>
                  {p.challan_number && <p className="text-xs text-muted-foreground">Challan {p.challan_number}</p>}
                </div>
                <span className="tabular-nums font-medium">{fmt(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Advance Tax Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Challan Number (Challan 280)</Label>
              <Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} placeholder="CIN / BSR code" />
            </div>
            {logError && <p className="text-sm text-destructive">{logError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={logPayment} disabled={logging}>{logging ? "Saving…" : "Log Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
