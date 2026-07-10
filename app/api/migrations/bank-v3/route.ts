import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Bank v3 migration — Tree-based categorization + auto-reconciliation suggestions.
// Safe to re-run (every step is guarded individually).
//
// IMPORTANT: a `category_rules` table already exists in production (created by hand,
// pre-dating this repo's migrations) with an OLD flat schema:
//   category VARCHAR, keywords TEXT[], regex_pattern TEXT, priority, is_system
// This migration adds the new tree-based columns alongside the old ones, then
// migrates the 16 existing curated rules (~200 keywords) into the new one-row-per-match
// shape, mapped onto chart_of_accounts leaves. Old columns are left in place (unused)
// for audit/rollback rather than dropped.
export async function GET() {
  const results: string[] = []

  async function run(label: string, fn: () => Promise<unknown>) {
    try { await fn(); results.push(`✅ ${label}`) }
    catch (e: any) { results.push(`❌ ${label}: ${e.message}`) }
  }

  async function accountExists(name: string): Promise<boolean> {
    const rows = await sql`SELECT id FROM chart_of_accounts WHERE org_id IS NULL AND name = ${name} LIMIT 1`
    return rows.length > 0
  }

  // ── category_rules: create if missing, then add tree-based columns ─────────
  await run("create category_rules (fresh installs only)", () => sql`
    CREATE TABLE IF NOT EXISTS category_rules (
      id         SERIAL PRIMARY KEY,
      org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      priority   INTEGER NOT NULL DEFAULT 5,
      is_system  BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("category_rules: add chart_account_id", () =>
    sql`ALTER TABLE category_rules ADD COLUMN IF NOT EXISTS chart_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE CASCADE`)
  await run("category_rules: add signal_prefix", () =>
    sql`ALTER TABLE category_rules ADD COLUMN IF NOT EXISTS signal_prefix VARCHAR(20)`)
  await run("category_rules: add match_type", () =>
    sql`ALTER TABLE category_rules ADD COLUMN IF NOT EXISTS match_type VARCHAR(10)`)
  await run("category_rules: add match_value", () =>
    sql`ALTER TABLE category_rules ADD COLUMN IF NOT EXISTS match_value TEXT`)
  // Legacy columns (from the hand-created table) are NOT NULL — new tree-based
  // rows don't populate them, so relax the constraints. Old data keeps its values.
  await run("category_rules: relax category NOT NULL", () =>
    sql`ALTER TABLE category_rules ALTER COLUMN category DROP NOT NULL`)
  await run("category_rules: relax keywords NOT NULL", () =>
    sql`ALTER TABLE category_rules ALTER COLUMN keywords DROP NOT NULL`)
  await run("index category_rules org", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_category_rules_org ON category_rules(org_id)`)
  await run("index category_rules account", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_category_rules_account ON category_rules(chart_account_id)`)

  // ── bank_transactions: expense-side link + AI confidence ────────────────────
  await run("bank_transactions: add purchase_id", () =>
    sql`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL`)
  await run("bank_transactions: add category_confidence", () =>
    sql`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS category_confidence DECIMAL(5,2)`)

  // ── reconciliation_suggestions — editable, human-approved auto-creation ─────
  await run("create reconciliation_suggestions", () => sql`
    CREATE TABLE IF NOT EXISTS reconciliation_suggestions (
      id                  SERIAL PRIMARY KEY,
      org_id              INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      bank_transaction_id INTEGER REFERENCES bank_transactions(id) ON DELETE CASCADE,
      suggestion_type     VARCHAR(10) NOT NULL, -- 'invoice' | 'purchase'
      chart_account_id    INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      suggested_payload   JSONB NOT NULL,
      confidence          DECIMAL(5,2),
      status              VARCHAR(10) NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'dismissed'
      created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("index reconciliation_suggestions org/status", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_recon_suggestions_org_status ON reconciliation_suggestions(org_id, status)`)
  await run("unique reconciliation_suggestions per txn", () =>
    sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_recon_suggestions_txn ON reconciliation_suggestions(bank_transaction_id)`)

  // ── Extend chart_of_accounts with categories real bank statements need ─────
  // ICICI-style personal/proprietor statements mix business + personal spend.
  // Each item is independently idempotent (checked by name) so this list can grow over time.
  const newAccounts: { name: string; type: string; tallyGroup: string; tallyParent: string | null; parentName: string | null }[] = [
    { name: "Personal Expenses",        type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: null },
    { name: "Food & Dining",            type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Groceries",                type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Medical & Health",         type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Shopping & Retail",        type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Entertainment",            type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Education",                type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Household & Personal Care",type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Utilities & Bills",        type: "Expense", tallyGroup: "Indirect Expenses", tallyParent: "Indirect Expenses", parentName: "Personal Expenses" },
    { name: "Refund / Reversal",        type: "Income",  tallyGroup: "Other Income",      tallyParent: "Indirect Income",   parentName: null },
    { name: "Internal Transfer",        type: "Asset",   tallyGroup: "Bank Accounts",     tallyParent: "Current Assets",    parentName: "Bank Account" },
    { name: "Investments",              type: "Asset",   tallyGroup: "Investments",       tallyParent: "Current Assets",    parentName: null },
  ]

  for (const acc of newAccounts) {
    if (await accountExists(acc.name)) {
      results.push(`⏭️  chart_of_accounts '${acc.name}' already present — skipped`)
      continue
    }
    await run(`seed chart account '${acc.name}'`, () =>
      acc.parentName
        ? sql`
            INSERT INTO chart_of_accounts (org_id, name, type, tally_group, tally_parent, parent_id, is_system)
            SELECT NULL, ${acc.name}, ${acc.type}, ${acc.tallyGroup}, ${acc.tallyParent}, id, true
            FROM chart_of_accounts WHERE org_id IS NULL AND name = ${acc.parentName} LIMIT 1
          `
        : sql`
            INSERT INTO chart_of_accounts (org_id, name, type, tally_group, tally_parent, is_system)
            VALUES (NULL, ${acc.name}, ${acc.type}, ${acc.tallyGroup}, ${acc.tallyParent}, true)
          `,
    )
  }

  // ── New prefix-aware system rules (things the old flat list couldn't express) ──
  const prefixRules: { prefix: string | null; matchType: "keyword" | "regex"; matchValue: string; account: string; priority: number }[] = [
    { prefix: "ATM", matchType: "keyword", matchValue: "cash wdl",      account: "Cash in Hand",         priority: 10 },
    { prefix: "NFS", matchType: "keyword", matchValue: "cash wdl",      account: "Cash in Hand",         priority: 10 },
    { prefix: "BIL", matchType: "keyword", matchValue: "credit ca",     account: "Bank OD / CC Account", priority: 10 },
    { prefix: null,  matchType: "regex",   matchValue: "int\\.?\\s*pd", account: "Interest Received",    priority: 10 },
  ]
  const existingPrefixRules = await sql`SELECT signal_prefix, match_value FROM category_rules WHERE is_system = true AND (signal_prefix IS NOT NULL OR match_value ILIKE 'int%pd%')`
  const seenPrefixRule = new Set(existingPrefixRules.map((r) => `${r.signal_prefix ?? ""}::${r.match_value}`))
  for (const r of prefixRules) {
    const key = `${r.prefix ?? ""}::${r.matchValue}`
    if (seenPrefixRule.has(key)) { results.push(`⏭️  rule ${r.matchType}:${r.matchValue} already present — skipped`); continue }
    await run(`seed rule ${r.matchType}:${r.matchValue} → ${r.account}`, () => sql`
      INSERT INTO category_rules (org_id, chart_account_id, signal_prefix, match_type, match_value, priority, is_system)
      SELECT NULL, id, ${r.prefix}, ${r.matchType}, ${r.matchValue}, ${r.priority}, true
      FROM chart_of_accounts WHERE org_id IS NULL AND name = ${r.account} LIMIT 1
    `)
  }

  // ── Migrate the 16 legacy flat-category rules into the new tree-based shape ──
  // Maps each old free-text category to one or more (matchType, matchValue, account)
  // entries. Deliberately drops a few over-broad old keywords (e.g. bare "atm",
  // "interest", "neft", "paytm") that would false-positive against real UPI/NEFT
  // descriptions where those tokens appear in virtually every transaction.
  type Mapping = { matchType: "keyword" | "regex"; matchValue: string; account: string }
  const LEGACY_MAP: Record<string, Mapping[]> = {
    "Income / Salary": [
      ...["salary", "payroll", "wages", "stipend", "professional fees", "consulting fees", "freelance", "retainer"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Service Income" })),
    ],
    "GST Payment": [
      ...["gst", "igst", "cgst", "sgst", "goods and service", "gstn", "gst portal", "tax challan"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Output CGST" })),
    ],
    "Income Tax": [
      ...["income tax", "tds", "advance tax", "self assessment", "tcs", "tax deducted", "itns 280", "challan 280"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Advance Tax Paid" })),
    ],
    "Food & Dining": [
      ...["zomato", "swiggy", "blinkit", "dunzo", "zepto", "dominos", "pizza", "mcdonalds", "burger king", "kfc",
          "subway", "mcdonald", "restaurant", "cafe", "canteen", "food", "dining", "eatery", "biryani", "thali"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Food & Dining" })),
    ],
    "Groceries": [
      ...["bigbasket", "jiomart", "amazon fresh", "dmrt", "dmart", "reliance fresh", "more supermarket",
          "vegetables", "veggies", "fruits", "dairy", "milk", "bread", "grocery", "supermarket", "kirana", "dorabjee"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Groceries" })),
    ],
    "Travel & Transport": [
      ...["uber", "ola", "rapido", "meru", "taxi", "auto", "rickshaw", "metro", "bus", "train", "irctc", "flight",
          "airline", "indigo", "air india", "airport", "toll", "fuel", "petrol", "diesel", "parking"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Travelling Expenses" })),
    ],
    "Medical & Health": [
      ...["apollo", "medplus", "1mg", "pharmeasy", "netmeds", "hospital", "clinic", "doctor", "medical", "pharmacy",
          "medicine", "lab test", "diagnostic", "health", "dentist", "therapy", "physiotherapy"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Medical & Health" })),
    ],
    "Shopping & Retail": [
      ...["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho", "snapdeal", "shopify", "retail", "fashion",
          "clothing", "shoes", "accessories", "decathlon", "croma", "reliance digital"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Shopping & Retail" })),
    ],
    "Utilities & Bills": [
      ...["electricity", "bescom", "msedcl", "tata power", "reliance energy", "water bill", "gas bill", "lpg",
          "cylinder", "piped gas", "mahanagar"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Utilities & Bills" })),
      ...["bsnl", "airtel", "jio", "vodafone", "broadband", "wifi", "internet", "dth", "tata sky", "dish tv", "postpaid"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Telephone & Internet" })),
    ],
    "Rent & Housing": [
      ...["rent", "house rent", "hra", "landlord", "apartment", "maintenance", "society", "property tax"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Rent" })),
    ],
    "Banking & Finance": [
      ...["processing fee", "bank charge", "cheque", "dd", "demand draft"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Bank Charges" })),
      ...["insurance premium", "lic", "hdfc life", "sbi life", "bajaj allianz"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Insurance" })),
      ...["mutual fund", "sip", "demat", "brokerage", "zerodha", "groww", "upstox"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Investments" })),
    ],
    "Education": [
      ...["school fee", "college fee", "tuition", "coaching", "course", "udemy", "coursera", "books", "stationery", "uniform"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Education" })),
    ],
    "Entertainment": [
      ...["netflix", "amazon prime", "hotstar", "disney", "spotify", "youtube", "movie", "cinema", "pvr", "inox",
          "game", "playstation", "xbox", "steam"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Entertainment" })),
    ],
    "Office & Business": [
      ...["office supplies", "printing", "stationery"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Printing & Stationery" })),
      ...["software", "subscription", "domain", "hosting", "aws", "google cloud", "azure", "microsoft", "adobe", "zoom", "slack", "notion"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Software & Subscriptions" })),
    ],
    "Refund / Reversal": [
      ...["refund", "reversal", "cashback", "chargeback", "credited back", "money back", "revert"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Refund / Reversal" })),
    ],
    "Transfer": [
      ...["self transfer", "own account"]
        .map((k) => ({ matchType: "keyword" as const, matchValue: k, account: "Internal Transfer" })),
    ],
  }

  // NOTE: must be single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
  const legacyRows = await sql`SELECT id, org_id, category, priority FROM category_rules WHERE chart_account_id IS NULL AND category IS NOT NULL`
  if (legacyRows.length === 0) {
    results.push("⏭️  no legacy flat-category rules left to migrate")
  } else {
    for (const row of legacyRows as { id: number; org_id: number | null; category: string; priority: number }[]) {
      const mappings = LEGACY_MAP[row.category]
      if (!mappings || mappings.length === 0) {
        results.push(`⚠️  no mapping defined for legacy category '${row.category}' (rule id ${row.id}) — left unmigrated`)
        continue
      }
      const [first, ...rest] = mappings
      await run(`migrate rule '${row.category}' (id ${row.id}) → ${first.account}`, () => sql`
        UPDATE category_rules
        SET chart_account_id = (SELECT id FROM chart_of_accounts WHERE org_id IS NULL AND name = ${first.account} LIMIT 1),
            match_type = ${first.matchType}, match_value = ${first.matchValue}, updated_at = NOW()
        WHERE id = ${row.id}
      `)
      for (const m of rest) {
        await run(`  + expand '${row.category}' keyword '${m.matchValue}' → ${m.account}`, () => sql`
          INSERT INTO category_rules (org_id, chart_account_id, signal_prefix, match_type, match_value, priority, is_system)
          SELECT ${row.org_id}, id, NULL, ${m.matchType}, ${m.matchValue}, ${row.priority}, true
          FROM chart_of_accounts WHERE org_id IS NULL AND name = ${m.account} LIMIT 1
        `)
      }
    }
  }

  const allOk = results.every((r) => r.startsWith("✅") || r.startsWith("⏭️"))
  return NextResponse.json({ success: allOk, results, resultCount: results.length })
}
