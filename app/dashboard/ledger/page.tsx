export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { LedgerView } from "@/components/ledger-view"

export default async function LedgerPage() {
  const orgId = await getCurrentOrgId()
  // NOTE: must be single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
  const accounts = await sql`SELECT * FROM chart_of_accounts WHERE (org_id IS NULL OR org_id = ${orgId}) AND is_active = true ORDER BY CASE type WHEN 'Asset' THEN 1 WHEN 'Liability' THEN 2 WHEN 'Equity' THEN 3 WHEN 'Income' THEN 4 WHEN 'Expense' THEN 5 ELSE 6 END, name ASC`.catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
        <p className="text-muted-foreground">
          Standard ledger accounts mapped to Tally groups — used for exports and CA reporting
        </p>
      </div>
      <LedgerView accounts={accounts} />
    </div>
  )
}
