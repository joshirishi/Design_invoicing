import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Sprint 2 migration — Chart of Accounts + Vendors.
// Safe to re-run (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).
export async function GET() {
  const results: string[] = []

  async function run(label: string, fn: () => Promise<unknown>) {
    try { await fn(); results.push(`✅ ${label}`) }
    catch (e: any) { results.push(`❌ ${label}: ${e.message}`) }
  }

  // ── chart_of_accounts ─────────────────────────────────────
  await run("create chart_of_accounts", () => sql`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id           SERIAL PRIMARY KEY,
      org_id       INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name         VARCHAR(255) NOT NULL,
      type         VARCHAR(50)  NOT NULL, -- Asset | Liability | Income | Expense | Equity
      tally_group  VARCHAR(255) NOT NULL, -- Tally primary group (for XML export)
      tally_parent VARCHAR(255),          -- Tally parent group (nested groups)
      is_system    BOOLEAN DEFAULT FALSE, -- system defaults cannot be deleted
      is_active    BOOLEAN DEFAULT TRUE,
      parent_id    INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("index chart_of_accounts org", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_coa_org ON chart_of_accounts(org_id)`)

  // ── vendors ───────────────────────────────────────────────
  await run("create vendors", () => sql`
    CREATE TABLE IF NOT EXISTS vendors (
      id         SERIAL PRIMARY KEY,
      org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name       VARCHAR(255) NOT NULL,
      gstin      VARCHAR(100),
      pan_no     VARCHAR(10),
      state_code VARCHAR(2),
      address    TEXT,
      email      VARCHAR(255),
      phone      VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("index vendors org", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id)`)

  // ── purchases: add vendor_id FK ───────────────────────────
  await run("purchases: add vendor_id", () =>
    sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL`)

  // ── bank_transactions: add ledger_id FK ──────────────────
  await run("bank_transactions: add ledger_id", () =>
    sql`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS ledger_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL`)

  // ── Seed system Chart of Accounts (org_id = NULL = global defaults) ──
  // Only seed if not already present
  const existing = await sql`SELECT COUNT(*) as n FROM chart_of_accounts WHERE is_system = true`
  if (Number(existing[0].n) > 0) {
    results.push("⏭️  chart_of_accounts seed already present — skipped")
  } else {
    await run("seed chart_of_accounts", () => seedChartOfAccounts())
    results.push("✅ chart_of_accounts seeded with standard Indian / Tally-compatible accounts")
  }

  const allOk = results.every((r) => r.startsWith("✅") || r.startsWith("⏭️"))
  return NextResponse.json({ success: allOk, results })
}

async function seedChartOfAccounts() {
  // Standard Indian bookkeeping accounts, mapped to Tally groups.
  // org_id = NULL means these are global defaults — every org sees them.
  // Structured as: [name, type, tally_group, tally_parent]
  const accounts: [string, string, string, string | null][] = [
    // ── EQUITY ───────────────────────────────────────────────
    ["Capital Account",           "Equity",    "Capital Account",       null],
    ["Drawings",                  "Equity",    "Capital Account",       null],
    ["Retained Earnings",         "Equity",    "Reserves & Surplus",    null],

    // ── LIABILITIES ──────────────────────────────────────────
    ["Sundry Creditors",          "Liability", "Sundry Creditors",      "Current Liabilities"],
    ["Output CGST",               "Liability", "Duties & Taxes",        "Current Liabilities"],
    ["Output SGST",               "Liability", "Duties & Taxes",        "Current Liabilities"],
    ["Output IGST",               "Liability", "Duties & Taxes",        "Current Liabilities"],
    ["Input CGST (ITC)",          "Asset",     "Duties & Taxes",        "Current Assets"],
    ["Input SGST (ITC)",          "Asset",     "Duties & Taxes",        "Current Assets"],
    ["Input IGST (ITC)",          "Asset",     "Duties & Taxes",        "Current Assets"],
    ["TDS Payable",               "Liability", "Duties & Taxes",        "Current Liabilities"],
    ["TDS Receivable",            "Asset",     "Loans & Advances (Asset)", "Current Assets"],
    ["Advance Tax Paid",          "Asset",     "Loans & Advances (Asset)", "Current Assets"],
    ["Bank OD / CC Account",      "Liability", "Bank OD A/c",           "Loans (Liability)"],
    ["Term Loan",                 "Liability", "Term Loans",            "Loans (Liability)"],

    // ── ASSETS ───────────────────────────────────────────────
    ["Bank Account",              "Asset",     "Bank Accounts",         "Current Assets"],
    ["Cash in Hand",              "Asset",     "Cash-in-Hand",          "Current Assets"],
    ["Sundry Debtors",            "Asset",     "Sundry Debtors",        "Current Assets"],
    ["Security Deposits",         "Asset",     "Deposits (Asset)",      "Current Assets"],
    ["Prepaid Expenses",          "Asset",     "Loans & Advances (Asset)", "Current Assets"],
    ["Laptop / Computer",         "Asset",     "Computer",              "Fixed Assets"],
    ["Furniture & Fittings",      "Asset",     "Furniture & Fittings",  "Fixed Assets"],
    ["Other Fixed Assets",        "Asset",     "Plant & Machinery",     "Fixed Assets"],

    // ── INCOME ───────────────────────────────────────────────
    ["Service Income",            "Income",    "Sales Accounts",        "Direct Income"],
    ["Product Sales",             "Income",    "Sales Accounts",        "Direct Income"],
    ["Other Income",              "Income",    "Other Income",          "Indirect Income"],
    ["Interest Received",         "Income",    "Other Income",          "Indirect Income"],
    ["Discount Received",         "Income",    "Other Income",          "Indirect Income"],

    // ── EXPENSES ─────────────────────────────────────────────
    ["Direct Purchases",          "Expense",   "Purchase Accounts",     "Direct Expenses"],
    ["Salary & Wages",            "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Rent",                      "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Telephone & Internet",      "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Electricity Charges",       "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Travelling Expenses",       "Expense",   "Travelling Expenses",   "Indirect Expenses"],
    ["Conveyance",                "Expense",   "Travelling Expenses",   "Indirect Expenses"],
    ["Professional Fees Paid",    "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Software & Subscriptions",  "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Advertisement",             "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Printing & Stationery",     "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Office Expenses",           "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Bank Charges",              "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Depreciation",              "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Repair & Maintenance",      "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Insurance",                 "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Fuel & Vehicle Expenses",   "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Discount Allowed",          "Expense",   "Indirect Expenses",     "Indirect Expenses"],
    ["Miscellaneous Expenses",    "Expense",   "Indirect Expenses",     "Indirect Expenses"],
  ]

  for (const [name, type, tally_group, tally_parent] of accounts) {
    await sql`
      INSERT INTO chart_of_accounts (org_id, name, type, tally_group, tally_parent, is_system)
      VALUES (NULL, ${name}, ${type}, ${tally_group}, ${tally_parent}, true)
      ON CONFLICT DO NOTHING
    `
  }
}
