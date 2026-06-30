import * as XLSX from "xlsx"
import { type ParsedBankRow, parseAmount, parseDate } from "./types"

// Parse an XLS or XLSX bank statement buffer into ParsedBankRow[]
// Handles ICICI savings/current account XLS format
export function parseXlsBank(buffer: Buffer): ParsedBankRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to array-of-arrays to find the header row dynamically
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

  // Find header row (contains "date" and some amount column)
  let headerRow = 0
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const rowStr = aoa[i].join(" ").toLowerCase()
    if (rowStr.includes("date") && (rowStr.includes("debit") || rowStr.includes("withdrawal") || rowStr.includes("credit"))) {
      headerRow = i
      break
    }
  }

  const headers = (aoa[headerRow] as string[]).map((h) =>
    String(h ?? "").toLowerCase().trim()
  )

  const getIdx = (keys: string[]) => {
    for (const k of keys) {
      const idx = headers.findIndex((h) => h.includes(k))
      if (idx >= 0) return idx
    }
    return -1
  }

  const dateIdx    = getIdx(["date", "txn date", "transaction date", "value date"])
  const descIdx    = getIdx(["description", "narration", "particulars", "remarks"])
  const refIdx     = getIdx(["reference", "ref no", "cheque", "utr"])
  const debitIdx   = getIdx(["debit", "withdrawal", "dr"])
  const creditIdx  = getIdx(["credit", "deposit", "cr"])
  const balanceIdx = getIdx(["balance", "closing"])

  if (dateIdx < 0) return []

  const rows: ParsedBankRow[] = []

  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]
    const rawDate = row[dateIdx]
    if (!rawDate) continue

    // XLSX may return Date objects when cellDates: true
    let dateStr: string
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().split("T")[0]
    } else {
      dateStr = parseDate(String(rawDate))
    }

    const debit  = debitIdx  >= 0 ? parseAmount(String(row[debitIdx]  ?? "")) : null
    const credit = creditIdx >= 0 ? parseAmount(String(row[creditIdx] ?? "")) : null

    if (debit === null && credit === null) continue

    rows.push({
      transaction_date: dateStr,
      description: descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "",
      reference_number: refIdx >= 0 ? String(row[refIdx] ?? "").trim() || null : null,
      debit,
      credit,
      balance: balanceIdx >= 0 ? parseAmount(String(row[balanceIdx] ?? "")) : null,
    })
  }

  return rows
}
