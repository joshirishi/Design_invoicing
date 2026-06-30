import { type ParsedBankRow, parseAmount, parseDate } from "./types"

// Parse a bank statement CSV file buffer into ParsedBankRow[]
// Handles ICICI bank CSV format as well as generic Date/Description/Debit/Credit/Balance columns
export function parseCsvBank(text: string): ParsedBankRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Detect header row — skip lines that don't look like headers
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes("date") && (lower.includes("debit") || lower.includes("withdrawal") || lower.includes("credit"))) {
      headerIdx = i
      break
    }
  }

  const headers = lines[headerIdx]
    .split(",")
    .map((h) => h.replace(/"/g, "").trim().toLowerCase())

  const rows: ParsedBankRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    // Handle quoted CSV fields
    const values = splitCsvLine(lines[i])
    if (values.length < 2) continue

    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.includes(k))
        if (idx >= 0) return values[idx]?.replace(/"/g, "").trim()
      }
      return ""
    }

    const rawDate = get(["date", "txn date", "transaction date", "value date"])
    if (!rawDate) continue

    const row: ParsedBankRow = {
      transaction_date: parseDate(rawDate),
      description: get(["description", "narration", "particulars", "remarks", "transaction details"]) || "",
      reference_number: get(["reference", "ref no", "cheque no", "chq", "utr"]) || null,
      debit: parseAmount(get(["debit", "withdrawal", "dr"])),
      credit: parseAmount(get(["credit", "deposit", "cr"])),
      balance: parseAmount(get(["balance", "closing balance"])),
    }

    // Skip rows that have no monetary data
    if (row.debit === null && row.credit === null) continue

    rows.push(row)
  }

  return rows
}

// Splits a CSV line respecting quoted fields
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
