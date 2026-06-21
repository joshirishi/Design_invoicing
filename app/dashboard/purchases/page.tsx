import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PurchasesView } from "@/components/purchases-view"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export default async function PurchasesPage() {
  const orgId = await getCurrentOrgId()
  const purchases = await sql`
    SELECT * FROM purchases WHERE org_id = ${orgId} ORDER BY invoice_date DESC
  `.catch(() => [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases & Input GST</h1>
          <p className="text-muted-foreground">Log expenses with GST paid to vendors — used to calculate net GST payable</p>
        </div>
        <PurchasesView purchases={purchases} />
      </div>
    </DashboardLayout>
  )
}
