import { sql } from "@/lib/db"
import { PurchasesView } from "@/components/purchases-view"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export default async function PurchasesPage() {
  const orgId = await getCurrentOrgId()
  const [purchases, vendors] = await Promise.all([
    sql`
      SELECT p.*, json_build_object('id', v.id, 'name', v.name, 'gstin', v.gstin) as vendor
      FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.org_id = ${orgId} ORDER BY p.invoice_date DESC
    `.catch(() => []),
    sql`SELECT id, name, gstin, state_code FROM vendors WHERE org_id = ${orgId} ORDER BY name ASC`.catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchases & Input GST</h1>
        <p className="text-muted-foreground">Log expenses with GST paid to vendors — used to calculate net GST payable</p>
      </div>
      <PurchasesView purchases={purchases} vendors={vendors} />
    </div>
  )
}
