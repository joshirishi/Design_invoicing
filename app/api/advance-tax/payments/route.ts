import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

// POST — log an actual advance-tax challan payment (Challan 280).
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { financialYear, paymentDate, amount, challanNumber, notes } = await request.json()

    if (!financialYear || !paymentDate || !amount) {
      return NextResponse.json({ error: "financialYear, paymentDate, and amount are required" }, { status: 400 })
    }

    const result = await sql`INSERT INTO advance_tax_payments (org_id, financial_year, payment_date, amount, challan_number, notes) VALUES (${orgId}, ${financialYear}, ${paymentDate}, ${Number(amount)}, ${challanNumber || null}, ${notes || null}) RETURNING *`
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
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await sql`DELETE FROM advance_tax_payments WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
