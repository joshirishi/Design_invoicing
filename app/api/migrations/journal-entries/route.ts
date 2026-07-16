import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Epic 12 migration — Double-Entry Ledger (Journal Entries).
// Forward-only scope: new journal_entries/journal_entry_lines tables that new
// invoices/payments/purchases post to going forward. Historical backfill is a
// separate follow-up story (see USER-STORIES.md Epic 12, Priya's feasibility note).
// Safe to re-run (CREATE TABLE IF NOT EXISTS).
export async function GET() {
  const results: string[] = []

  async function run(label: string, fn: () => Promise<unknown>) {
    try { await fn(); results.push(`✅ ${label}`) }
    catch (e: any) { results.push(`❌ ${label}: ${e.message}`) }
  }

  await run("create journal_entries", () => sql`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id          SERIAL PRIMARY KEY,
      org_id      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      entry_date  DATE NOT NULL,
      narration   TEXT,
      source_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- invoice | payment | purchase | manual
      source_id   INTEGER,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("index journal_entries org+date", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_je_org_date ON journal_entries(org_id, entry_date)`)
  await run("index journal_entries source", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_type, source_id)`)

  await run("create journal_entry_lines", () => sql`
    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id         SERIAL PRIMARY KEY,
      entry_id   INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
      debit      NUMERIC(14,2) NOT NULL DEFAULT 0,
      credit     NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await run("index journal_entry_lines entry", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(entry_id)`)
  await run("index journal_entry_lines account", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id)`)

  const allOk = results.every((r) => r.startsWith("✅"))
  return NextResponse.json({ success: allOk, results })
}
