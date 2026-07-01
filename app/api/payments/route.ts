import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const unreconciled = searchParams.get("unreconciled") === "true"

    const payments = await sql`
      SELECT p.*,
             json_build_object(
               'id', i.id,
               'invoice_number', i.invoice_number,
               'total_amount', i.total_amount,
               'amount_before_tax', i.amount_before_tax
             ) as invoice,
             json_build_object('id', c.id, 'name', c.name) as client
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE p.org_id = ${orgId}
        AND ${unreconciled ? sql`p.reconciled = false` : sql`true`}
      ORDER BY p.payment_date DESC
    `
    return NextResponse.json(payments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const data = await request.json()

    const result = await sql`
      INSERT INTO payments (
        org_id, invoice_id, client_id, amount, payment_date,
        payment_method, reference_number, notes, reconciled,
        tds_amount, tds_section
      )
      VALUES (
        ${orgId}, ${data.invoice_id}, ${data.client_id || null},
        ${data.amount}, ${data.payment_date}, ${data.payment_method || null},
        ${data.reference_number || null}, ${data.notes || null}, false,
        ${Number(data.tds_amount) || 0}, ${data.tds_section || null}
      )
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
