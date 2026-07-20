"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchFromAPI } from "@/lib/fetch"
import { Calendar, Download, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { getFinancialYear } from "@/lib/financial-year"

interface AccountRow { account_id: number; account_name: string; account_type: string; net: number }

interface FinancialStatements {
  pnl: { income: AccountRow[]; expense: AccountRow[]; totalIncome: number; totalExpense: number; netProfit: number }
  balanceSheet: {
    assets: AccountRow[]; liabilities: AccountRow[]; equity: AccountRow[]
    totalAssets: number; totalLiabilities: number; totalEquityPosted: number
    retainedEarningsComputed: number; totalEquity: number; balanced: boolean
  }
  period: { startDate: string; endDate: string; asOfDate: string }
}

function fmt(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function FinancialStatementsView() {
  const currentFy = getFinancialYear(new Date())
  const fyStart = `${currentFy.slice(0, 4)}-04-01`
  const today = new Date().toISOString().split("T")[0]

  const [startDate, setStartDate] = useState(fyStart)
  const [endDate, setEndDate] = useState(today)
  const [asOfDate, setAsOfDate] = useState(today)
  const [data, setData] = useState<FinancialStatements | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchFromAPI(`/api/financial-statements?startDate=${startDate}&endDate=${endDate}&asOfDate=${asOfDate}`)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exportPnlCsv = () => {
    if (!data) return
    downloadCsv(
      `Profit_Loss_${startDate}_${endDate}.csv`,
      ["Section", "Account", "Amount"],
      [
        ...data.pnl.income.map((r) => ["Income", r.account_name, r.net]),
        ["Income", "Total Income", data.pnl.totalIncome],
        ...data.pnl.expense.map((r) => ["Expense", r.account_name, r.net]),
        ["Expense", "Total Expense", data.pnl.totalExpense],
        ["", "Net Profit", data.pnl.netProfit],
      ],
    )
  }

  const exportBalanceSheetCsv = () => {
    if (!data) return
    const bs = data.balanceSheet
    downloadCsv(
      `Balance_Sheet_${asOfDate}.csv`,
      ["Section", "Account", "Amount"],
      [
        ...bs.assets.map((r) => ["Asset", r.account_name, r.net]),
        ["Asset", "Total Assets", bs.totalAssets],
        ...bs.liabilities.map((r) => ["Liability", r.account_name, r.net]),
        ["Liability", "Total Liabilities", bs.totalLiabilities],
        ...bs.equity.map((r) => ["Equity", r.account_name, r.net]),
        ["Equity", "Retained Earnings (computed)", bs.retainedEarningsComputed],
        ["Equity", "Total Equity", bs.totalEquity],
      ],
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading financial statements…</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label>P&L: From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Balance Sheet: As of</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchData}>Generate</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Both statements are built entirely from your Ledger's journal entries (Dashboard &gt; Books Status).
            If a period looks empty, check that the Ledger shows "Balanced" for it first.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        {/* ── Profit & Loss ─────────────────────────────────────────────── */}
        <TabsContent value="pnl" className="pt-4 space-y-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6 space-y-2 text-sm">
              <p className="font-medium">What is a Profit & Loss statement?</p>
              <p className="text-muted-foreground">
                Also called an Income Statement. It answers one question: over this period, did you make money?
                Every rupee of income (invoices, capital gains) minus every rupee of expense (purchases, payroll,
                rent, everything else) — whatever's left is your real profit, not just cash collected. This is
                different from your bank balance: an unpaid invoice still counts as income here, and an unpaid
                bill still counts as an expense, because accounting tracks what you earned and owe, not just cash
                that's moved.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Income</CardTitle>
              <Button variant="outline" size="sm" onClick={exportPnlCsv} disabled={!data?.pnl.income.length && !data?.pnl.expense.length}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {!data?.pnl.income.length ? (
                <p className="text-sm text-muted-foreground py-4">No income posted to the ledger in this period.</p>
              ) : (
                <div className="space-y-2">
                  {data.pnl.income.map((r) => (
                    <div key={r.account_id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <span>{r.account_name}</span>
                      <span className="font-medium tabular-nums">{fmt(r.net)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2">
                    <span>Total Income</span>
                    <span className="tabular-nums text-green-600">{fmt(data.pnl.totalIncome)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
            <CardContent>
              {!data?.pnl.expense.length ? (
                <p className="text-sm text-muted-foreground py-4">No expenses posted to the ledger in this period.</p>
              ) : (
                <div className="space-y-2">
                  {data.pnl.expense.map((r) => (
                    <div key={r.account_id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <span>{r.account_name}</span>
                      <span className="font-medium tabular-nums">{fmt(r.net)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2">
                    <span>Total Expenses</span>
                    <span className="tabular-nums text-rose-600">{fmt(data.pnl.totalExpense)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Net Profit</span>
                <span className={`text-xl font-bold ${(data?.pnl.netProfit || 0) >= 0 ? "text-green-600" : "text-rose-600"}`}>
                  {(data?.pnl.netProfit || 0) >= 0 ? fmt(data?.pnl.netProfit || 0) : `Loss: ${fmt(Math.abs(data?.pnl.netProfit || 0))}`}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Balance Sheet ─────────────────────────────────────────────── */}
        <TabsContent value="balance-sheet" className="pt-4 space-y-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6 space-y-2 text-sm">
              <p className="font-medium">What is a Balance Sheet?</p>
              <p className="text-muted-foreground">
                A snapshot of what your business owns and owes on one specific date — not a period like P&L.
                <strong> Assets</strong> is everything of value you hold (bank balance, money clients owe you,
                GST credit you can claim). <strong>Liabilities</strong> is everything you owe others (vendors, GST,
                TDS payable). <strong>Equity</strong> is what's left over — the business's real net worth. These
                three must always balance: Assets = Liabilities + Equity. If they don't, something in the ledger
                is wrong.
              </p>
            </CardContent>
          </Card>

          {data && (
            <div
              className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium ${
                data.balanceSheet.balanced
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {data.balanceSheet.balanced ? (
                <><CheckCircle2 className="h-4 w-4 shrink-0" />Assets = Liabilities + Equity — balanced</>
              ) : (
                <><AlertTriangle className="h-4 w-4 shrink-0" />Off by {fmt(Math.abs(data.balanceSheet.totalAssets - (data.balanceSheet.totalLiabilities + data.balanceSheet.totalEquity)))} — check the Ledger's Trial Balance</>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assets</CardTitle>
              <Button variant="outline" size="sm" onClick={exportBalanceSheetCsv} disabled={!data?.balanceSheet.assets.length}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {!data?.balanceSheet.assets.length ? (
                <p className="text-sm text-muted-foreground py-4">No asset activity posted to the ledger yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.balanceSheet.assets.map((r) => (
                    <div key={r.account_id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <span>{r.account_name}</span>
                      <span className="font-medium tabular-nums">{fmt(r.net)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2">
                    <span>Total Assets</span>
                    <span className="tabular-nums">{fmt(data.balanceSheet.totalAssets)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Liabilities</CardTitle></CardHeader>
            <CardContent>
              {!data?.balanceSheet.liabilities.length ? (
                <p className="text-sm text-muted-foreground py-4">No liability activity posted to the ledger yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.balanceSheet.liabilities.map((r) => (
                    <div key={r.account_id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <span>{r.account_name}</span>
                      <span className="font-medium tabular-nums">{fmt(r.net)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2">
                    <span>Total Liabilities</span>
                    <span className="tabular-nums">{fmt(data.balanceSheet.totalLiabilities)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Equity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data?.balanceSheet.equity ?? []).map((r) => (
                  <div key={r.account_id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                    <span>{r.account_name}</span>
                    <span className="font-medium tabular-nums">{fmt(r.net)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm py-1.5 border-b">
                  <span className="flex items-center gap-1.5">
                    Retained Earnings
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <span className="font-medium tabular-nums">{fmt(data?.balanceSheet.retainedEarningsComputed || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2">
                  <span>Total Equity</span>
                  <span className="tabular-nums">{fmt(data?.balanceSheet.totalEquity || 0)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Retained Earnings here is computed live from all-time Profit & Loss (income minus expenses since
                inception) — real accounting "closes" this into a posted ledger entry at year-end, which this
                system doesn't do yet, so it's recalculated fresh every time rather than carried as its own entry.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
