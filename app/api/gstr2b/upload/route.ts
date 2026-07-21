import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { parseGstr2bJson } from "@/lib/parsers/gstr2b"

function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}
function num(v: number): string {
  return Number.isFinite(v) ? String(v) : "0"
}

// POST /api/gstr2b/upload — parses a GSTR-2B JSON download into ITC line items.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const periodOverride = formData.get("period") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!file.name.toLowerCase().endsWith(".json")) {
      return NextResponse.json({ error: "GSTR-2B reconciliation needs the JSON download from the GST portal, not the PDF." }, { status: 400 })
    }

    const text = await file.text()
    const { entries, period: parsedPeriod } = parseGstr2bJson(text)
    const period = periodOverride || parsedPeriod

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No B2B entries found in this file. Confirm it's the GSTR-2B JSON download (Returns > GSTR-2B > Download JSON), not the PDF or Excel version." },
        { status: 422 },
      )
    }
    if (!period) {
      return NextResponse.json({ error: "Could not determine the filing period (fp) from this file." }, { status: 422 })
    }

    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Re-uploading the same period replaces its entries rather than accumulating duplicates.
    await rawSql(`DELETE FROM gstr2b_entries WHERE org_id = ${oid} AND period = ${esc(period)}`)

    const valuesList = entries
      .map(
        (e) =>
          `(${oid}, ${esc(period)}, ${esc(e.supplier_gstin)}, ${esc(e.supplier_name)}, ${esc(e.invoice_number)}, ${esc(e.invoice_date)}, ${num(e.taxable_value)}, ${num(e.cgst)}, ${num(e.sgst)}, ${num(e.igst)}, ${e.itc_available}, ${esc(batchId)})`,
      )
      .join(",\n")

    await rawSql(
      `INSERT INTO gstr2b_entries (org_id, period, supplier_gstin, supplier_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, itc_available, upload_batch_id) VALUES ${valuesList}`,
    )

    return NextResponse.json({ success: true, imported: entries.length, period, batchId })
  } catch (error) {
    console.error("[gstr2b/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
