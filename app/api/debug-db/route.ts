import { NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

// Lightweight health-check: confirms DB connectivity and row counts
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const counts = await rawSql(`SELECT COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits, COUNT(*) FILTER (WHERE debit > 0 AND reconciled = false) AS debits, COUNT(*) FILTER (WHERE reconciled = true) AS reconciled FROM bank_transactions WHERE org_id = ${orgId}`)
    return NextResponse.json({ ok: true, orgId, counts: counts[0] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
