import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Sprint 1 migration — adds IGST, Financial Year, TDS, and state_code fields.
// Safe to re-run (uses ADD COLUMN IF NOT EXISTS).
export async function GET() {
  const results: string[] = []

  async function run(description: string, query: () => Promise<unknown>) {
    try {
      await query()
      results.push(`✅ ${description}`)
    } catch (e: any) {
      results.push(`❌ ${description}: ${e.message}`)
    }
  }

  // ── invoices ──────────────────────────────────────────────
  await run("invoices: add igst_rate", () =>
    sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0`)
  await run("invoices: add igst_amount", () =>
    sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0`)
  await run("invoices: add financial_year", () =>
    sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS financial_year VARCHAR(7)`)
  await run("invoices: add place_of_supply", () =>
    sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(2)`)
  await run("invoices: backfill financial_year from invoice_date", () =>
    sql`
      UPDATE invoices
      SET financial_year = CASE
        WHEN EXTRACT(MONTH FROM invoice_date) >= 4
          THEN EXTRACT(YEAR FROM invoice_date)::text || '-' || LPAD(((EXTRACT(YEAR FROM invoice_date) + 1) % 100)::text, 2, '0')
        ELSE (EXTRACT(YEAR FROM invoice_date) - 1)::text || '-' || LPAD((EXTRACT(YEAR FROM invoice_date) % 100)::text, 2, '0')
      END
      WHERE financial_year IS NULL
    `)

  // ── invoice_line_items ────────────────────────────────────
  await run("invoice_line_items: add igst_rate", () =>
    sql`ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0`)
  await run("invoice_line_items: add igst_amount", () =>
    sql`ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0`)

  // ── clients ───────────────────────────────────────────────
  await run("clients: add state_code", () =>
    sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS state_code VARCHAR(2)`)
  await run("clients: add pan_no", () =>
    sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS pan_no VARCHAR(10)`)

  // ── profiles (your own state, for IGST determination) ─────
  await run("profiles: add state_code", () =>
    sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state_code VARCHAR(2)`)

  // ── payments ──────────────────────────────────────────────
  await run("payments: add tds_amount", () =>
    sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS tds_amount DECIMAL(12,2) NOT NULL DEFAULT 0`)
  await run("payments: add tds_section", () =>
    sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS tds_section VARCHAR(10)`)

  // ── purchases ─────────────────────────────────────────────
  await run("purchases: add financial_year", () =>
    sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS financial_year VARCHAR(7)`)
  await run("purchases: backfill financial_year", () =>
    sql`
      UPDATE purchases
      SET financial_year = CASE
        WHEN EXTRACT(MONTH FROM invoice_date) >= 4
          THEN EXTRACT(YEAR FROM invoice_date)::text || '-' || LPAD(((EXTRACT(YEAR FROM invoice_date) + 1) % 100)::text, 2, '0')
        ELSE (EXTRACT(YEAR FROM invoice_date) - 1)::text || '-' || LPAD((EXTRACT(YEAR FROM invoice_date) % 100)::text, 2, '0')
      END
      WHERE financial_year IS NULL
    `)

  // ── bank_transactions ────────────────────────────────────
  await run("bank_transactions: add financial_year", () =>
    sql`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS financial_year VARCHAR(7)`)
  await run("bank_transactions: backfill financial_year", () =>
    sql`
      UPDATE bank_transactions
      SET financial_year = CASE
        WHEN EXTRACT(MONTH FROM transaction_date) >= 4
          THEN EXTRACT(YEAR FROM transaction_date)::text || '-' || LPAD(((EXTRACT(YEAR FROM transaction_date) + 1) % 100)::text, 2, '0')
        ELSE (EXTRACT(YEAR FROM transaction_date) - 1)::text || '-' || LPAD((EXTRACT(YEAR FROM transaction_date) % 100)::text, 2, '0')
      END
      WHERE financial_year IS NULL
    `)

  const allOk = results.every((r) => r.startsWith("✅"))
  return NextResponse.json({ success: allOk, results })
}
