import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { parseTaxPnl } from "@/lib/parsers/tax-pnl"
import { postCapitalGainJournalEntry } from "@/lib/journal"

export const maxDuration = 60

function esc(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}
function num(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "NULL"
  return String(v)
}

// POST /api/investment-statements/upload
// Accepts a broker Tax P&L export (XLS/XLSX). Ingests Short/Long Term Trades
// as capital_gains_entries and posts each to the ledger (Epic 17 Pass 2).
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const accountIdRaw = formData.get("account_id") as string | null
    const accountId = accountIdRaw && /^\d+$/.test(accountIdRaw) ? Number(accountIdRaw) : null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.toLowerCase().split(".").pop() ?? ""
    if (!["xls", "xlsx"].includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type ".${ext}". Upload the broker's Tax P&L XLS/XLSX export.` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, financialYear } = parseTaxPnl(buffer)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No Short Term / Long Term trade rows found. Confirm this is a Zerodha-format Tax P&L export." },
        { status: 422 },
      )
    }

    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const valuesList = rows
      .map(
        (r) =>
          `(${oid}, ${accountId ?? "NULL"}, ${esc(r.symbol)}, ${num(r.quantity)}, ${num(r.cost_basis)}, ${num(r.sale_value)}, ${num(r.gain_amount)}, ${esc(r.gain_type)}, ${esc(financialYear)}, ${esc(batchId)})`,
      )
      .join(",\n")

    await rawSql(`
      INSERT INTO capital_gains_entries (
        org_id, account_id, symbol, quantity, cost_basis, sale_value, gain_amount, gain_type, financial_year, upload_batch_id
      )
      VALUES ${valuesList}
    `)

    const inserted = await rawSql(`SELECT * FROM capital_gains_entries WHERE upload_batch_id = ${esc(batchId)} ORDER BY id ASC`)

    // Post each entry to the ledger, best-effort — don't fail the whole upload
    // if one entry's posting fails.
    let posted = 0
    for (const entry of inserted) {
      if (Number(entry.gain_amount) === 0) continue
      try {
        await postCapitalGainJournalEntry(orgId, {
          id: Number(entry.id),
          symbol: String(entry.symbol),
          gain_amount: Number(entry.gain_amount),
          gain_type: entry.gain_type as "STCG" | "LTCG",
          financial_year: entry.financial_year as string | null,
        })
        posted++
      } catch (journalError: any) {
        console.error("Journal posting failed for capital gain entry", entry.id, journalError.message)
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      posted,
      financialYear,
      batchId,
    })
  } catch (error) {
    console.error("[investment-statements/upload] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
