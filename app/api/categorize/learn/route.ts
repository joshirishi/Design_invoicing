// POST /api/categorize/learn
// Called when a user manually assigns/corrects a transaction's category via the
// tree picker. Persists the chosen chart_of_accounts leaf on the transaction and
// learns a keyword rule so future occurrences auto-match without AI.
import { sql } from "@/lib/db"
import { learnFromCorrection } from "@/lib/categorize"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { transaction_id, description, chart_account_id, org_id = 1 } = await req.json()

    if (!description || !chart_account_id) {
      return NextResponse.json({ error: "description and chart_account_id are required" }, { status: 400 })
    }

    // Resolve the account's display name to keep bank_transactions.category in sync
    const accountRows = await sql`SELECT name FROM chart_of_accounts WHERE id = ${chart_account_id} LIMIT 1`
    const accountName = accountRows[0]?.name as string | undefined
    if (!accountName) {
      return NextResponse.json({ error: "Unknown chart_account_id" }, { status: 404 })
    }

    // Persist on the transaction
    if (transaction_id) {
      await sql`
        UPDATE bank_transactions
        SET category = ${accountName}, category_source = 'user', ledger_id = ${chart_account_id}, category_confidence = NULL
        WHERE id = ${transaction_id}
      `
    }

    // Learn: add a keyword extracted from this description to the org's rule set
    await learnFromCorrection(org_id, description, chart_account_id)

    return NextResponse.json({ success: true, message: `Learned: "${accountName}" for future matches`, category: accountName })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
