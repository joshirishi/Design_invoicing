import { BankStatementUpload } from "@/components/bank-statement-upload"
import { ReconciliationView } from "@/components/reconciliation-view"
import { BackfillButton } from "@/components/backfill-button"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

// Only fetch unmatched payments (small list — used for the match dropdown)
async function getUnmatchedPayments() {
  try {
    const orgId = await getCurrentOrgId()
    const payments = await sql`SELECT p.id, p.amount, p.payment_date, i.invoice_number
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.org_id = ${orgId} AND p.reconciled = false
      ORDER BY p.payment_date DESC
      LIMIT 200`
    return payments
  } catch (error) {
    console.error("[reconciliation] payments error:", error)
    return []
  }
}

export default async function ReconciliationPage() {
  const payments = await getUnmatchedPayments()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Upload and reconcile your bank statements with payments</p>
        </div>
        <BackfillButton />
      </div>

      <BankStatementUpload />

      {/* ReconciliationView fetches transactions client-side with pagination */}
      <ReconciliationView payments={payments as never[]} />
    </div>
  )
}
