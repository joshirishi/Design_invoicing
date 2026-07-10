// Gemini Flash fallback categorization.
//
// Only called for transactions the rule engine (lib/categorize.ts) could not resolve.
// Signals are deduped by the caller before reaching here (the same merchant/UPI note
// repeats constantly in real statements), so this runs far fewer calls than one per row.
//
// Per project convention, every LLM call in this app uses Gemini Flash. Routed through the
// Vercel AI Gateway (plain "google/gemini-2.5-flash" model string, authenticated via the
// already-provisioned AI_GATEWAY_API_KEY) rather than @ai-sdk/google directly, since this
// project doesn't have a standalone GOOGLE_GENERATIVE_AI_API_KEY configured.
import { generateObject } from "ai"
import { z } from "zod"
import { sql } from "@/lib/db"

const MODEL_ID = "google/gemini-2.5-flash"
const BATCH_SIZE = 40
// Maximum signals per categorizeWithGemini call. Free AI Gateway tier is rate-limited;
// callers (e.g. backfill) may chunk externally and call again for remaining signals.
const MAX_SIGNALS_PER_CALL = 120

export interface AiCategorizeMatch {
  chartAccountId: number
  accountName: string
  confidence: number
}

interface TreeAccount { id: number; name: string; parentId: number | null }

async function fetchTree(orgId: number): Promise<TreeAccount[]> {
  // Single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
  const rows = await sql`SELECT id, name, parent_id FROM chart_of_accounts WHERE (org_id IS NULL OR org_id = ${orgId}) AND is_active = true ORDER BY id ASC`
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    parentId: r.parent_id == null ? null : Number(r.parent_id),
  }))
}

function buildPath(id: number, byId: Map<number, TreeAccount>): string {
  const node = byId.get(id)
  if (!node) return ""
  const parentPath = node.parentId ? buildPath(node.parentId, byId) : ""
  return parentPath ? `${parentPath} > ${node.name}` : node.name
}

const ResultSchema = z.object({
  results: z.array(
    z.object({
      signal: z.string().describe("Exactly the input signal string this result is for"),
      chartAccountId: z.number().nullable().describe("Best-fit chart of accounts id, or null if genuinely unclear"),
      confidence: z.number().min(0).max(100).describe("0-100 confidence in this categorization"),
    }),
  ),
})

function buildPrompt(signals: string[], tree: { id: number; path: string }[]): string {
  return `You are categorizing Indian bank transaction descriptions into a chart-of-accounts tree for bookkeeping.

Chart of accounts (id: path from root):
${tree.map((t) => `${t.id}: ${t.path}`).join("\n")}

For each signal below, pick the single best-fit chart_account_id from the list above (a leaf or the most specific node you're confident about). These signals are short extracted merchant names, UPI notes, or transaction remarks — not full sentences. If you cannot confidently place it, return chartAccountId: null with a low confidence.

Signals to categorize:
${signals.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

Return one result per signal, using the exact signal text given, with the account id (must be one of the ids listed above, or null) and a 0-100 confidence score.`
}

// Returns a map of signal → best-fit chart_of_accounts match. Signals with no
// confident match (or if the API key is missing/the call fails) are simply absent.
export async function categorizeWithGemini(
  signals: string[],
  orgId: number,
): Promise<Map<string, AiCategorizeMatch>> {
  const out = new Map<string, AiCategorizeMatch>()
  if (signals.length === 0) return out
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("[ai-categorize] Neither AI_GATEWAY_API_KEY nor GOOGLE_GENERATIVE_AI_API_KEY is set — skipping AI categorization")
    return out
  }
  // Honour the per-call cap so callers can invoke again for the remainder.
  const cappedSignals = signals.slice(0, MAX_SIGNALS_PER_CALL)

  const accounts = await fetchTree(orgId)
  if (accounts.length === 0) return out
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const tree = accounts.map((a) => ({ id: a.id, path: buildPath(a.id, byId) }))
  const validIds = new Set(accounts.map((a) => a.id))

  for (let i = 0; i < cappedSignals.length; i += BATCH_SIZE) {
    const batch = cappedSignals.slice(i, i + BATCH_SIZE)
    try {
      const { object } = await generateObject({
        model: MODEL_ID,
        schema: ResultSchema,
        prompt: buildPrompt(batch, tree),
      })
        for (const r of object.results) {
            if (r.chartAccountId != null && validIds.has(r.chartAccountId) && r.confidence >= 35) {
          out.set(r.signal, {
            chartAccountId: r.chartAccountId,
            accountName: byId.get(r.chartAccountId)!.name,
            confidence: r.confidence,
          })
        }
      }
    } catch (err) {
      console.error("[ai-categorize] Gemini batch failed:", err)
    }
  }

  return out
}
