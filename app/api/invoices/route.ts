import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const invoices = await sql`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.issue_date DESC
    `
    return NextResponse.json(invoices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice_number, client_id, issue_date, due_date, status, subtotal, tax, total, notes, items } = body

    const result = await sql`
      INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, tax, total, notes, items)
      VALUES (${invoice_number}, ${client_id}, ${issue_date}, ${due_date}, ${status}, ${subtotal}, ${tax}, ${total}, ${notes || null}, ${JSON.stringify(items)})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
