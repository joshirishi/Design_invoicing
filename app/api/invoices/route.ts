import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const invoices = await sql`
      SELECT i.*,
        json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'address', c.address, 'gstin', c.gstin) as client
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.org_id = ${orgId}
      ORDER BY i.invoice_date DESC
    `
    return NextResponse.json(invoices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const {
      invoice_number, client_id, invoice_date, service_date, description,
      hsn_code, amount_before_tax, cgst_rate, sgst_rate, cgst_amount,
      sgst_amount, total_amount, terms, status, payment_due_days,
    } = body

    const result = await sql`
      INSERT INTO invoices (
        org_id, invoice_number, client_id, invoice_date, service_date, description,
        hsn_code, amount_before_tax, cgst_rate, sgst_rate, cgst_amount,
        sgst_amount, total_amount, terms, status, payment_due_days
      ) VALUES (
        ${orgId}, ${invoice_number}, ${client_id}, ${invoice_date},
        ${service_date || null}, ${description}, ${hsn_code || null},
        ${amount_before_tax}, ${cgst_rate}, ${sgst_rate}, ${cgst_amount},
        ${sgst_amount}, ${total_amount}, ${terms || null},
        ${status || "unpaid"}, ${payment_due_days || 7}
      )
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { id, status } = body

    const result = await sql`
      UPDATE invoices SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Auto-mark unpaid invoices as overdue when their due date has passed
export async function PATCH() {
  try {
    const orgId = await getCurrentOrgId()
    const result = await sql`
      UPDATE invoices
      SET status = 'overdue', updated_at = NOW()
      WHERE org_id = ${orgId}
        AND status = 'unpaid'
        AND (invoice_date + (payment_due_days || ' days')::interval)::date < CURRENT_DATE
      RETURNING id
    `
    return NextResponse.json({ updated: result.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
