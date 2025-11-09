import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const transactions = await sql`
      SELECT bt.*, 
             json_build_object(
               'id', p.id,
               'amount', p.amount,
               'invoice', json_build_object(
                 'invoice_number', i.invoice_number,
                 'tax', i.tax
               )
             ) as payment
      FROM bank_transactions bt
      LEFT JOIN payments p ON bt.matched_payment_id = p.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
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

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json()

    // Insert all transactions
    for (const txn of transactions) {
      await sql`
        INSERT INTO bank_transactions (
          transaction_date, description, amount, balance, 
          category, reconciled
        )
        VALUES (
          ${txn.transaction_date}, ${txn.description}, 
          ${txn.credit || txn.debit || 0}, ${txn.balance},
          ${txn.category || null}, false
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
