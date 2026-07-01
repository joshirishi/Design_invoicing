import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    // Absolute minimum: count all rows
    const count = await sql`SELECT COUNT(*) AS cnt FROM bank_transactions WHERE org_id = ${orgId}`
    // Get 3 credits with hardcoded limit
    const credits = await sql`SELECT id, credit, reconciled FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false ORDER BY id DESC LIMIT 3`
    return NextResponse.json({ orgId, count, credits })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
