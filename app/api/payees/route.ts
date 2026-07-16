import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const payees = await sql`SELECT * FROM payees WHERE org_id = ${orgId} ORDER BY name ASC`
    return NextResponse.json(payees)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { name, pan_no, payee_type, email, phone } = await request.json()
    if (!name) return NextResponse.json({ error: "Payee name is required" }, { status: 400 })
    const result = await sql`INSERT INTO payees (org_id, name, pan_no, payee_type, email, phone)
      VALUES (${orgId}, ${name}, ${pan_no || null}, ${payee_type || "contractor"}, ${email || null}, ${phone || null})
      RETURNING *`
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, name, pan_no, payee_type, email, phone } = await request.json()
    const result = await sql`UPDATE payees
      SET name = ${name}, pan_no = ${pan_no || null}, payee_type = ${payee_type || "contractor"},
          email = ${email || null}, phone = ${phone || null}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *`
    if (!result[0]) return NextResponse.json({ error: "Payee not found" }, { status: 404 })
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
    await sql`DELETE FROM payees WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
