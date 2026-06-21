import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Match a bank transaction with a payment
export async function POST(request: Request) {
  try {
    const { transactionId, paymentId } = await request.json()

    await sql`
      UPDATE bank_transactions
      SET reconciled = true, payment_id = ${paymentId}
      WHERE id = ${transactionId}
    `

    await sql`
      UPDATE payments
      SET reconciled = true, updated_at = NOW()
      WHERE id = ${paymentId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reconciling:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to reconcile" }, { status: 500 })
  }
}

// Unmatch a bank transaction from a payment
export async function DELETE(request: Request) {
  try {
    const { transactionId, paymentId } = await request.json()

    await sql`
      UPDATE bank_transactions
      SET reconciled = false, payment_id = NULL
      WHERE id = ${transactionId}
    `

    if (paymentId) {
      await sql`
        UPDATE payments
        SET reconciled = false, updated_at = NOW()
        WHERE id = ${paymentId}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unreconciling:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unreconcile" },
      { status: 500 },
    )
  }
}
