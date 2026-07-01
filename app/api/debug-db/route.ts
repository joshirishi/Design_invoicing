import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)
    const limit  = parseInt(searchParams.get("limit")  ?? "50", 10)
    const type   = searchParams.get("type") ?? "credits"

    // Mirror EXACTLY what bank-transactions route does
    let transactions
    if (type === "debits") {
      transactions = await sql`
        SELECT id, transaction_date, description, reference_number,
               debit, credit, balance, reconciled,
               category, category_source, payment_id
        FROM bank_transactions
        WHERE org_id = ${orgId} AND debit > 0 AND reconciled = false
        ORDER BY transaction_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (type === "reconciled") {
      transactions = await sql`
        SELECT id, transaction_date, description, reference_number,
               debit, credit, balance, reconciled,
               category, category_source, payment_id
        FROM bank_transactions
        WHERE org_id = ${orgId} AND reconciled = true
        ORDER BY transaction_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      transactions = await sql`
        SELECT id, transaction_date, description, reference_number,
               debit, credit, balance, reconciled,
               category, category_source, payment_id
        FROM bank_transactions
        WHERE org_id = ${orgId} AND credit > 0 AND reconciled = false
        ORDER BY transaction_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits,
        COUNT(*) FILTER (WHERE debit  > 0 AND reconciled = false) AS debits,
        COUNT(*) FILTER (WHERE reconciled = true)                 AS reconciled
      FROM bank_transactions
      WHERE org_id = ${orgId}
    `

    return NextResponse.json({ orgId, offset, limit, type, transactions, counts: counts[0] ?? null })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
