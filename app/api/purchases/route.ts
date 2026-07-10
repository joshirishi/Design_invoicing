import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    // Single-line rawSql — multi-line sql`` with JOINs fails silently via exec_sql RPC
    const purchases = await rawSql(`SELECT p.*, json_build_object('id', v.id, 'name', v.name, 'gstin', v.gstin) as vendor FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE p.org_id = ${oid} ORDER BY p.invoice_date DESC`)
    return NextResponse.json(purchases)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { vendor_id, vendor_name, vendor_gstin, invoice_date, invoice_number, description, amount, cgst, sgst, igst } = body
    const { getFinancialYear } = await import("@/lib/financial-year")

    // If vendor_id provided, pull name + gstin from vendors table
    let resolvedName = vendor_name
    let resolvedGstin = vendor_gstin || null
    if (vendor_id) {
      const vRows = await sql`SELECT name, gstin FROM vendors WHERE id = ${vendor_id} AND org_id = ${orgId}`
      if (vRows[0]) { resolvedName = vRows[0].name; resolvedGstin = vRows[0].gstin }
    }

    const total_with_tax = Number(amount) + Number(cgst || 0) + Number(sgst || 0) + Number(igst || 0)
    const fy = getFinancialYear(invoice_date || new Date().toISOString())

    // rawSql single-line insert + separate fetch — exec_sql doesn't reliably return RETURNING rows
    const q = (v: unknown) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`
    const n = (v: unknown) => v == null ? "NULL" : String(Number(v))
    const oid = String(Math.floor(orgId))
    await rawSql(`INSERT INTO purchases (org_id, vendor_id, vendor_name, vendor_gstin, invoice_date, invoice_number, description, amount, cgst, sgst, igst, total_with_tax, financial_year) VALUES (${oid}, ${vendor_id ? String(Number(vendor_id)) : "NULL"}, ${q(resolvedName)}, ${q(resolvedGstin)}, ${q(invoice_date)}, ${q(invoice_number || null)}, ${q(description || null)}, ${n(amount)}, ${n(cgst || 0)}, ${n(sgst || 0)}, ${n(igst || 0)}, ${n(total_with_tax)}, ${q(fy)})`)
    const fetched = await rawSql(`SELECT * FROM purchases WHERE org_id = ${oid} ORDER BY id DESC LIMIT 1`)
    return NextResponse.json(fetched[0] ?? {})
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    await sql`DELETE FROM purchases WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
