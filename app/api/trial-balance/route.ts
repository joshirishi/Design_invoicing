import { NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { getTrialBalance } from "@/lib/journal"

export const dynamic = "force-dynamic"

// GET /api/trial-balance — US-52: per-account Debit/Credit totals + balanced check.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const rows = await getTrialBalance(orgId)

    const totalDebit = rows.reduce((s, r) => s + Number(r.debit || 0), 0)
    const totalCredit = rows.reduce((s, r) => s + Number(r.credit || 0), 0)
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01

    return NextResponse.json({ rows, totalDebit, totalCredit, balanced })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
