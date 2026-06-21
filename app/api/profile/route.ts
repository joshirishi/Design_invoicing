import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const profile = await sql`SELECT * FROM profiles WHERE org_id = ${orgId} LIMIT 1`
    return NextResponse.json(profile[0] || null)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { full_name, email, phone, address } = body
    const result = await sql`
      INSERT INTO profiles (org_id, full_name, email, phone, address)
      VALUES (${orgId}, ${full_name || null}, ${email || null}, ${phone || null}, ${address || null})
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
    const body = await request.json()
    const {
      id, full_name, email, phone, address, gstin, pan_no,
      bank_name, account_name, account_number, ifsc_code,
      swift_code, branch, bank_address,
    } = body

    const result = await sql`
      UPDATE profiles
      SET full_name = ${full_name || null},
          email = ${email || null},
          phone = ${phone || null},
          address = ${address || null},
          gstin = ${gstin || null},
          pan_no = ${pan_no || null},
          bank_name = ${bank_name || null},
          account_name = ${account_name || null},
          account_number = ${account_number || null},
          ifsc_code = ${ifsc_code || null},
          swift_code = ${swift_code || null},
          branch = ${branch || null},
          bank_address = ${bank_address || null},
          updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
