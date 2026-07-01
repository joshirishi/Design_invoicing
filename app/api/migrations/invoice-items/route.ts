import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/migrations/invoice-items
// Creates the invoice_line_items table. Safe to run multiple times.
export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_line_items (
        id          SERIAL PRIMARY KEY,
        invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        hsn_code    VARCHAR(50),
        quantity    DECIMAL(10,3) NOT NULL DEFAULT 1,
        rate        DECIMAL(12,2) NOT NULL DEFAULT 0,
        cgst_rate   DECIMAL(5,2)  NOT NULL DEFAULT 9,
        sgst_rate   DECIMAL(5,2)  NOT NULL DEFAULT 9,
        cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
        sort_order  INTEGER       NOT NULL DEFAULT 0
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id)
    `

    return NextResponse.json({
      success: true,
      message: "invoice-items migration applied: invoice_line_items table created",
    })
  } catch (error) {
    console.error("[invoice-items migration] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 },
    )
  }
}
