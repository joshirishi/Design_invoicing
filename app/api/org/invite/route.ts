import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { randomBytes } from "crypto"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const members = await sql`
      SELECT id, user_id, role, invited_email, status, created_at
      FROM org_members
      WHERE org_id = ${orgId}
      ORDER BY created_at ASC
    `
    return NextResponse.json(members)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { email, role = "member" } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const token = randomBytes(32).toString("hex")

    await sql`
      INSERT INTO org_members (org_id, invited_email, role, invite_token, status)
      VALUES (${orgId}, ${email}, ${role}, ${token}, 'pending')
      ON CONFLICT DO NOTHING
    `

    // TODO: send email via Resend with invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accept-invite/${token}`

    return NextResponse.json({ success: true, invite_link: inviteLink, token })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")
    if (!memberId) return NextResponse.json({ error: "Member ID required" }, { status: 400 })

    await sql`DELETE FROM org_members WHERE id = ${memberId} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
