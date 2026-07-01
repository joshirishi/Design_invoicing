import { NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const simpleCount = await sql`SELECT COUNT(*) as cnt FROM bank_transactions WHERE org_id = ${orgId}`
    const rawCount = await rawSql(`SELECT COUNT(*) as cnt FROM bank_transactions WHERE org_id = ${orgId}`)
    const rawSelect = await rawSql(`SELECT id, description FROM bank_transactions WHERE org_id = ${orgId} LIMIT 2`)
    return NextResponse.json({ orgId, simpleCount, rawCount, rawSelect })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
