import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()

    // Test 1: simple count
    const t1 = await sql`SELECT COUNT(*) as cnt FROM bank_transactions WHERE org_id = ${orgId}`

    // Test 2: credit filter (no JOIN)
    const t2 = await sql`SELECT COUNT(*) as cnt FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false`

    // Test 3: FILTER aggregate
    const t3 = await sql`SELECT COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits, COUNT(*) FILTER (WHERE debit > 0 AND reconciled = false) AS debits FROM bank_transactions WHERE org_id = ${orgId}`

    // Test 4: flat SELECT (no JOIN)
    const t4 = await sql`SELECT id, transaction_date, description, credit, debit, reconciled FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false ORDER BY transaction_date DESC LIMIT 3`

    // Test 5: LIMIT with OFFSET
    const t5 = await sql`SELECT id FROM bank_transactions WHERE org_id = ${orgId} ORDER BY id DESC LIMIT 5 OFFSET 0`

    return NextResponse.json({ orgId, t1, t2, t3, t4, t5 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
