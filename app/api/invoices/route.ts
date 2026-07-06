import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { getFinancialYear } from "@/lib/financial-year"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { searchParams } = new URL(request.url)

    // Lightweight duplicate check: GET /api/invoices?check_number=INV-001
    const checkNumber = searchParams.get("check_number")
    if (checkNumber) {
      const safe = checkNumber.replace(/'/g, "''")
      const rows = await rawSql(`SELECT id, invoice_number FROM invoices WHERE org_id = ${oid} AND LOWER(invoice_number) = LOWER('${safe}') LIMIT 1`)
      return NextResponse.json({ exists: rows.length > 0, id: rows[0]?.id ?? null })
    }

    // Single-line rawSql — multi-line sql`` with JOINs fails silently via exec_sql RPC
    const invoices = await rawSql(`SELECT i.id, i.org_id, i.invoice_number, i.client_id, i.invoice_date, i.service_date, i.description, i.hsn_code, i.amount_before_tax, i.cgst_rate, i.sgst_rate, i.igst_rate, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount, i.financial_year, i.place_of_supply, i.terms, i.status, i.payment_due_days, i.import_source, i.created_at, i.updated_at, c.name AS client_name, c.email AS client_email, c.gstin AS client_gstin FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.org_id = ${oid} ORDER BY i.invoice_date DESC`)
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
      invoice_number, client_id, client_name, client_gstin,
      invoice_date, service_date, description,
      hsn_code, amount_before_tax, cgst_rate, sgst_rate, igst_rate,
      cgst_amount, sgst_amount, igst_amount, total_amount,
      place_of_supply, terms, status, payment_due_days,
      line_items, import_source,
    } = body

    // Resolve client: prefer explicit client_id; otherwise find-or-create by name.
    // Uses rawSql single-line queries — exec_sql RPC doesn't reliably return RETURNING rows.
    const oid = String(Math.floor(orgId))
    let resolvedClientId: number | null = client_id ? Number(client_id) : null
    if (!resolvedClientId && client_name?.trim()) {
      const safeName = client_name.trim().replace(/'/g, "''")
      const existing = await rawSql(`SELECT id FROM clients WHERE org_id = ${oid} AND LOWER(name) = LOWER('${safeName}') LIMIT 1`)
      if (existing.length > 0 && existing[0].id) {
        resolvedClientId = Number(existing[0].id)
      } else {
        const safeGstin = (client_gstin || "").replace(/'/g, "''")
        await rawSql(`INSERT INTO clients (org_id, name, gstin) VALUES (${oid}, '${safeName}', ${safeGstin ? `'${safeGstin}'` : "NULL"})`)
        const newClient = await rawSql(`SELECT id FROM clients WHERE org_id = ${oid} AND LOWER(name) = LOWER('${safeName}') ORDER BY id DESC LIMIT 1`)
        resolvedClientId = newClient.length > 0 ? Number(newClient[0].id) : null
      }
    }

    const hasLineItems = Array.isArray(line_items) && line_items.length > 0

    const finalAmountBeforeTax = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
      : Number(amount_before_tax || 0)
    const finalCgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.cgst_amount || 0), 0)
      : Number(cgst_amount || 0)
    const finalSgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.sgst_amount || 0), 0)
      : Number(sgst_amount || 0)
    const finalIgstAmount = hasLineItems
      ? line_items.reduce((s: number, r: any) => s + Number(r.igst_amount || 0), 0)
      : Number(igst_amount || 0)
    const finalTotal = finalAmountBeforeTax + finalCgstAmount + finalSgstAmount + finalIgstAmount

    const finalCgstRate = hasLineItems ? Number(line_items[0]?.cgst_rate || 0) : Number(cgst_rate || 0)
    const finalSgstRate = hasLineItems ? Number(line_items[0]?.sgst_rate || 0) : Number(sgst_rate || 0)
    const finalIgstRate = hasLineItems ? Number(line_items[0]?.igst_rate || 0) : Number(igst_rate || 0)
    const finalDescription = hasLineItems
      ? (line_items[0]?.description ?? description ?? "Invoice")
      : (description ?? "Invoice")
    // Use passed total_amount as fallback when no line items were computed
    const effectiveTotal = finalTotal > 0 ? finalTotal : Number(total_amount || 0)
    const finalDate = invoice_date || new Date().toISOString().split("T")[0]
    const fy = getFinancialYear(finalDate)

    // Build safe literals for rawSql (no user-controlled interpolation except via escaping)
    const q = (v: unknown) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`
    const n = (v: unknown) => v == null ? "NULL" : String(Number(v))

    // Auto-generate invoice number if not provided
    const autoInvNum = invoice_number?.trim() || `INV-${Date.now()}`
    const invNum = `'${autoInvNum.replace(/'/g, "''")}'`
    const clientSql = resolvedClientId ? String(resolvedClientId) : "NULL"
    const descSql = q(finalDescription)
    const hsnSql = (!hasLineItems && hsn_code) ? q(hsn_code) : "NULL"
    const svcSql = q(service_date || null)
    const termsSql = q(terms || null)
    const posSql = q(place_of_supply || null)
    const importSql = q(import_source || null)

    await rawSql(`INSERT INTO invoices (org_id, invoice_number, client_id, invoice_date, service_date, description, hsn_code, amount_before_tax, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, financial_year, place_of_supply, terms, status, payment_due_days, import_source) VALUES (${oid}, ${invNum}, ${clientSql}, '${finalDate}', ${svcSql}, ${descSql}, ${hsnSql}, ${n(finalAmountBeforeTax)}, ${n(finalCgstRate)}, ${n(finalSgstRate)}, ${n(finalIgstRate)}, ${n(finalCgstAmount)}, ${n(finalSgstAmount)}, ${n(finalIgstAmount)}, ${n(effectiveTotal)}, '${fy}', ${posSql}, ${termsSql}, '${(status || "unpaid").replace(/'/g, "''")}', ${n(payment_due_days || 30)}, ${importSql})`)

    // Fetch the saved invoice row (exec_sql doesn't reliably return RETURNING rows)
    const fetched = await rawSql(`SELECT * FROM invoices WHERE org_id = ${oid} ORDER BY id DESC LIMIT 1`)
    const invoice = fetched[0] ?? {}

    if (hasLineItems && invoice.id) {
      for (let i = 0; i < line_items.length; i++) {
        const row = line_items[i]
        const descLi = q(row.description)
        const hsnLi = q(row.hsn_code || null)
        const igstAmt = n(row.igst_amount || 0)
        await rawSql(`INSERT INTO invoice_line_items (invoice_id, description, hsn_code, qty, rate, cgst_rate, sgst_rate, igst_rate, igst_amount, amount, sort_order) VALUES (${invoice.id}, ${descLi}, ${hsnLi}, ${n(row.quantity || 1)}, ${n(row.rate || 0)}, ${n(row.cgst_rate || 0)}, ${n(row.sgst_rate || 0)}, ${n(row.igst_rate || 0)}, ${igstAmt}, ${n(row.amount || 0)}, ${i})`)
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

// DELETE /api/invoices?id=X — permanently delete an invoice and its line items / payments
export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    // Delete child rows first (exec_sql / rawSql for these)
    await rawSql(`DELETE FROM invoice_line_items WHERE invoice_id = ${id}`)
    await rawSql(`DELETE FROM payments WHERE invoice_id = ${id}`)
    await rawSql(`DELETE FROM invoices WHERE id = ${id} AND org_id = ${oid}`)

    return NextResponse.json({ success: true })
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
