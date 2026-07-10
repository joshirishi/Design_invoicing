import { NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules, extractSignal } from "@/lib/categorize"
import { generateReconciliationSuggestions } from "@/lib/reconcile-engine"

export const maxDuration = 300

const UPDATE_BATCH_SIZE = 300

function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}

// POST /api/categorize/backfill — re-run categorization for every bank transaction
// still missing a chart_of_accounts leaf (rules first, then a deduped Gemini Flash pass),
// then re-run suggestion generation across all unreconciled, now-categorized rows.
export async function POST() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))

    // Single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
    const rows = await rawSql(`SELECT id, description FROM bank_transactions WHERE org_id = ${oid} AND ledger_id IS NULL`)

    if (rows.length === 0) {
      const { created: suggestionsCreated } = await generateReconciliationSuggestions(orgId)
      return NextResponse.json({ success: true, total: 0, categorized: 0, aiCategorized: 0, suggestionsCreated })
    }

    const rules = await fetchRules(orgId)
    interface BackfillRow { id: number; description: string; category: string; source: string; chartAccountId: number | null; confidence: number | null }
    const categorized: BackfillRow[] = (rows as { id: number; description: string }[]).map((r) => ({
      id: r.id,
      description: r.description,
      confidence: null,
      ...categorize(r.description, rules),
    }))

    const unresolved = categorized.filter((r) => r.source === "unresolved" && r.description)
    let aiCategorizedCount = 0

    let aiRateLimited = false
    if (unresolved.length > 0) {
      try {
        const { categorizeWithGemini } = await import("@/lib/ai-categorize")
        const uniqueSignals = Array.from(new Set(unresolved.map((r) => extractSignal(r.description).signal || r.description)))
        const aiResults = await categorizeWithGemini(uniqueSignals, orgId)

        for (const r of categorized) {
          if (r.source !== "unresolved") continue
          const signal = extractSignal(r.description).signal || r.description
          const ai = aiResults.get(signal)
          if (!ai) continue
          r.category = ai.accountName
          r.source = "ai"
          r.chartAccountId = ai.chartAccountId
          r.confidence = ai.confidence
          aiCategorizedCount++
        }
      } catch (err: any) {
        console.error("[categorize/backfill] Gemini categorization skipped:", err)
        if (err?.message?.toLowerCase().includes("rate") || err?.statusCode === 429) {
          aiRateLimited = true
        }
      }
    }

    const resolvable = categorized.filter((r) => r.chartAccountId != null)

    // Bulk UPDATE via VALUES join, chunked to keep query strings a sane size.
    for (let i = 0; i < resolvable.length; i += UPDATE_BATCH_SIZE) {
      const chunk = resolvable.slice(i, i + UPDATE_BATCH_SIZE)
      const values = chunk.map((r) =>
        `(${r.id}::int, ${esc(r.category)}::text, ${esc(r.source)}::text, ${r.chartAccountId}::int, ${r.confidence != null ? r.confidence : "NULL"}::numeric)`
      ).join(",")

      await rawSql(`UPDATE bank_transactions bt SET category = v.category, category_source = v.source, ledger_id = v.chart_account_id, category_confidence = v.confidence FROM (VALUES ${values}) AS v(id, category, source, chart_account_id, confidence) WHERE bt.id = v.id AND bt.org_id = ${oid}`)
    }

    const { created: suggestionsCreated } = await generateReconciliationSuggestions(orgId)

    return NextResponse.json({
      success: true,
      total: rows.length,
      categorized: resolvable.length,
      aiCategorized: aiCategorizedCount,
      stillUncategorized: rows.length - resolvable.length,
      suggestionsCreated,
      aiRateLimited,
    })
  } catch (error) {
    console.error("[categorize/backfill] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 },
    )
  }
}
