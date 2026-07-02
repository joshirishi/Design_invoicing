import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// GST Documents migration — safe to re-run (IF NOT EXISTS throughout)
// Visit /api/migrations/gst-documents to run
export async function GET() {
  const results: string[] = []

  async function run(label: string, fn: () => Promise<unknown>) {
    try { await fn(); results.push(`✅ ${label}`) }
    catch (e: any) { results.push(`❌ ${label}: ${e.message}`) }
  }

  // Main gst_documents table
  await run("create gst_documents", () => sql`
    CREATE TABLE IF NOT EXISTS gst_documents (
      id           SERIAL PRIMARY KEY,
      org_id       INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      doc_type     VARCHAR(50)  NOT NULL,
      -- doc_type values: 'gstr1' | 'gstr3b' | 'gstr2b' | 'gstr9' | 'reg_cert' | 'challan'
      period       VARCHAR(10),
      -- MMYYYY for monthly docs, YYYY for annual, NULL for one-time docs
      file_name    VARCHAR(255),
      file_url     TEXT,
      file_path    TEXT,
      -- path inside Supabase Storage bucket for deletion
      status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
      -- 'pending' | 'uploaded' | 'overdue'
      due_date     DATE,
      uploaded_at  TIMESTAMP WITH TIME ZONE,
      notes        TEXT,
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await run("index gst_documents org", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_gst_docs_org ON gst_documents(org_id)`)

  await run("index gst_documents type_period", () =>
    sql`CREATE INDEX IF NOT EXISTS idx_gst_docs_type_period ON gst_documents(org_id, doc_type, period)`)

  const allOk = results.every((r) => r.startsWith("✅") || r.startsWith("⏭️"))
  return NextResponse.json({ success: allOk, results })
}
