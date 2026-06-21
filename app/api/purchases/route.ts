import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const purchases = await sql`
      SELECT * FROM purchases WHERE org_id = ${orgId} ORDER BY invoice_date DESC
    `
    return NextResponse.json(purchases)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { vendor_name, vendor_gstin, invoice_date, invoice_number, description, amount, cgst, sgst, igst } = body

    const total_with_tax = Number(amount) + Number(cgst) + Number(sgst) + Number(igst)

    const result = await sql`
      INSERT INTO purchases (
        org_id, vendor_name, vendor_gstin, invoice_date, invoice_number,
        description, amount, cgst, sgst, igst, total_with_tax
      ) VALUES (
        ${orgId}, ${vendor_name}, ${vendor_gstin || null}, ${invoice_date},
        ${invoice_number || null}, ${description || null},
        ${amount}, ${cgst || 0}, ${sgst || 0}, ${igst || 0}, ${total_with_tax}
      )
      RETURNING *
    `
    return NextResponse.json(result[0])
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
