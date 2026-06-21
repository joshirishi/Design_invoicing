import { DashboardLayout } from "@/components/dashboard-layout"
import { BankStatementUpload } from "@/components/bank-statement-upload"
import { ReconciliationView } from "@/components/reconciliation-view"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

async function getReconciliationData() {
  try {
    const orgId = await getCurrentOrgId()
    const [transactions, payments] = await Promise.all([
      sql`
        SELECT bt.*,
               CASE WHEN p.id IS NOT NULL THEN
                 json_build_object('id', p.id, 'amount', p.amount,
                   'invoice', json_build_object('invoice_number', i.invoice_number))
               ELSE NULL END as payment
        FROM bank_transactions bt
        LEFT JOIN payments p ON bt.payment_id = p.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE bt.org_id = ${orgId}
        ORDER BY bt.transaction_date DESC
      `,
      sql`
        SELECT p.*, json_build_object('id', i.id, 'invoice_number', i.invoice_number) as invoice
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.org_id = ${orgId} AND p.reconciled = false
        ORDER BY p.payment_date DESC
      `,
    ])
    return { transactions, payments }
  } catch (error) {
    console.error("[reconciliation] Error:", error)
    return { transactions: [], payments: [] }
  }
}

export default async function ReconciliationPage() {
  const { transactions, payments } = await getReconciliationData()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Upload and reconcile your bank statements with payments</p>
        </div>

        <BankStatementUpload />

        <ReconciliationView transactions={transactions} payments={payments} />
      </div>
    </DashboardLayout>
  )
}
