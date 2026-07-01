import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const vendors = await sql`
      SELECT * FROM vendors WHERE org_id = ${orgId} ORDER BY name ASC
    `
    return NextResponse.json(vendors)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { name, gstin, pan_no, state_code, address, email, phone } = await request.json()
    if (!name) return NextResponse.json({ error: "Vendor name is required" }, { status: 400 })
    const result = await sql`
      INSERT INTO vendors (org_id, name, gstin, pan_no, state_code, address, email, phone)
      VALUES (${orgId}, ${name}, ${gstin || null}, ${pan_no || null},
              ${state_code || null}, ${address || null}, ${email || null}, ${phone || null})
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
    const { id, name, gstin, pan_no, state_code, address, email, phone } = await request.json()
    const result = await sql`
      UPDATE vendors
      SET name = ${name}, gstin = ${gstin || null}, pan_no = ${pan_no || null},
          state_code = ${state_code || null}, address = ${address || null},
          email = ${email || null}, phone = ${phone || null}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *
    `
    if (!result[0]) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
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
    await sql`DELETE FROM vendors WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
