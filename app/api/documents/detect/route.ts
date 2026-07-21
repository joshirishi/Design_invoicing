import { type NextRequest, NextResponse } from "next/server"
import { parseCsvBank } from "@/lib/parsers/csv-bank"
import { parseXlsBank } from "@/lib/parsers/xls-bank"
import { parsePdfBank } from "@/lib/parsers/pdf-bank"
import { parseUpiStatementCsv, parseUpiStatementXls, parseUpiStatementPdf } from "@/lib/parsers/upi-statement"
import { parseGstr2bJson } from "@/lib/parsers/gstr2b"
import { parseTaxPnl } from "@/lib/parsers/tax-pnl"
import { classifyDocumentWithGemini } from "@/lib/parsers/ai-classify"
import { DOC_REGISTRY } from "@/components/gst-document-checklist"
import * as XLSX from "xlsx"

export const maxDuration = 60

// Category the file most likely belongs to, and which existing upload flow handles it.
export type DetectedCategory =
  | "bank_statement"
  | "upi_statement"
  | "gstr2b"
  | "tax_pnl"
  | "gst_document"
  | "unknown"

interface DetectionResult {
  category: DetectedCategory
  confidence: "high" | "medium" | "low"
  label: string
  preview: string
  // Only set when category === "gst_document" and we could tell which one.
  gstDocType?: string
  // Only set when category === "gstr2b"
  period?: string | null
  // True when a structural check couldn't place the file and Gemini was asked to guess instead.
  aiAssisted?: boolean
}

// The 3 electronic ledger CSVs from the GST portal each carry their report
// title as the literal first line — an unambiguous signature that doesn't
// collide with bank-statement exports, so we check these before anything else.
const GST_LEDGER_SIGNATURES: { needle: string; docType: string; label: string }[] = [
  { needle: "electronic cash ledger", docType: "cash_ledger", label: "Electronic Cash Ledger" },
  { needle: "electronic credit ledger", docType: "credit_ledger", label: "Electronic Credit Ledger" },
  { needle: "electronic liability register", docType: "liability_register", label: "Electronic Liability Register" },
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.toLowerCase().split(".").pop() ?? ""
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await detect(ext, buffer, file.name)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function detect(ext: string, buffer: Buffer, fileName: string): Promise<DetectionResult> {
  // 1. GST electronic ledger CSVs — literal title match, checked across all text-bearing formats.
  if (["csv", "pdf"].includes(ext)) {
    const head = ext === "csv" ? buffer.toString("utf-8").slice(0, 400) : await safePdfText(buffer, 400)
    const headLower = head.toLowerCase()
    for (const sig of GST_LEDGER_SIGNATURES) {
      if (headLower.includes(sig.needle)) {
        return {
          category: "gst_document",
          confidence: "high",
          label: sig.label,
          preview: `Detected from the report title on the first line.`,
          gstDocType: sig.docType,
        }
      }
    }
  }

  // 2. GSTR-2B JSON download — unambiguous by extension + schema.
  if (ext === "json") {
    try {
      const { entries, period } = parseGstr2bJson(buffer.toString("utf-8"))
      if (entries.length > 0) {
        const suppliers = new Set(entries.map((e) => e.supplier_gstin)).size
        return {
          category: "gstr2b",
          confidence: "high",
          label: "GSTR-2B (ITC statement)",
          preview: `${entries.length} line item${entries.length === 1 ? "" : "s"} across ${suppliers} supplier${suppliers === 1 ? "" : "s"}${period ? `, period ${period}` : ""}.`,
          period,
        }
      }
    } catch {
      // fall through
    }
    return { category: "unknown", confidence: "low", label: "Unrecognised JSON file", preview: "Doesn't match the GSTR-2B JSON schema." }
  }

  // 3. Broker Tax P&L export — sheet-name based, XLS/XLSX only.
  if (ext === "xls" || ext === "xlsx") {
    try {
      const { rows, financialYear } = parseTaxPnl(buffer)
      if (rows.length > 0) {
        const stcg = rows.filter((r) => r.gain_type === "STCG").length
        const ltcg = rows.filter((r) => r.gain_type === "LTCG").length
        return {
          category: "tax_pnl",
          confidence: "high",
          label: "Broker Tax P&L (capital gains)",
          preview: `${stcg} short-term, ${ltcg} long-term trade${stcg + ltcg === 1 ? "" : "s"}${financialYear ? `, FY ${financialYear}` : ""}.`,
        }
      }
    } catch {
      // fall through
    }
  }

  // 4. UPI app statement — PDF/CSV/XLS, checked before generic bank parsing since
  // it's the more specific format (UTR/VPA/counterparty rows, not debit/credit ledger rows).
  if (["pdf", "csv", "xls", "xlsx"].includes(ext)) {
    try {
      let upiRows: { display_name: string }[] = []
      if (ext === "pdf") upiRows = await parseUpiStatementPdf(buffer)
      else if (ext === "csv") upiRows = parseUpiStatementCsv(buffer.toString("utf-8"))
      else upiRows = parseUpiStatementXls(buffer)

      if (upiRows.length > 0) {
        return {
          category: "upi_statement",
          confidence: "high",
          label: "UPI app statement",
          preview: `${upiRows.length} contact${upiRows.length === 1 ? "" : "s"} found (e.g. ${upiRows[0].display_name}).`,
        }
      }
    } catch {
      // fall through
    }
  }

  // 5. Bank statement — CSV/XLS/PDF with debit/credit transaction rows.
  if (["csv", "xls", "xlsx", "pdf"].includes(ext)) {
    try {
      let bankRows: unknown[] = []
      if (ext === "csv") bankRows = parseCsvBank(buffer.toString("utf-8"))
      else if (ext === "xls" || ext === "xlsx") bankRows = parseXlsBank(buffer)
      else bankRows = await parsePdfBank(buffer)

      if (bankRows.length > 0) {
        return {
          category: "bank_statement",
          confidence: "medium",
          label: "Bank statement",
          preview: `${bankRows.length} transaction${bankRows.length === 1 ? "" : "s"} found.`,
        }
      }
    } catch {
      // fall through
    }
  }

  // 6. Nothing matched structurally. Ask Gemini for a best guess rather than
  // giving up outright — scoped to categories where being wrong just means
  // re-picking a label (gst_document) or where a proven Gemini extraction
  // fallback already exists (bank/UPI statements, wired in at upload time).
  // GSTR-2B and Tax P&L are excluded — those carry real tax/gains figures, not
  // something to free-text-guess.
  if (["pdf", "csv", "xls", "xlsx"].includes(ext)) {
    const text = await extractClassifiableText(ext, buffer)
    const guess = await classifyDocumentWithGemini(text, fileName)
    if (guess && guess.category !== "unsupported") {
      const label =
        guess.category === "gst_document" && guess.gstDocType
          ? DOC_REGISTRY[guess.gstDocType]?.label ?? "GST document"
          : guess.category === "bank_statement"
            ? "Bank statement"
            : "UPI app statement"
      return {
        category: guess.category,
        confidence: "low",
        label,
        preview: `AI best guess — ${guess.reasoning} Confirm below before anything is uploaded.`,
        gstDocType: guess.gstDocType ?? undefined,
        aiAssisted: true,
      }
    }
  }

  // 7. No confident match, structural or AI — likely a format nothing here
  // recognises. Let the user pick.
  return {
    category: "unknown",
    confidence: "low",
    label: "Couldn't auto-detect",
    preview: "Looks like a filed-return acknowledgment, certificate, or challan — please choose the document type.",
  }
}

async function extractClassifiableText(ext: string, buffer: Buffer): Promise<string> {
  if (ext === "csv") return buffer.toString("utf-8")
  if (ext === "pdf") return safePdfText(buffer, 6000)
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheet = workbook.SheetNames[0]
  return firstSheet ? XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]).slice(0, 6000) : ""
}

async function safePdfText(buffer: Buffer, maxChars: number): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
    const text = (await pdfParse(buffer)).text
    return text.slice(0, maxChars)
  } catch {
    return ""
  }
}
