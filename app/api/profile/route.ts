import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const profile = await sql`SELECT * FROM profiles LIMIT 1`
    return NextResponse.json(profile[0] || null)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      full_name,
      email,
      phone,
      address,
      gstin,
      pan_no,
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      swift_code,
      branch,
      bank_address,
    } = body

    const result = await sql`
      UPDATE profiles
      SET business_name = ${full_name},
          email = ${email},
          phone = ${phone},
          address = ${address},
          gstin = ${gstin},
          pan_no = ${pan_no},
          bank_name = ${bank_name},
          account_name = ${account_name},
          account_number = ${account_number},
          ifsc_code = ${ifsc_code},
          swift_code = ${swift_code},
          branch = ${branch},
          bank_address = ${bank_address},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
