import * as XLSX from "xlsx"

// Parse a broker "Tax P&L" export (Zerodha's format, confirmed against a real
// export) into capital-gains rows. Scope: the "Equity and Non Equity" sheet's
// "Short Term Trades" / "Long Term Trades" tables — the broker has already
// classified each realized trade as STCG or LTCG, so this ingests that
// classification as source of truth rather than reconstructing FIFO
// capital-gains math from raw trade history.
//
// Not covered in this pass (documented scope cut, not silently dropped):
// Intraday/Speculative, Non-Equity, F&O, Currency, Commodity, Mutual Funds —
// each lives on its own sheet in the same workbook with a different shape.

export interface ParsedCapitalGainRow {
  symbol: string
  quantity: number | null
  cost_basis: number
  sale_value: number
  gain_amount: number
  gain_type: "STCG" | "LTCG"
}

export interface ParsedTaxPnl {
  rows: ParsedCapitalGainRow[]
  financialYear: string | null // e.g. "2025-26", derived from the sheet's date range
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v
  const n = Number(String(v ?? "").replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

// Reads a Symbol|Quantity|Buy Value|Sell Value|Realized P&L table starting
// right after a header row, until the next blank row.
function readTradeTable(
  aoa: unknown[][],
  headerRowIdx: number,
): { rows: Omit<ParsedCapitalGainRow, "gain_type">[]; nextIdx: number } {
  const rows: Omit<ParsedCapitalGainRow, "gain_type">[] = []
  let i = headerRowIdx + 1
  for (; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]
    const symbol = String(row[0] ?? "").trim()
    if (!symbol) break
    rows.push({
      symbol,
      quantity: row[1] !== "" && row[1] != null ? toNumber(row[1]) : null,
      cost_basis: toNumber(row[2]),
      sale_value: toNumber(row[3]),
      gain_amount: toNumber(row[4]),
    })
  }
  return { rows, nextIdx: i }
}

export function parseTaxPnl(buffer: Buffer): ParsedTaxPnl {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("equity")) ?? workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

  // Financial year from the title row, e.g.
  // "Taxpnl Statement for Equity from 2025-04-01 to 2026-03-31"
  let financialYear: string | null = null
  for (const row of aoa.slice(0, 15)) {
    const cell = String(row[0] ?? "")
    const match = cell.match(/from\s+(\d{4})-(\d{2})-(\d{2})\s+to\s+\d{4}-\d{2}-\d{2}/i)
    if (match) {
      const startYear = Number(match[1])
      const startMonth = Number(match[2])
      const fyStart = startMonth >= 4 ? startYear : startYear - 1
      financialYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`
      break
    }
  }

  const rows: ParsedCapitalGainRow[] = []

  const shortTermSectionIdx = aoa.findIndex((r) => String(r[0] ?? "").trim() === "Short Term Trades")
  if (shortTermSectionIdx >= 0) {
    const headerIdx = shortTermSectionIdx + 2 // section title, blank, header
    if (String((aoa[headerIdx] as unknown[])?.[0] ?? "").toLowerCase().includes("symbol")) {
      const { rows: parsed } = readTradeTable(aoa, headerIdx)
      for (const r of parsed) rows.push({ ...r, gain_type: "STCG" })
    }
  }

  const longTermSectionIdx = aoa.findIndex((r) => String(r[0] ?? "").trim() === "Long Term Trades")
  if (longTermSectionIdx >= 0) {
    const headerIdx = longTermSectionIdx + 2
    if (String((aoa[headerIdx] as unknown[])?.[0] ?? "").toLowerCase().includes("symbol")) {
      const { rows: parsed } = readTradeTable(aoa, headerIdx)
      for (const r of parsed) rows.push({ ...r, gain_type: "LTCG" })
    }
  }

  return { rows, financialYear }
}
