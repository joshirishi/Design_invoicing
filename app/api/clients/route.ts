import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const clients = await sql`
      SELECT * FROM clients WHERE org_id = ${orgId} ORDER BY name ASC
    `
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { name, email, phone, address, gstin } = await request.json()
    const result = await sql`
      INSERT INTO clients (org_id, name, email, phone, address, gstin)
      VALUES (${orgId}, ${name}, ${email || null}, ${phone || null}, ${address || null}, ${gstin || null})
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
    const { id, name, email, phone, address, gstin } = await request.json()
    const result = await sql`
      UPDATE clients
      SET name = ${name}, email = ${email || null}, phone = ${phone || null},
          address = ${address || null}, gstin = ${gstin || null}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
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
    if (!id) return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    await sql`DELETE FROM clients WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
