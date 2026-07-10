// POST /api/categorize         — categorize a single description (preview)
// POST /api/categorize/learn   — record a user correction and learn the keyword
import { sql } from "@/lib/db"
import { categorize, fetchRules, learnFromCorrection } from "@/lib/categorize"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Categorize one or many descriptions without saving
export async function POST(req: Request) {
  try {
    const { description, descriptions, org_id = 1 } = await req.json()

    const rules = await fetchRules(org_id)

    if (descriptions && Array.isArray(descriptions)) {
      const results = descriptions.map((d: string) => ({
        description: d,
        ...categorize(d, rules),
      }))
      return NextResponse.json(results)
    }

    const result = categorize(description, rules)
    return NextResponse.json({ description, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET /api/categorize?org_id=1 — fetch all tree-based rules for the org, grouped by account
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = parseInt(searchParams.get("org_id") || "1")

    // Single-line — multi-line SELECTs with JOINs silently return empty via the exec_sql RPC.
    const rules = await sql`SELECT cr.id, cr.chart_account_id, ca.name AS account_name, cr.signal_prefix, cr.match_type, cr.match_value, cr.priority, cr.is_system, cr.org_id FROM category_rules cr JOIN chart_of_accounts ca ON cr.chart_account_id = ca.id WHERE cr.org_id = ${orgId} OR cr.org_id IS NULL ORDER BY cr.priority DESC, ca.name ASC`

    // Group by account for UI display
    type Rule = { id: number; chart_account_id: number; account_name: string; signal_prefix: string | null; match_type: string; match_value: string; priority: number; is_system: boolean }
    const grouped: Record<string, { chartAccountId: number; priority: number; isSystem: boolean; matches: { ruleId: number; prefix: string | null; type: string; value: string }[] }> = {}
    for (const r of rules as unknown as Rule[]) {
      if (!grouped[r.account_name]) {
        grouped[r.account_name] = { chartAccountId: r.chart_account_id, priority: r.priority, isSystem: r.is_system, matches: [] }
      }
      grouped[r.account_name].matches.push({ ruleId: r.id, prefix: r.signal_prefix, type: r.match_type, value: r.match_value })
    }

    return NextResponse.json({ rules, grouped })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
