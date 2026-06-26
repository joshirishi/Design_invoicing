// One-time migration: creates the invoice_templates table if it doesn't exist.
// Call GET /api/migrate-invoice-templates once after deploying.
// Safe to re-run — uses CREATE TABLE IF NOT EXISTS.

import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_templates (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        config JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_invoice_templates_org ON invoice_templates(org_id)
    `
    return NextResponse.json({ success: true, message: "invoice_templates table ready" })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
