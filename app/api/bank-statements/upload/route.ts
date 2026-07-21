import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { categorize, fetchRules, extractSignal } from "@/lib/categorize"
import { parseCsvBank } from "@/lib/parsers/csv-bank"
import { parseXlsBank } from "@/lib/parsers/xls-bank"
import { parsePdfBank } from "@/lib/parsers/pdf-bank"
import { extractBankTransactionsWithGemini } from "@/lib/parsers/bank-ai"
import * as XLSX from "xlsx"

export const maxDuration = 60

// Escape a string value for safe SQL interpolation
function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}

// Format a number or null for SQL
function num(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "NULL"
  return String(v)
}

// POST /api/bank-statements/upload
// Accepts multipart/form-data with a "file" field (CSV, XLS, XLSX, or PDF).
// Does a single bulk INSERT with dedup via ON CONFLICT DO NOTHING — no per-row DB calls.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const accountIdRaw = formData.get("account_id") as string | null
    const accountId = accountIdRaw && /^\d+$/.test(accountIdRaw) ? Number(accountIdRaw) : null

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

    // Parse file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let rows
    if (ext === "csv") {
      rows = parseCsvBank(buffer.toString("utf-8"))
    } else if (ext === "xls" || ext === "xlsx") {
      rows = parseXlsBank(buffer)
    } else {
      rows = await parsePdfBank(buffer)
    }

    // Gemini fallback only fires when the deterministic parser found nothing —
    // i.e. this statement's layout doesn't match any known bank format.
    let usedGeminiFallback = false
    if (rows.length === 0) {
      const rawText = await extractRawText(ext, buffer)
      rows = await extractBankTransactionsWithGemini(rawText)
      usedGeminiFallback = rows.length > 0
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

    // Categorize all rows in memory via rules — no DB calls needed per row.
    // Rows that stay "unresolved" are picked up by the Gemini fallback below.
    const categorized = rows.map((row) => {
      const { category, source, chartAccountId } = categorize(row.description, rules)
      return { ...row, category, source, chartAccountId }
    })

    const unresolved = categorized.filter((r) => r.source === "unresolved" && r.description)
    let aiResults = new Map<string, { chartAccountId: number; accountName: string; confidence: number }>()
    if (unresolved.length > 0) {
      try {
        const { categorizeWithGemini } = await import("@/lib/ai-categorize")
        const uniqueSignals = Array.from(new Set(unresolved.map((r) => extractSignal(r.description).signal || r.description)))
        aiResults = await categorizeWithGemini(uniqueSignals, orgId)
      } catch (err) {
        console.error("[bank-statements/upload] Gemini categorization skipped:", err)
      }
    }

    const final = categorized.map((r) => {
      if (r.source !== "unresolved") return { ...r, confidence: null as number | null }
      const signal = extractSignal(r.description).signal || r.description
      const ai = aiResults.get(signal)
      if (!ai) return { ...r, confidence: null as number | null }
      return { ...r, category: ai.accountName, source: "ai" as const, chartAccountId: ai.chartAccountId, confidence: ai.confidence }
    })

    // Build a single VALUES list for bulk INSERT
    const valuesList = final.map((r) =>
      `(${orgId}, ${esc(r.transaction_date)}, ${esc(r.description)}, ${esc(r.reference_number ?? null)}, ${num(r.debit)}, ${num(r.credit)}, ${num(r.balance)}, false, ${esc(r.category)}, ${esc(r.source)}, ${r.chartAccountId ?? "NULL"}, ${r.confidence ?? "NULL"}, ${esc(batchId)}, ${esc(ext)}, ${accountId ?? "NULL"})`
    ).join(",\n")

    // Single bulk INSERT — ON CONFLICT DO NOTHING deduplicates against idx_bank_txn_dedup.
    await rawSql(`
      INSERT INTO bank_transactions (
        org_id, transaction_date, description, reference_number,
        debit, credit, balance, reconciled,
        category, category_source, ledger_id, category_confidence, upload_batch_id, source_format, account_id
      )
      VALUES ${valuesList}
      ON CONFLICT (org_id, transaction_date, description, COALESCE(debit, 0), COALESCE(credit, 0))
        DO NOTHING
    `)

    // exec_sql doesn't return RETURNING rows for DML, so count separately.
    // NOTE: must be single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
    const countResult = await sql`SELECT COUNT(*) AS cnt FROM bank_transactions WHERE upload_batch_id = ${batchId}`
    const insertedCount = Number(countResult[0]?.cnt ?? 0)
    const skippedCount = rows.length - insertedCount

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
      total: rows.length,
      batchId,
      autoMatched: 0, // Reconciliation is now a separate step — use the Reconcile button
      usedGeminiFallback,
    })
  } catch (error) {
    console.error("[bank-statements/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}

// Best-effort plain text for the Gemini fallback — only reached once the
// deterministic parser for this format has already found zero rows.
async function extractRawText(ext: string, buffer: Buffer): Promise<string> {
  if (ext === "csv") return buffer.toString("utf-8")
  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
    return (await pdfParse(buffer)).text
  }
  // xls/xlsx — convert the first sheet to CSV text
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheet = workbook.SheetNames[0]
  return firstSheet ? XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]) : ""
}
