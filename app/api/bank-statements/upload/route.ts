import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules } from "@/lib/categorize"
import { parseCsvBank } from "@/lib/parsers/csv-bank"
import { parseXlsBank } from "@/lib/parsers/xls-bank"
import { parsePdfBank } from "@/lib/parsers/pdf-bank"
import { runAutoReconcile } from "@/lib/reconcile-engine"

export const maxDuration = 60 // Vercel function timeout for large files

// POST /api/bank-statements/upload
// Accepts multipart/form-data with a "file" field (CSV, XLS, XLSX, or PDF)
// Returns { inserted, skipped, batchId }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const ext = fileName.split(".").pop() ?? ""

    if (!["csv", "xls", "xlsx", "pdf"].includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type ".${ext}". Please upload CSV, XLS, XLSX, or PDF.` },
        { status: 400 },
      )
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse based on format
    let rows
    if (ext === "csv") {
      rows = parseCsvBank(buffer.toString("utf-8"))
    } else if (ext === "xls" || ext === "xlsx") {
      rows = parseXlsBank(buffer)
    } else {
      rows = await parsePdfBank(buffer)
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No transactions could be parsed from this file. Check the format and try again." },
        { status: 422 },
      )
    }

    const orgId = await getCurrentOrgId()
    const rules = await fetchRules(orgId)
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let inserted = 0
    let skipped = 0

    for (const txn of rows) {
      // Skip duplicates: same org + date + description + amount combination
      const exists = await sql`
        SELECT id FROM bank_transactions
        WHERE org_id = ${orgId}
          AND transaction_date = ${txn.transaction_date}
          AND description = ${txn.description}
          AND COALESCE(debit, 0) = COALESCE(${txn.debit}, 0)
          AND COALESCE(credit, 0) = COALESCE(${txn.credit}, 0)
        LIMIT 1
      `
      if (exists.length > 0) { skipped++; continue }

      const { category, source } = categorize(txn.description, rules)

      await sql`
        INSERT INTO bank_transactions (
          org_id, transaction_date, description, reference_number,
          debit, credit, balance, reconciled,
          category, category_source, upload_batch_id, source_format
        ) VALUES (
          ${orgId}, ${txn.transaction_date}, ${txn.description},
          ${txn.reference_number ?? null},
          ${txn.debit ?? null}, ${txn.credit ?? null},
          ${txn.balance ?? null}, false,
          ${category}, ${source}, ${batchId}, ${ext}
        )
      `
      inserted++
    }

    // Run auto-reconciliation on newly inserted batch
    const suggestions = await runAutoReconcile(orgId, batchId)

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: rows.length,
      batchId,
      autoMatched: suggestions.matched,
    })
  } catch (error) {
    console.error("[bank-statements/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
