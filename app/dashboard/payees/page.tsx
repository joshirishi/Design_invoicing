export const dynamic = "force-dynamic"

import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { PayeesView } from "@/components/payees-view"

export default async function PayeesPage() {
  const orgId = await getCurrentOrgId()
  const oid = String(Math.floor(orgId))

  const payees = await sql`SELECT * FROM payees WHERE org_id = ${orgId} ORDER BY name ASC`.catch(() => [])

  // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
  const payments = await rawSql(
    `SELECT pp.*, p.name AS payee_name, p.payee_type, p.pan_no FROM payee_payments pp JOIN payees p ON p.id = pp.payee_id WHERE pp.org_id = ${oid} ORDER BY pp.payment_date DESC, pp.id DESC`,
  ).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payees</h1>
        <p className="text-muted-foreground">
          Employees and contractors you pay for their services — TDS deducted at source, posted to your ledger
        </p>
      </div>
      <PayeesView payees={payees as any} payments={payments as any} />
    </div>
  )
}
