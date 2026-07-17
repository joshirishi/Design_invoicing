export const dynamic = "force-dynamic"

import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { getFinancialYear } from "@/lib/financial-year"
import AccountSummaryView from "@/components/account-summary-view"

export default async function AccountSummaryPage() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const currentFy = getFinancialYear(new Date())

    // Epic 17: exclude personal-flagged accounts from business rollups. Unlinked
    // transactions (account_id IS NULL, e.g. legacy rows) are treated as business.
    const businessOnly = `(account_id IS NULL OR account_id NOT IN (SELECT id FROM bank_accounts WHERE org_id = ${oid} AND is_personal = true))`

    // All queries as single-line rawSql — multi-line sql`` templates fail silently via exec_sql RPC
    const [monthly, byCategory, invoiceRows, purchaseRows, topCounterparties, personalAccountCount, payeeTds, capitalGainsFy] = await Promise.all([
      rawSql(`SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS month, COALESCE(SUM(credit), 0) AS income, COALESCE(SUM(debit), 0) AS expenses FROM bank_transactions WHERE org_id = ${oid} AND ${businessOnly} AND transaction_date >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month ASC`),
      rawSql(`SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*)::int AS count, COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit FROM bank_transactions WHERE org_id = ${oid} AND ${businessOnly} AND transaction_date >= NOW() - INTERVAL '6 months' GROUP BY category ORDER BY total_debit DESC`),
      rawSql(`SELECT COUNT(*)::int AS total_invoices, COALESCE(SUM(total_amount), 0) AS total_billed, COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END), 0) AS collected, COALESCE(SUM(CASE WHEN status='unpaid' THEN total_amount ELSE 0 END), 0) AS outstanding, COALESCE(SUM(cgst_amount + sgst_amount), 0) AS total_gst_collected FROM invoices WHERE org_id = ${oid} AND invoice_date >= NOW() - INTERVAL '6 months'`),
      rawSql(`SELECT COUNT(*)::int AS total_purchases, COALESCE(SUM(amount), 0) AS total_spent, 0 AS total_input_gst FROM purchases WHERE org_id = ${oid} AND invoice_date >= NOW() - INTERVAL '6 months'`),
      // Top Counterparties — bank-activity spend grouping by raw description. Distinct from the
      // formal Payee TDS Summary below, which reads from actual payee_payments records.
      rawSql(`SELECT description, COUNT(*)::int AS txn_count, SUM(debit) AS total_spent FROM bank_transactions WHERE org_id = ${oid} AND ${businessOnly} AND debit > 0 AND transaction_date >= NOW() - INTERVAL '6 months' GROUP BY description ORDER BY total_spent DESC LIMIT 10`),
      rawSql(`SELECT COUNT(*)::int AS count FROM bank_accounts WHERE org_id = ${oid} AND is_personal = true`),
      rawSql(`SELECT p.name AS payee_name, p.payee_type, COALESCE(SUM(pp.amount), 0) AS gross_paid, COALESCE(SUM(pp.tds_amount), 0) AS tds_deducted FROM payee_payments pp JOIN payees p ON p.id = pp.payee_id WHERE pp.org_id = ${oid} AND pp.payment_date >= (SELECT (${currentFy.slice(0, 4)}::int || '-04-01')::date) GROUP BY p.name, p.payee_type ORDER BY gross_paid DESC LIMIT 10`),
      rawSql(`SELECT COALESCE(SUM(gain_amount), 0) AS ytd_gain FROM capital_gains_entries WHERE org_id = ${oid} AND financial_year = '${currentFy}'`),
    ])

    return (
      <AccountSummaryView
        monthly={monthly}
        byCategory={byCategory}
        invoiceSummary={invoiceRows[0] || {}}
        purchaseSummary={purchaseRows[0] || {}}
        topCounterparties={topCounterparties}
        personalAccountCount={Number(personalAccountCount[0]?.count || 0)}
        payeeTds={payeeTds}
        capitalGainsFy={Number(capitalGainsFy[0]?.ytd_gain || 0)}
        financialYear={currentFy}
      />
    )
  } catch (error: any) {
    return <AccountSummaryView error={error.message ?? "Failed to load account summary"} />
  }
}
