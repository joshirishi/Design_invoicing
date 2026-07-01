import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

// Test: does force-dynamic + NextRequest + same queries still work?
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const _ = url.searchParams // just access it to simulate bank-transactions behavior
  try {
    const orgId = await getCurrentOrgId()
    const count = await sql`SELECT COUNT(*) AS cnt FROM bank_transactions WHERE org_id = ${orgId}`
    const credits = await sql`SELECT id, credit, reconciled FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false ORDER BY id DESC LIMIT 3`
    return NextResponse.json({ version: "v4", orgId, count, credits })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
