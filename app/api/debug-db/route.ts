import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const rawLimit = parseInt(new URL(request.url).searchParams.get("limit") ?? "3", 10)

    // Hypothesis: LIMIT with interpolated number fails vs hardcoded
    const hardcoded = await sql`SELECT id, credit FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 ORDER BY id DESC LIMIT 3`
    const interpolated = await sql`SELECT id, credit FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 ORDER BY id DESC LIMIT ${rawLimit}`

    // Also test: is rawLimit actually a number type?
    const limitType = typeof rawLimit
    const limitValue = rawLimit
    const isFinite = Number.isFinite(rawLimit)

    return NextResponse.json({ orgId, hardcoded, interpolated, limitType, limitValue, isFinite })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
