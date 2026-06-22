// Rule-Based Categorization Engine
// Matches bank transaction descriptions to categories using:
//   1. Priority-ranked keyword search (case-insensitive)
//   2. Regex pattern matching for structured strings (UPI/NEFT/IMPS etc.)
//   3. Learned user corrections stored in category_rules table
//   4. Fallback to "Uncategorized"

export interface CategoryRule {
  id: number
  category: string
  keywords: string[]
  regex_pattern: string | null
  priority: number
}

// ── Core engine ──────────────────────────────────────────────────────────────

export function categorize(description: string, rules: CategoryRule[]): {
  category: string
  source: "keyword" | "regex" | "fallback"
  matchedRule?: number
} {
  if (!description) return { category: "Uncategorized", source: "fallback" }

  // Step A: Normalize — lowercase, collapse whitespace, strip special chars
  const text = description
    .toLowerCase()
    .replace(/[\/\-_|@#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // Sort rules by priority descending (highest priority wins)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  // Step B: Regex patterns first (structured strings like UPI-/NEFT-)
  for (const rule of sorted) {
    if (rule.regex_pattern) {
      try {
        const regex = new RegExp(rule.regex_pattern, "i")
        if (regex.test(description)) {
          // Regex matched on original (preserve casing for UPI IDs etc.)
          return { category: rule.category, source: "regex", matchedRule: rule.id }
        }
      } catch {
        // Invalid regex — skip silently
      }
    }
  }

  // Step C: Keyword matching on normalized text
  for (const rule of sorted) {
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return { category: rule.category, source: "keyword", matchedRule: rule.id }
      }
    }
  }

  // Step D: Fallback
  return { category: "Uncategorized", source: "fallback" }
}

// ── Fetch rules from DB ───────────────────────────────────────────────────────
// Imported lazily to avoid bundling DB code on the client side.

export async function fetchRules(orgId: number): Promise<CategoryRule[]> {
  const { sql } = await import("@/lib/db")
  const rows = await sql`
    SELECT id, category, keywords, regex_pattern, priority
    FROM category_rules
    WHERE org_id = ${orgId} OR org_id IS NULL
    ORDER BY priority DESC, id ASC
  `
  return rows as CategoryRule[]
}

// ── Learn from user correction ────────────────────────────────────────────────
// When a user manually changes a category, extract the most unique word from
// the description and add it as a learned keyword for that org.

export async function learnFromCorrection(
  orgId: number,
  description: string,
  correctedCategory: string
): Promise<void> {
  const { sql } = await import("@/lib/db")

  // Extract candidate keywords: words longer than 4 chars, not common filler
  const stopWords = new Set([
    "neft","rtgs","imps","upi","from","payment","paid","received","bank",
    "account","transfer","india","pvt","ltd","private","limited","towards",
    "being","with","your","this","that","have","been","will","just","more",
  ])

  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))

  if (words.length === 0) return

  // Pick the most specific word (least common = longest first)
  const keyword = words.sort((a, b) => b.length - a.length)[0]

  // Upsert: add keyword to existing org rule, or create new org-level rule
  const existing = await sql`
    SELECT id, keywords FROM category_rules
    WHERE org_id = ${orgId} AND category = ${correctedCategory}
    LIMIT 1
  `

  if (existing.length > 0) {
    const rule = existing[0] as { id: number; keywords: string[] }
    if (!rule.keywords.includes(keyword)) {
      await sql`
        UPDATE category_rules
        SET keywords = array_append(keywords, ${keyword}),
            updated_at = NOW()
        WHERE id = ${rule.id}
      `
    }
  } else {
    await sql`
      INSERT INTO category_rules (org_id, category, keywords, priority, is_system)
      VALUES (${orgId}, ${correctedCategory}, ARRAY[${keyword}], 8, FALSE)
    `
  }
}
