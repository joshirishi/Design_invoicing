import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { getFinancialYear } from "@/lib/financial-year"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const invoices = await sql`
      SELECT i.*,
        json_build_object(
          'id', c.id, 'name', c.name, 'email', c.email,
          'address', c.address, 'gstin', c.gstin, 'state_code', c.state_code
        ) as client
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
      hsn_code, amount_before_tax, cgst_rate, sgst_rate, igst_rate,
      cgst_amount, sgst_amount, igst_amount, total_amount,
      place_of_supply, terms, status, payment_due_days,
      line_items,
    } = body

    const hasLineItems = Array.isArray(line_items) && line_items.length > 0

    const finalAmountBeforeTax = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.amount), 0)
      : Number(amount_before_tax)
    const finalCgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.cgst_amount), 0)
      : Number(cgst_amount || 0)
    const finalSgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.sgst_amount), 0)
      : Number(sgst_amount || 0)
    const finalIgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.igst_amount || 0), 0)
      : Number(igst_amount || 0)
    const finalTotal = finalAmountBeforeTax + finalCgstAmount + finalSgstAmount + finalIgstAmount

    const finalCgstRate = hasLineItems ? Number(line_items[0].cgst_rate) : Number(cgst_rate || 0)
    const finalSgstRate = hasLineItems ? Number(line_items[0].sgst_rate) : Number(sgst_rate || 0)
    const finalIgstRate = hasLineItems ? Number(line_items[0].igst_rate || 0) : Number(igst_rate || 0)
    const finalDescription = hasLineItems ? line_items[0].description : description
    const fy = getFinancialYear(invoice_date || new Date().toISOString())

    const result = await sql`
      INSERT INTO invoices (
        org_id, invoice_number, client_id, invoice_date, service_date, description,
        hsn_code, amount_before_tax,
        cgst_rate, sgst_rate, igst_rate,
        cgst_amount, sgst_amount, igst_amount,
        total_amount, financial_year, place_of_supply,
        terms, status, payment_due_days
      ) VALUES (
        ${orgId}, ${invoice_number}, ${client_id}, ${invoice_date},
        ${service_date || null}, ${finalDescription},
        ${hasLineItems ? null : (hsn_code || null)},
        ${finalAmountBeforeTax},
        ${finalCgstRate}, ${finalSgstRate}, ${finalIgstRate},
        ${finalCgstAmount}, ${finalSgstAmount}, ${finalIgstAmount},
        ${finalTotal}, ${fy}, ${place_of_supply || null},
        ${terms || null}, ${status || "unpaid"}, ${payment_due_days || 7}
      )
      RETURNING *
    `
    const invoice = result[0]

    if (hasLineItems) {
      for (let i = 0; i < line_items.length; i++) {
        const row = line_items[i]
        await sql`
          INSERT INTO invoice_line_items (
            invoice_id, org_id, description, hsn_code,
            quantity, rate,
            cgst_rate, sgst_rate, igst_rate,
            cgst_amount, sgst_amount, igst_amount,
            amount, sort_order
          ) VALUES (
            ${invoice.id}, ${orgId}, ${row.description}, ${row.hsn_code || null},
            ${Number(row.quantity) || 1}, ${Number(row.rate)},
            ${Number(row.cgst_rate || 0)}, ${Number(row.sgst_rate || 0)}, ${Number(row.igst_rate || 0)},
            ${Number(row.cgst_amount || 0)}, ${Number(row.sgst_amount || 0)}, ${Number(row.igst_amount || 0)},
            ${Number(row.amount)}, ${i}
          )
        `
      }
    }

    return NextResponse.json(invoice)
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
