import { sql, rawSql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"

// GET /api/bank-transactions?offset=0&limit=100&type=credits|debits|reconciled
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)
    const limit  = parseInt(searchParams.get("limit")  ?? "100", 10)
    const type   = searchParams.get("type") ?? "all"

    // Build WHERE clause based on type filter
    let filterClause = ""
    if (type === "credits")    filterClause = "AND bt.credit IS NOT NULL AND bt.credit > 0 AND bt.reconciled = false"
    if (type === "debits")     filterClause = "AND bt.debit  IS NOT NULL AND bt.debit  > 0 AND bt.reconciled = false"
    if (type === "reconciled") filterClause = "AND bt.reconciled = true"

    const [transactions, counts] = await Promise.all([
      rawSql(`
        SELECT
          bt.id, bt.transaction_date, bt.description, bt.reference_number,
          bt.debit, bt.credit, bt.balance, bt.reconciled,
          bt.category, bt.category_source, bt.payment_id,
          p.amount AS payment_amount, i.invoice_number AS matched_invoice
        FROM bank_transactions bt
        LEFT JOIN payments p ON bt.payment_id = p.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE bt.org_id = ${orgId}
        ${filterClause}
        ORDER BY bt.transaction_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      rawSql(`
        SELECT
          COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits,
          COUNT(*) FILTER (WHERE debit  > 0 AND reconciled = false) AS debits,
          COUNT(*) FILTER (WHERE reconciled = true)                 AS reconciled
        FROM bank_transactions
        WHERE org_id = ${orgId}
      `),
    ])

    return NextResponse.json({ transactions, counts: counts[0], offset, limit })
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
