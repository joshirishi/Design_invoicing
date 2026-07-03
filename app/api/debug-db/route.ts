import { NextResponse } from "next/server"
import { rawSql, sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

// Health-check + template diagnostics. Visit /api/debug-db to inspect state.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()

    // Bank transaction counts
    const counts = await rawSql(
      `SELECT COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits, COUNT(*) FILTER (WHERE debit > 0 AND reconciled = false) AS debits, COUNT(*) FILTER (WHERE reconciled = true) AS reconciled FROM bank_transactions WHERE org_id = ${orgId}`
    )

    // Invoice template diagnostics
    const tplRows = await sql`
      SELECT id, name, is_default, updated_at,
             CASE WHEN config IS NULL THEN 'null' ELSE pg_typeof(config)::text END AS config_type,
             LEFT(config::text, 80) AS config_preview
      FROM invoice_templates
      WHERE org_id = ${orgId}
      ORDER BY updated_at DESC
    `

    return NextResponse.json({
      ok: true,
      orgId,
      counts: counts[0],
      templates: {
        count: tplRows.length,
        rows: tplRows,
      },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
