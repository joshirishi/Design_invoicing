import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)
  const limit  = parseInt(searchParams.get("limit") ?? "5", 10)

  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const lim = String(Math.floor(limit))
    const off = String(Math.floor(offset))

    // Test sql tagged template
    const sqlResult = await sql`SELECT id, credit FROM bank_transactions WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false ORDER BY id DESC LIMIT 3`

    // Test rawSql with same query but LIMIT/OFFSET vars
    const rawResult = await rawSql(`SELECT id, credit FROM bank_transactions WHERE org_id = ${oid} AND credit > 0 AND reconciled = false ORDER BY id DESC LIMIT ${lim} OFFSET ${off}`)

    // Test rawSql with the FULL query from bank-transactions route
    const fullRaw = await rawSql(`SELECT id, transaction_date, description, reference_number, debit, credit, balance, reconciled, category, category_source, payment_id FROM bank_transactions WHERE org_id = ${oid} AND credit > 0 AND reconciled = false ORDER BY transaction_date DESC LIMIT ${lim} OFFSET ${off}`)

    return NextResponse.json({ version: "v5", orgId, sqlResult, rawResult, fullRaw })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
