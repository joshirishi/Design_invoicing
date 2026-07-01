import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"

export const dynamic = "force-dynamic"

// GET /api/bank-transactions?offset=0&limit=50&type=credits|debits|reconciled
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)
    const limit  = parseInt(searchParams.get("limit")  ?? "50", 10)
    const type   = searchParams.get("type") ?? "credits"

    // Simple flat queries — no JOINs. The sql`` tagged template returns empty
    // when used with LEFT JOINs via the exec_sql RPC layer; plain selects work reliably.
    // matched_invoice is loaded separately when a row is reconciled.
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

    return NextResponse.json({
      transactions,
      counts: counts[0] ?? { credits: 0, debits: 0, reconciled: 0 },
      offset,
      limit,
    })
  } catch (error) {
    console.error("Error fetching bank transactions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { transactions } = await request.json()

    // Load rules once for the whole batch
    const rules = await fetchRules(orgId)

    for (const txn of transactions) {
      const { category, source } = categorize(txn.description || "", rules)
      await sql`
        INSERT INTO bank_transactions (
          org_id, transaction_date, description, reference_number,
          debit, credit, balance, reconciled, category, category_source
        )
        VALUES (
          ${orgId}, ${txn.transaction_date}, ${txn.description},
          ${txn.reference_number || null},
          ${txn.debit || null}, ${txn.credit || null},
          ${txn.balance || null}, false,
          ${category}, ${source}
        )
      `
    }

    return NextResponse.json({ success: true, count: transactions.length })
  } catch (error) {
    console.error("Error uploading transactions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload transactions" },
      { status: 500 },
    )
  }
}
