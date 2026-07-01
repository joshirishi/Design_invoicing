import { type ParsedBankRow, parseAmount, parseDate } from "./types"

// Parse a bank statement CSV file buffer into ParsedBankRow[]
//
// Handles three ICICI formats:
//
// 1. ICICI Savings/Current CSV
//    Columns: Transaction Date | Transaction Remarks | Value Date | Withdrawal Amount | Deposit Amount | Balance
//
// 2. ICICI Credit Card CSV (CreditCardStatement_icici.CSV)
//    Columns: Transaction Date | Transaction Details | Amount (in INR)
//    Amount: positive = charge, negative = payment/credit
//
// 3. Generic format with Date / Description / Debit / Credit / Balance
export function parseCsvBank(text: string): ParsedBankRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Find header row
  let headerIdx = 0
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes("date") && (
      lower.includes("amount") || lower.includes("debit") ||
      lower.includes("withdrawal") || lower.includes("credit") || lower.includes("deposit")
    )) {
      headerIdx = i
      break
    }
  }

  const headers = splitCsvLine(lines[headerIdx])
    .map((h) => h.replace(/"/g, "").trim().toLowerCase())

  const idx = (keys: string[]): number => {
    for (const k of keys) {
      const i = headers.findIndex((h) => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }

  const dateIdx    = idx(["transaction date", "txn date", "date", "value date"])
  const descIdx    = idx(["transaction details", "txn remarks", "narration", "description", "particulars", "remarks"])
  const refIdx     = idx(["ref no", "cheque", "reference", "utr", "chq"])
  const debitIdx   = idx(["withdrawal", "debit"])
  const creditIdx  = idx(["deposit", "credit"])
  const amtIdx     = idx(["amount (in inr)", "amount"])   // single-column CC format
  const balanceIdx = idx(["balance", "closing balance"])

  if (dateIdx < 0) return []

  const isCCMode = debitIdx < 0 && creditIdx < 0 && amtIdx >= 0

  const rows: ParsedBankRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]).map((v) => v.replace(/"/g, "").trim())
    if (values.length < 2) continue

    const rawDate = values[dateIdx]
    if (!rawDate) continue

    let debit:  number | null = null
    let credit: number | null = null

    if (isCCMode) {
      const rawAmt = parseAmount(values[amtIdx])
      if (rawAmt === null) continue
      if (rawAmt >= 0) { debit = rawAmt } else { credit = Math.abs(rawAmt) }
    } else {
      debit  = debitIdx  >= 0 ? parseAmount(values[debitIdx])  : null
      credit = creditIdx >= 0 ? parseAmount(values[creditIdx]) : null
    }

    if (debit === null && credit === null) continue
    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue

    rows.push({
      transaction_date: parseDate(rawDate),
      description:      descIdx >= 0 ? values[descIdx] : "",
      reference_number: refIdx  >= 0 ? values[refIdx]  || null : null,
      debit:  debit  && debit  > 0 ? debit  : null,
      credit: credit && credit > 0 ? credit : null,
      balance: balanceIdx >= 0 ? parseAmount(values[balanceIdx]) : null,
    })
  }

  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === "," && !inQuotes) { result.push(current); current = "" }
    else { current += char }
  }
  result.push(current)
  return result
}
