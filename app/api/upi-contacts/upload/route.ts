import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import {
  parseUpiStatementCsv,
  parseUpiStatementXls,
  parseUpiStatementPdf,
  extractUpiContactsWithGemini,
  dedupeContacts,
  type ParsedUpiContact,
} from "@/lib/parsers/upi-statement"

export const maxDuration = 60

function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}

// POST /api/upi-contacts/upload
// Accepts a UPI app statement (PDF/CSV/XLS/XLSX from PhonePe/BHIM/GPay/Amazon Pay).
// Stores only UTR/VPA → display name for lookup — no transactions, no amounts.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const source = (formData.get("source") as string | null) || "other"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.toLowerCase().split(".").pop() ?? ""
    if (!["pdf", "csv", "xls", "xlsx"].includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type ".${ext}". Upload a PDF, CSV, XLS, or XLSX statement export.` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let rows: ParsedUpiContact[]
    let usedGeminiFallback = false

    if (ext === "csv") {
      rows = parseUpiStatementCsv(buffer.toString("utf-8"))
    } else if (ext === "pdf") {
      rows = await parseUpiStatementPdf(buffer)
    } else {
      rows = parseUpiStatementXls(buffer)
    }

    // Gemini fallback only fires when the deterministic parser found nothing —
    // i.e. this statement's layout doesn't match the verified format.
    if (rows.length === 0) {
      const rawText =
        ext === "pdf"
          ? (await (async () => {
              const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
              return (await pdfParse(buffer)).text
            })())
          : buffer.toString("utf-8")
      rows = await extractUpiContactsWithGemini(rawText)
      usedGeminiFallback = rows.length > 0
    }

    const contacts = dedupeContacts(rows)

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No transactions could be recognized in this file, even with the AI fallback. Confirm this is a UPI app statement export." },
        { status: 422 },
      )
    }

    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const valuesList = contacts
      .map((c) => `(${oid}, ${esc(c.utr)}, ${esc(c.vpa)}, ${esc(c.display_name)}, ${esc(source)}, ${esc(batchId)})`)
      .join(",\n")

    await rawSql(`INSERT INTO upi_contacts (org_id, utr, vpa, display_name, source, upload_batch_id) VALUES ${valuesList}`)

    return NextResponse.json({ success: true, imported: contacts.length, batchId, usedGeminiFallback })
  } catch (error) {
    console.error("[upi-contacts/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
