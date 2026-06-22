import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const transactions = await sql`
      SELECT bt.*,
             CASE WHEN p.id IS NOT NULL THEN
               json_build_object(
                 'id', p.id,
                 'amount', p.amount,
                 'invoice', json_build_object(
                   'invoice_number', i.invoice_number,
                   'total_amount', i.total_amount
                 )
               )
             ELSE NULL END as payment
      FROM bank_transactions bt
      LEFT JOIN payments p ON bt.payment_id = p.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE bt.org_id = ${orgId}
      ORDER BY bt.transaction_date DESC
    `

    return NextResponse.json(transactions)
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
