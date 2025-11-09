import { DashboardLayout } from "@/components/dashboard-layout"
import { BankStatementUpload } from "@/components/bank-statement-upload"
import { ReconciliationView } from "@/components/reconciliation-view"

async function getReconciliationData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const [transactionsRes, paymentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/bank-transactions`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/payments?unreconciled=true`, { cache: "no-store" }),
    ])

    const transactions = transactionsRes.ok ? await transactionsRes.json() : []
    const payments = paymentsRes.ok ? await paymentsRes.json() : []

    return { transactions, payments }
  } catch (error) {
    console.error("[v0] Error fetching reconciliation data:", error)
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
