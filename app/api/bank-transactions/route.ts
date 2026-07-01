import { sql, rawSql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"

export const dynamic = "force-dynamic"

// GET /api/bank-transactions?offset=0&limit=50&type=credits|debits|reconciled
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10))
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const type   = searchParams.get("type") ?? "credits"

    // Use rawSql with safe numeric literals — avoids tagged-template interpolation quirks
    const num = (n: number) => String(Math.floor(n))
    const oid = num(orgId)
    const lim = num(limit)
    const off = num(offset)

    let whereClause: string
    if (type === "debits") {
      whereClause = `org_id = ${oid} AND debit > 0 AND reconciled = false`
    } else if (type === "reconciled") {
      whereClause = `org_id = ${oid} AND reconciled = true`
    } else {
      whereClause = `org_id = ${oid} AND credit > 0 AND reconciled = false`
    }

    // Sanity check rawSql works in this route
    const _sanityCount = await rawSql(`SELECT COUNT(*) AS cnt FROM bank_transactions WHERE org_id = ${oid}`)

    const txnQuery = `SELECT id, transaction_date, description, reference_number, debit, credit, balance, reconciled, category, category_source, payment_id FROM bank_transactions WHERE ${whereClause} ORDER BY transaction_date DESC LIMIT ${lim} OFFSET ${off}`

    const transactions = await rawSql(txnQuery)

    const counts = await rawSql(`
      SELECT
        COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits,
        COUNT(*) FILTER (WHERE debit  > 0 AND reconciled = false) AS debits,
        COUNT(*) FILTER (WHERE reconciled = true)                 AS reconciled
      FROM bank_transactions
      WHERE org_id = ${oid}
    `)

    return NextResponse.json({
      _v: "rawSql-v3",
      _at: new Date().toISOString(),
      _orgId: orgId,
      _oid: String(Math.floor(orgId)),
      _sanityCount,
      _txnQuery: txnQuery,
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
