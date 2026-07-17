import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const accounts = await sql`SELECT * FROM bank_accounts WHERE org_id = ${orgId} ORDER BY created_at ASC`
    return NextResponse.json(accounts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { nickname, account_type, is_personal } = await request.json()
    if (!nickname) return NextResponse.json({ error: "Account nickname is required" }, { status: 400 })
    const result = await sql`INSERT INTO bank_accounts (org_id, nickname, account_type, is_personal)
      VALUES (${orgId}, ${nickname}, ${account_type || "current"}, ${!!is_personal})
      RETURNING *`
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, nickname, account_type, is_personal } = await request.json()
    const result = await sql`UPDATE bank_accounts
      SET nickname = ${nickname}, account_type = ${account_type || "current"}, is_personal = ${!!is_personal}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *`
    if (!result[0]) return NextResponse.json({ error: "Account not found" }, { status: 404 })
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
    await sql`DELETE FROM bank_accounts WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
