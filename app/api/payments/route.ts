import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const payments = await sql`
      SELECT p.*, 
             json_build_object(
               'id', i.id,
               'invoice_number', i.invoice_number,
               'subtotal', i.subtotal,
               'tax', i.tax,
               'total', i.total
             ) as invoice,
             json_build_object(
               'id', c.id,
               'name', c.name
             ) as client
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY p.payment_date DESC
    `

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payments" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const result = await sql`
      INSERT INTO payments (
        invoice_id, amount, payment_date, payment_method, 
        reference_number, notes, reconciled
      )
      VALUES (
        ${data.invoice_id}, ${data.amount}, ${data.payment_date}, 
        ${data.payment_method}, ${data.reference_number}, ${data.notes}, false
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 },
    )
  }
}
