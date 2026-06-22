export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import AccountSummaryView from "@/components/account-summary-view"

export default async function AccountSummaryPage() {
  const orgId = await getCurrentOrgId()
  const months = 6

  const [monthly, byCategory, invoiceRows, purchaseRows, topPayees] = await Promise.all([
    sql`
      SELECT
        TO_CHAR(transaction_date, 'YYYY-MM') AS month,
        COALESCE(SUM(credit), 0)             AS income,
        COALESCE(SUM(debit), 0)              AS expenses
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND transaction_date >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC
    `,
    sql`
      SELECT
        COALESCE(category, 'Uncategorized') AS category,
        COUNT(*)::int                        AS count,
        COALESCE(SUM(debit), 0)              AS total_debit,
        COALESCE(SUM(credit), 0)             AS total_credit
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND transaction_date >= NOW() - INTERVAL '6 months'
      GROUP BY category ORDER BY total_debit DESC
    `,
    sql`
      SELECT
        COUNT(*)::int                              AS total_invoices,
        COALESCE(SUM(total_amount), 0)             AS total_billed,
        COALESCE(SUM(CASE WHEN status='paid'  THEN total_amount ELSE 0 END),0) AS collected,
        COALESCE(SUM(CASE WHEN status='unpaid' THEN total_amount ELSE 0 END),0) AS outstanding,
        COALESCE(SUM(cgst_amount+sgst_amount), 0)  AS total_gst_collected
      FROM invoices WHERE org_id = ${orgId}
        AND invoice_date >= NOW() - INTERVAL '6 months'
    `,
    sql`
      SELECT COUNT(*)::int AS total_purchases,
             COALESCE(SUM(amount),0) AS total_spent,
             COALESCE(SUM(cgst+sgst+igst),0) AS total_input_gst
      FROM purchases WHERE org_id = ${orgId}
        AND invoice_date >= NOW() - INTERVAL '6 months'
    `,
    sql`
      SELECT description, COUNT(*)::int AS txn_count, SUM(debit) AS total_spent
      FROM bank_transactions
      WHERE org_id = ${orgId} AND debit > 0
        AND transaction_date >= NOW() - INTERVAL '6 months'
      GROUP BY description ORDER BY total_spent DESC LIMIT 10
    `,
  ])

  return (
    <AccountSummaryView
      monthly={monthly}
      byCategory={byCategory}
      invoiceSummary={invoiceRows[0] || {}}
      purchaseSummary={purchaseRows[0] || {}}
      topPayees={topPayees}
    />
  )
}
