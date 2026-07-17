import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { parseUpiStatementCsv, parseUpiStatementXls, dedupeContacts } from "@/lib/parsers/upi-statement"

function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}

// POST /api/upi-contacts/upload
// Accepts a UPI app statement (CSV/XLS/XLSX from PhonePe/BHIM/GPay/Amazon Pay).
// Stores only VPA → display name for lookup — no transactions, no amounts.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const source = (formData.get("source") as string | null) || "other"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.toLowerCase().split(".").pop() ?? ""
    if (!["csv", "xls", "xlsx"].includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type ".${ext}". Upload a CSV, XLS, or XLSX statement export.` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rows = ext === "csv" ? parseUpiStatementCsv(buffer.toString("utf-8")) : parseUpiStatementXls(buffer)
    const contacts = dedupeContacts(rows)

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No name/VPA columns found in this file. Expected a column like 'Paid To', 'Received From', or 'VPA' / 'UPI ID'." },
        { status: 422 },
      )
    }

    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const valuesList = contacts
      .map((c) => `(${oid}, ${esc(c.vpa)}, ${esc(c.display_name)}, ${esc(source)}, ${esc(batchId)})`)
      .join(",\n")

    await rawSql(`INSERT INTO upi_contacts (org_id, vpa, display_name, source, upload_batch_id) VALUES ${valuesList}`)

    return NextResponse.json({ success: true, imported: contacts.length, batchId })
  } catch (error) {
    console.error("[upi-contacts/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
