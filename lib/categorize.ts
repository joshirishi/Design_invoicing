// Rule-Based Categorization Engine (tree-based)
//
// Resolves a bank transaction description to a leaf in the `chart_of_accounts` tree by:
//   1. Extracting a "signal" (prefix + meaningful segment) from the description — see
//      lib/parsers/bank-signal.ts for why this is prefix-dependent, not a fixed slash count.
//   2. Walking rules in priority order, trying regex first then keyword per rule
//      (a single pass — so a higher-priority keyword rule can beat a lower-priority
//      regex rule and vice versa, fixing a bug where an old catch-all regex used to
//      swallow everything before keyword rules ever got a chance).
//   3. Rules with a `signalPrefix` only apply to transactions whose extracted prefix matches
//      (e.g. "cash wdl" → Cash in Hand only for ATM/NFS, not any random UPI note).
//   4. Falling back to "Uncategorized" when nothing matches — a candidate for Gemini
//      Flash categorization (see lib/ai-categorize.ts).
import { extractSignal, normalizeForMatch } from "./parsers/bank-signal"

export { extractSignal } from "./parsers/bank-signal"

export interface CategoryRule {
  id: number
  chartAccountId: number
  accountName: string
  signalPrefix: string | null
  matchType: "keyword" | "regex"
  matchValue: string
  priority: number
}

export interface CategorizeResult {
  category: string                              // resolved chart_of_accounts leaf name, or "Uncategorized"
  source: "regex" | "keyword" | "unresolved"
  chartAccountId: number | null
  matchedRule?: number
}

// ── Core engine ──────────────────────────────────────────────────────────────

export function categorize(description: string, rules: CategoryRule[]): CategorizeResult {
  if (!description) return { category: "Uncategorized", source: "unresolved", chartAccountId: null }

  const { prefix } = extractSignal(description)
  const normalized = normalizeForMatch(description)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    // Prefix-scoped rules (e.g. ATM "cash wdl") only apply to matching prefixes
    if (rule.signalPrefix && rule.signalPrefix !== prefix) continue

    if (rule.matchType === "regex") {
      try {
        if (new RegExp(rule.matchValue, "i").test(description)) {
          return { category: rule.accountName, source: "regex", chartAccountId: rule.chartAccountId, matchedRule: rule.id }
        }
      } catch {
        // Invalid regex — skip silently
      }
    } else if (normalized.includes(rule.matchValue.toLowerCase())) {
      return { category: rule.accountName, source: "keyword", chartAccountId: rule.chartAccountId, matchedRule: rule.id }
    }
  }

  return { category: "Uncategorized", source: "unresolved", chartAccountId: null }
}

// ── Fetch rules from DB ───────────────────────────────────────────────────────
// Imported lazily to avoid bundling DB code on the client side.
// NOTE: single-line — multi-line SELECTs with JOINs silently return empty via the exec_sql RPC.

export async function fetchRules(orgId: number): Promise<CategoryRule[]> {
  const { sql } = await import("@/lib/db")
  const rows = await sql`SELECT cr.id, cr.chart_account_id, ca.name AS account_name, cr.signal_prefix, cr.match_type, cr.match_value, cr.priority FROM category_rules cr JOIN chart_of_accounts ca ON cr.chart_account_id = ca.id WHERE cr.chart_account_id IS NOT NULL AND (cr.org_id = ${orgId} OR cr.org_id IS NULL) ORDER BY cr.priority DESC, cr.id ASC`
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    chartAccountId: Number(r.chart_account_id),
    accountName: String(r.account_name),
    signalPrefix: (r.signal_prefix as string | null) ?? null,
    matchType: r.match_type as "keyword" | "regex",
    matchValue: String(r.match_value),
    priority: Number(r.priority),
  }))
}

// ── Learn from user correction ────────────────────────────────────────────────
// When a user manually assigns/corrects a transaction's category, extract the most
// unique word from the description and add it as a learned keyword for that org,
// scoped to the chosen chart_of_accounts leaf.

export async function learnFromCorrection(
  orgId: number,
  description: string,
  chartAccountId: number,
): Promise<void> {
  const { sql } = await import("@/lib/db")

  const stopWords = new Set([
    "neft", "rtgs", "imps", "upi", "from", "payment", "paid", "received", "bank",
    "account", "transfer", "india", "pvt", "ltd", "private", "limited", "towards",
    "being", "with", "your", "this", "that", "have", "been", "will", "just", "more",
    "powered", "solutions", "services", "enterprise", "technologies", "systems",
    "global", "group", "company", "corporation",
  ])

  const { signal } = extractSignal(description)
  const words = signal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))

  if (words.length === 0) return

  // Prefer a word that repeats (often the brand name, e.g. "CURSOR ... CURSOR.COM"),
  // tie-broken by length (more specific / less common words tend to be longer).
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const keyword = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0]

  const existing = await sql`SELECT id FROM category_rules WHERE org_id = ${orgId} AND chart_account_id = ${chartAccountId} AND match_type = 'keyword' AND match_value = ${keyword} LIMIT 1`
  if (existing.length > 0) return

  await sql`INSERT INTO category_rules (org_id, chart_account_id, signal_prefix, match_type, match_value, priority, is_system) VALUES (${orgId}, ${chartAccountId}, NULL, 'keyword', ${keyword}, 8, FALSE)`
}
