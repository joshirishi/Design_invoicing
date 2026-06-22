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

// GET /api/categorize?org_id=1 — fetch all rules for the org
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = parseInt(searchParams.get("org_id") || "1")

    const rules = await sql`
      SELECT id, category, keywords, regex_pattern, priority, is_system, org_id
      FROM category_rules
      WHERE org_id = ${orgId} OR org_id IS NULL
      ORDER BY priority DESC, category ASC
    `

    // Group by category for UI display
    const grouped: Record<string, { keywords: string[]; priority: number; isSystem: boolean; ruleId: number }> = {}
    for (const r of rules as { category: string; keywords: string[]; priority: number; is_system: boolean; id: number }[]) {
      if (!grouped[r.category]) {
        grouped[r.category] = { keywords: r.keywords, priority: r.priority, isSystem: r.is_system, ruleId: r.id }
      } else {
        grouped[r.category].keywords.push(...r.keywords)
      }
    }

    return NextResponse.json({ rules, grouped })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
