// GET /api/account-summary?months=6
// Returns income vs expense breakdown by category + monthly trend
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(req.url)
    const months = parseInt(searchParams.get("months") || "6")

    // Monthly income vs expense from bank transactions
    const monthly = await sql`
      SELECT
        TO_CHAR(transaction_date, 'YYYY-MM') AS month,
        COALESCE(SUM(credit), 0)             AS income,
        COALESCE(SUM(debit), 0)              AS expenses
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND transaction_date >= NOW() - INTERVAL '${months} months'
      GROUP BY month
      ORDER BY month ASC
    `

    // Category breakdown for expenses
    const byCategory = await sql`
      SELECT
        COALESCE(category, 'Uncategorized') AS category,
        COUNT(*)::int                       AS count,
        COALESCE(SUM(debit), 0)             AS total_debit,
        COALESCE(SUM(credit), 0)            AS total_credit
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND transaction_date >= NOW() - INTERVAL '${months} months'
      GROUP BY category
      ORDER BY total_debit DESC
    `

    // Invoice totals (output GST / receivables)
    const invoiceSummary = await sql`
      SELECT
        COUNT(*)::int                              AS total_invoices,
        COALESCE(SUM(total_amount), 0)             AS total_billed,
        COALESCE(SUM(CASE WHEN status = 'paid'    THEN total_amount ELSE 0 END), 0) AS collected,
        COALESCE(SUM(CASE WHEN status = 'unpaid'  THEN total_amount ELSE 0 END), 0) AS outstanding,
        COALESCE(SUM(cgst_amount + sgst_amount), 0) AS total_gst_collected
      FROM invoices
      WHERE org_id = ${orgId}
        AND invoice_date >= NOW() - INTERVAL '${months} months'
    `

    // Purchase totals (input GST)
    const purchaseSummary = await sql`
      SELECT
        COUNT(*)::int                                  AS total_purchases,
        COALESCE(SUM(amount), 0)                       AS total_spent,
        COALESCE(SUM(cgst + sgst + igst), 0)           AS total_input_gst
      FROM purchases
      WHERE org_id = ${orgId}
        AND invoice_date >= NOW() - INTERVAL '${months} months'
    `

    // Top 5 payees by spend
    const topPayees = await sql`
      SELECT
        description,
        COUNT(*)::int        AS txn_count,
        SUM(debit)           AS total_spent
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND debit > 0
        AND transaction_date >= NOW() - INTERVAL '${months} months'
      GROUP BY description
      ORDER BY total_spent DESC
      LIMIT 10
    `

    return NextResponse.json({
      monthly,
      byCategory,
      invoiceSummary: invoiceSummary[0] || {},
      purchaseSummary: purchaseSummary[0] || {},
      topPayees,
      months,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
