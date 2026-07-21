import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { getProfitAndLoss } from "@/lib/journal"
import { getFinancialYear } from "@/lib/financial-year"

export const dynamic = "force-dynamic"

// Statutory cumulative advance-tax schedule for non-presumptive assessees
// (Section 211). Presumptive-taxation filers (44AD/44ADA) can instead pay
// 100% in one instalment by 15 March — not modeled here; if that applies to
// you, treat the earlier instalments as informational only.
function getInstallments(financialYear: string) {
  const startYear = Number(financialYear.slice(0, 4))
  return [
    { label: "15 June", dueDate: `${startYear}-06-15`, cumulativePct: 15 },
    { label: "15 September", dueDate: `${startYear}-09-15`, cumulativePct: 45 },
    { label: "15 December", dueDate: `${startYear}-12-15`, cumulativePct: 75 },
    { label: "15 March", dueDate: `${startYear + 1}-03-15`, cumulativePct: 100 },
  ]
}

// GET /api/advance-tax?fy=2025-26 — reference figures + saved estimate + schedule + payments.
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const financialYear = searchParams.get("fy") || getFinancialYear(new Date())
    const fyStartYear = Number(financialYear.slice(0, 4))
    const fyStart = `${fyStartYear}-04-01`
    const fyEnd = `${fyStartYear + 1}-03-31`
    const today = new Date().toISOString().split("T")[0]

    const [pnl, capitalGainsRows, tdsRows, estimateRows, paymentRows] = await Promise.all([
      getProfitAndLoss(orgId, fyStart, fyEnd),
      sql`SELECT COALESCE(SUM(gain_amount), 0) AS total FROM capital_gains_entries WHERE org_id = ${orgId} AND financial_year = ${financialYear}`,
      sql`SELECT COALESCE(SUM(tds_amount), 0) AS total FROM payments WHERE org_id = ${orgId} AND payment_date >= ${fyStart} AND payment_date <= ${fyEnd}`,
      sql`SELECT * FROM advance_tax_estimates WHERE org_id = ${orgId} AND financial_year = ${financialYear}`,
      sql`SELECT * FROM advance_tax_payments WHERE org_id = ${orgId} AND financial_year = ${financialYear} ORDER BY payment_date ASC`,
    ])

    const netProfit = pnl.netProfit
    const capitalGains = Number(capitalGainsRows[0]?.total || 0)
    const tdsCredited = Number(tdsRows[0]?.total || 0)
    const estimatedTaxLiability = Number(estimateRows[0]?.estimated_tax_liability || 0)

    const schedule = getInstallments(financialYear).map((inst) => {
      const cumulativeDue = Math.max(0, (estimatedTaxLiability * inst.cumulativePct) / 100 - tdsCredited)
      const paidByThen = paymentRows
        .filter((p) => String(p.payment_date) <= inst.dueDate)
        .reduce((s, p) => s + Number(p.amount), 0)
      const shortfall = Math.max(0, cumulativeDue - paidByThen)
      const isPast = today > inst.dueDate
      const status = shortfall <= 0.5 ? "paid" : isPast ? "overdue" : "upcoming"

      return { ...inst, cumulativeDue, paidByThen, shortfall, status }
    })

    return NextResponse.json({
      financialYear,
      reference: { netProfit, capitalGains, tdsCredited },
      estimatedTaxLiability,
      schedule,
      payments: paymentRows,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — save/update the confirmed liability estimate for a financial year.
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { financialYear, estimatedTaxLiability } = await request.json()
    if (!financialYear) return NextResponse.json({ error: "financialYear is required" }, { status: 400 })

    const oid = String(Math.floor(orgId))
    const fy = String(financialYear).replace(/'/g, "''")
    const amount = Number(estimatedTaxLiability) || 0

    // Single-line rawSql with a separate fetch — RETURNING after ON CONFLICT DO UPDATE
    // is exactly the leading-newline / RETURNING combination that silently fails via
    // the exec_sql RPC elsewhere in this codebase.
    await rawSql(
      `INSERT INTO advance_tax_estimates (org_id, financial_year, estimated_tax_liability) VALUES (${oid}, '${fy}', ${amount}) ON CONFLICT (org_id, financial_year) DO UPDATE SET estimated_tax_liability = ${amount}, updated_at = NOW()`,
    )
    const fetched = await rawSql(
      `SELECT * FROM advance_tax_estimates WHERE org_id = ${oid} AND financial_year = '${fy}'`,
    )
    return NextResponse.json(fetched[0] ?? {})
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
