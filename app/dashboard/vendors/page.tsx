export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { VendorsView } from "@/components/vendors-view"

export default async function VendorsPage() {
  const orgId = await getCurrentOrgId()
  const vendors = await sql`
    SELECT * FROM vendors WHERE org_id = ${orgId} ORDER BY name ASC
  `.catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground">Manage vendor master — GSTIN, PAN, and state for ITC and Tally export</p>
      </div>
      <VendorsView vendors={vendors} />
    </div>
  )
}
