// Diagnostic endpoint — call GET to test if invoice_templates INSERT works.
// DELETE this file after debugging is done.

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const steps: Record<string, unknown> = {}
  try {
    // Step 1: get org
    const orgId = await getCurrentOrgId()
    steps.orgId = orgId

    // Step 2: check table exists
    const tableCheck = await sql`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_name = 'invoice_templates'
    `
    steps.tableExists = tableCheck[0]

    // Step 3: try minimal INSERT
    const testConfig = JSON.stringify({ templateId: "t1", test: true })
    const inserted = await sql`
      INSERT INTO invoice_templates (org_id, name, is_default, config)
      VALUES (${orgId}, ${"__debug_test__"}, ${false}, ${testConfig}::jsonb)
      RETURNING id, name
    `
    steps.inserted = inserted[0]

    // Step 4: clean up test row
    await sql`DELETE FROM invoice_templates WHERE name = ${"__debug_test__"}`
    steps.cleaned = true

    return NextResponse.json({ success: true, steps })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e), steps }, { status: 500 })
  }
}
