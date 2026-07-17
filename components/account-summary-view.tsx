"use client"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { AlertCircle, TrendingUp, TrendingDown, IndianRupee, FileText, ShoppingBag, Landmark, LineChart as LineChartIcon } from "lucide-react"

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
]

function fmt(n: number | string) {
  const v = Number(n) || 0
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}

interface Props {
  monthly?: Record<string, unknown>[]
  byCategory?: Record<string, unknown>[]
  invoiceSummary?: Record<string, unknown>
  purchaseSummary?: Record<string, unknown>
  topCounterparties?: Record<string, unknown>[]
  personalAccountCount?: number
  payeeTds?: Record<string, unknown>[]
  capitalGainsFy?: number
  financialYear?: string
  error?: string
}

export default function AccountSummaryView({
  monthly = [],
  byCategory = [],
  invoiceSummary = {},
  purchaseSummary = {},
  topCounterparties = [],
  personalAccountCount = 0,
  payeeTds = [],
  capitalGainsFy = 0,
  financialYear,
  error,
}: Props) {
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Summary</h1>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn't load your account summary</p>
            <p className="text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const totalIncome   = monthly.reduce((s, r) => s + Number(r.income   || 0), 0)
  const totalExpenses = monthly.reduce((s, r) => s + Number(r.expenses || 0), 0)
  const netCashflow   = totalIncome - totalExpenses

  // Pie data — top 8 expense categories
  const pieData = byCategory
    .filter((c) => Number(c.total_debit) > 0)
    .slice(0, 8)
    .map((c) => ({ name: c.category as string, value: Number(c.total_debit) }))

  const monthlyChartData = monthly.map((m) => ({
    month: String(m.month || "").slice(5),
    Income:   Number(m.income   || 0),
    Expenses: Number(m.expenses || 0),
  }))

  const kpis = [
    {
      label: "Total Income",
      value: fmt(totalIncome),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Total Expenses",
      value: fmt(totalExpenses),
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
    {
      label: "Net Cash Flow",
      value: fmt(netCashflow),
      icon: IndianRupee,
      color: netCashflow >= 0 ? "text-indigo-600" : "text-orange-600",
      bg: netCashflow >= 0 ? "bg-indigo-50" : "bg-orange-50",
      border: netCashflow >= 0 ? "border-indigo-100" : "border-orange-100",
    },
    {
      label: "Invoices Billed",
      value: fmt(invoiceSummary.total_billed as number),
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Purchases Spent",
      value: fmt(purchaseSummary.total_spent as number),
      icon: ShoppingBag,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Net GST Liability",
      value: fmt(
        Number(invoiceSummary.total_gst_collected || 0) -
        Number(purchaseSummary.total_input_gst || 0)
      ),
      icon: Landmark,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
    },
    {
      label: `Capital Gains${financialYear ? ` (FY${financialYear})` : ""}`,
      value: fmt(capitalGainsFy),
      icon: LineChartIcon,
      color: capitalGainsFy >= 0 ? "text-teal-600" : "text-orange-600",
      bg: capitalGainsFy >= 0 ? "bg-teal-50" : "bg-orange-50",
      border: capitalGainsFy >= 0 ? "border-teal-100" : "border-orange-100",
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Summary</h1>
        <p className="text-gray-500 text-sm mt-1">
          Last 6 months · all figures in INR
          {personalAccountCount > 0 && (
            <span className="text-gray-400"> · business accounts only — {personalAccountCount} personal account{personalAccountCount > 1 ? "s" : ""} excluded</span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} p-4`}>
            <div className={`inline-flex p-2 rounded-lg ${k.bg} mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-xs text-gray-500 leading-tight">{k.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Income vs Expenses</h2>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0)+"K" : v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="Income"   fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No bank transactions yet. Import a statement to see your trends.
            </div>
          )}
        </div>

        {/* Expense pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Spending by Category</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm text-center px-4">
              No categorised expenses yet.
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Category Breakdown</h2>
          {byCategory.length > 0 ? (
            <div className="space-y-2">
              {byCategory.slice(0, 10).map((c, i) => {
                const debit  = Number(c.total_debit  || 0)
                const credit = Number(c.total_credit || 0)
                const maxDebit = Number(byCategory[0].total_debit || 1)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 w-40 truncate">{String(c.category)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${(debit / maxDebit) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <div className="text-right w-20">
                      {debit > 0 && <span className="text-xs text-rose-600 font-medium">-{fmt(debit)}</span>}
                      {credit > 0 && <span className="text-xs text-emerald-600 font-medium ml-1">+{fmt(credit)}</span>}
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{Number(c.count)}×</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available.</p>
          )}
        </div>

        {/* Top counterparties — bank-activity spend grouping, distinct from the formal
            Payee TDS Summary panel below (see components/payees-view.tsx for real payees) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Top Counterparties</h2>
          <p className="text-xs text-gray-400 mb-3">By bank transaction activity — payments linked to a Payee record show up in TDS Summary below instead</p>
          {topCounterparties.length > 0 ? (
            <div className="space-y-2">
              {topCounterparties.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="min-w-0">
                      {p.resolved_name ? (
                        <>
                          <p className="text-sm text-gray-700 truncate max-w-xs">{String(p.resolved_name)}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{String(p.description)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700 truncate max-w-xs">{String(p.description)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-rose-600">{fmt(p.total_spent as number)}</p>
                    <p className="text-xs text-gray-400">{Number(p.txn_count)} txn</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No expense data yet.</p>
          )}
        </div>
      </div>

      {/* Payee TDS Summary — real payee_payments data, distinct from Top Counterparties above */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Payee TDS Summary{financialYear ? ` — FY${financialYear}` : ""}</h2>
        <p className="text-xs text-gray-400 mb-3">Contractor/employee payments and TDS deducted — see Payees for detail</p>
        {payeeTds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-400">
                  <th className="py-2 pr-2 font-medium">Payee</th>
                  <th className="py-2 pr-2 font-medium">Type</th>
                  <th className="py-2 pr-2 font-medium text-right">Gross Paid</th>
                  <th className="py-2 pl-2 font-medium text-right">TDS Deducted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payeeTds.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 font-medium text-gray-700">{String(p.payee_name)}</td>
                    <td className="py-2 pr-2 text-gray-500 capitalize">{String(p.payee_type)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-gray-700">{fmt(p.gross_paid as number)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-gray-700">{fmt(p.tds_deducted as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No payee payments yet this financial year.</p>
        )}
      </div>
    </div>
  )
}
