import { sql, rawSql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"
import { resolveCounterpartyName } from "@/lib/reconcile-engine"

export const dynamic = "force-dynamic"

// GET /api/bank-transactions?offset=0&limit=50&type=credits|debits|reconciled
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10))
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const type   = searchParams.get("type") ?? "credits"
    const q      = searchParams.get("q")?.trim()
    const accountIdParam = searchParams.get("account_id")

    // Build WHERE clause using safe numeric-only values (not user input)
    const oid = String(Math.floor(orgId))
    const lim = String(Math.floor(limit))
    const off = String(Math.floor(offset))

    let whereClause: string
    if (type === "debits") {
      whereClause = `org_id = ${oid} AND debit > 0 AND reconciled = false`
    } else if (type === "reconciled") {
      whereClause = `org_id = ${oid} AND reconciled = true`
    } else {
      whereClause = `org_id = ${oid} AND credit > 0 AND reconciled = false`
    }

    // Search filters the list only — counts (tab badges) stay unfiltered totals
    if (q) {
      const safeQ = q.replace(/'/g, "''")
      whereClause += ` AND description ILIKE '%${safeQ}%'`
    }

    if (accountIdParam && /^\d+$/.test(accountIdParam)) {
      whereClause += ` AND account_id = ${accountIdParam}`
    }

    // Single-line rawSql — multi-line template literals cause silent failures via exec_sql RPC
    const transactions = await rawSql(`SELECT id, transaction_date, description, reference_number, debit, credit, balance, reconciled, category, category_source, category_confidence, ledger_id, account_id, payment_id, purchase_id FROM bank_transactions WHERE ${whereClause} ORDER BY transaction_date DESC LIMIT ${lim} OFFSET ${off}`)

    // Resolve counterparty names from any uploaded UPI app statements (see
    // lib/parsers/upi-statement.ts) — display-only, no transactions created.
    const upiContacts = await sql`SELECT vpa, display_name FROM upi_contacts WHERE org_id = ${orgId}`.catch(() => [])
    const transactionsResolved = transactions.map((t) => ({
      ...t,
      resolved_name: upiContacts.length > 0 ? resolveCounterpartyName(String(t.description ?? ""), upiContacts as any) : null,
    }))

    const counts = await rawSql(`SELECT COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits, COUNT(*) FILTER (WHERE debit > 0 AND reconciled = false) AS debits, COUNT(*) FILTER (WHERE reconciled = true) AS reconciled FROM bank_transactions WHERE org_id = ${oid}`)

    return NextResponse.json({
      transactions: transactionsResolved,
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
      const { category, source, chartAccountId } = categorize(txn.description || "", rules)
      await sql`
        INSERT INTO bank_transactions (
          org_id, transaction_date, description, reference_number,
          debit, credit, balance, reconciled, category, category_source, ledger_id
        )
        VALUES (
          ${orgId}, ${txn.transaction_date}, ${txn.description},
          ${txn.reference_number || null},
          ${txn.debit || null}, ${txn.credit || null},
          ${txn.balance || null}, false,
          ${category}, ${source}, ${chartAccountId}
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
