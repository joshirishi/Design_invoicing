export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { CapitalGainsView } from "@/components/capital-gains-view"

export default async function CapitalGainsPage() {
  const orgId = await getCurrentOrgId()

  const [entries, accounts] = await Promise.all([
    sql`SELECT * FROM capital_gains_entries WHERE org_id = ${orgId} ORDER BY financial_year DESC, gain_type ASC, symbol ASC`.catch(() => []),
    sql`SELECT * FROM bank_accounts WHERE org_id = ${orgId} ORDER BY created_at ASC`.catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Capital Gains</h1>
        <p className="text-muted-foreground">
          Investment gains from your demat/broker account — kept separate from business revenue for the right ITR schedule
        </p>
      </div>
      <CapitalGainsView entries={entries as any} accounts={accounts as any} />
    </div>
  )
}
