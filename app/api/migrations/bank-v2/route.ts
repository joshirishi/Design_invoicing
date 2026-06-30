import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/migrations/bank-v2
// Adds category, category_source, upload_batch_id, source_format to bank_transactions
// and import_source to invoices. Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
export async function GET() {
  try {
    await sql`
      ALTER TABLE bank_transactions
        ADD COLUMN IF NOT EXISTS category VARCHAR(100),
        ADD COLUMN IF NOT EXISTS category_source VARCHAR(50),
        ADD COLUMN IF NOT EXISTS upload_batch_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS source_format VARCHAR(20)
    `

    await sql`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS import_source VARCHAR(50)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_batch ON bank_transactions(upload_batch_id)
    `

    return NextResponse.json({
      success: true,
      message: "bank-v2 migration applied: category columns added to bank_transactions, import_source added to invoices",
    })
  } catch (error) {
    console.error("[bank-v2 migration] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 },
    )
  }
}
