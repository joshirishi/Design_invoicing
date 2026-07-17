import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const entries = await sql`SELECT * FROM capital_gains_entries WHERE org_id = ${orgId} ORDER BY financial_year DESC, gain_type ASC, symbol ASC`
    return NextResponse.json(entries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — link (or unlink) a capital gain entry to a bank transaction (manual
// reconciliation, mirrors the existing manual-match pattern in Epic 5).
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, linked_bank_transaction_id } = await request.json()
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    const result = await sql`UPDATE capital_gains_entries
      SET linked_bank_transaction_id = ${linked_bank_transaction_id || null}
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *`
    if (!result[0]) return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
