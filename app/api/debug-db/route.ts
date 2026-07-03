import { NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-auth"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

// Health-check + template diagnostics. Visit /api/debug-db to inspect state.
export async function GET() {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()

    // Bank transaction counts (still via exec_sql — SELECT works fine)
    const counts = await rawSql(
      `SELECT COUNT(*) FILTER (WHERE credit > 0 AND reconciled = false) AS credits, COUNT(*) FILTER (WHERE debit > 0 AND reconciled = false) AS debits, COUNT(*) FILTER (WHERE reconciled = true) AS reconciled FROM bank_transactions WHERE org_id = ${orgId}`
    )

    // Invoice template diagnostics via Supabase client (bypasses exec_sql)
    const { data: tplRows, error: tplErr } = await supabase
      .from("invoice_templates")
      .select("id, name, is_default, updated_at, config")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })

    return NextResponse.json({
      ok: true,
      orgId,
      counts: counts[0],
      templates: {
        count: tplRows?.length ?? 0,
        error: tplErr?.message ?? null,
        rows: (tplRows ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          is_default: r.is_default,
          updated_at: r.updated_at,
          config_type: typeof r.config,
          config_preview: JSON.stringify(r.config)?.slice(0, 100),
        })),
      },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
