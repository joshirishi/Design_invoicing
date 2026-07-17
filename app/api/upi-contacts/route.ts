import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const contacts = await sql`SELECT id, vpa, display_name, source, created_at FROM upi_contacts WHERE org_id = ${orgId} ORDER BY display_name ASC`
    return NextResponse.json(contacts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
