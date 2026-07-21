import { ReconciliationView } from "@/components/reconciliation-view"
import { BackfillButton } from "@/components/backfill-button"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen } from "lucide-react"
import Link from "next/link"
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

async function getAccounts() {
  try {
    const orgId = await getCurrentOrgId()
    return await sql`SELECT id, nickname FROM bank_accounts WHERE org_id = ${orgId} ORDER BY created_at ASC`
  } catch {
    return []
  }
}

export default async function ReconciliationPage() {
  const [payments, accounts] = await Promise.all([getUnmatchedPayments(), getAccounts()])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Upload and reconcile your bank statements with payments</p>
        </div>
        <BackfillButton />
      </div>

      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Bank statements and UPI exports are uploaded from Documents now — this page is for reviewing and
            matching what's already been imported.
          </p>
          <Link href="/dashboard/documents">
            <Button variant="outline" size="sm" className="shrink-0 gap-2">
              <FolderOpen className="h-4 w-4" />
              Add a statement
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* ReconciliationView fetches transactions client-side with pagination */}
      <ReconciliationView payments={payments as never[]} accounts={accounts as any} />
    </div>
  )
}
