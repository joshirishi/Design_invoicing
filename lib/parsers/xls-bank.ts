import * as XLSX from "xlsx"
import { type ParsedBankRow, parseAmount, parseDate } from "./types"

// Parse an XLS or XLSX bank statement buffer into ParsedBankRow[]
//
// Handles three ICICI formats detected automatically:
//
// 1. ICICI Savings/Current Account XLS
//    Columns: Txn Date | Txn Remarks | Ref No./Cheque No. | Withdrawal Amt (INR) | Deposit Amt (INR) | Balance (INR)
//
// 2. ICICI Credit Card XLS (OpTransactionHistory / CCStatement)
//    Columns: Transaction Date | Transaction Details | Amount (in INR)
//    Amount is positive for charges, negative for payments/credits.
//
// 3. Generic bank XLS — auto-detected by header keyword matching
export function parseXlsBank(buffer: Buffer): ParsedBankRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

  // Find header row (first row containing "date" + some amount/remark column)
  let headerRow = -1
  for (let i = 0; i < Math.min(20, aoa.length); i++) {
    const rowStr = aoa[i].join(" ").toLowerCase()
    if (rowStr.includes("date") && (
      rowStr.includes("amount") || rowStr.includes("withdrawal") ||
      rowStr.includes("deposit") || rowStr.includes("debit") || rowStr.includes("credit")
    )) {
      headerRow = i
      break
    }
  }

  if (headerRow < 0) return []

  const headers = (aoa[headerRow] as string[]).map((h) =>
    String(h ?? "").toLowerCase().trim().replace(/\s+/g, " ")
  )

  const idx = (keys: string[]): number => {
    for (const k of keys) {
      const i = headers.findIndex((h) => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }

  const dateIdx    = idx(["txn date", "transaction date", "date", "value date"])
  const descIdx    = idx(["txn remarks", "transaction details", "description", "narration", "particulars", "remarks"])
  const refIdx     = idx(["ref no", "cheque no", "reference", "utr", "chq"])
  const debitIdx   = idx(["withdrawal amt", "debit", "withdrawal"])
  const creditIdx  = idx(["deposit amt", "credit", "deposit"])
  const amtIdx     = idx(["amount (in inr)", "amount"])   // single-column CC format
  const balanceIdx = idx(["balance"])

  if (dateIdx < 0) return []

  // Detect single-amount (credit card) vs split-amount (savings) mode
  const isCCMode = debitIdx < 0 && creditIdx < 0 && amtIdx >= 0

  const rows: ParsedBankRow[] = []

  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]

    const rawDate = row[dateIdx]
    if (!rawDate) continue

    let dateStr: string
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().split("T")[0]
    } else {
      dateStr = parseDate(String(rawDate))
    }

    const rawDesc = descIdx >= 0 ? String(row[descIdx] ?? "").trim() : ""

    let debit:  number | null = null
    let credit: number | null = null

    if (isCCMode) {
      // Credit card: positive = charge/debit, negative = payment/credit
      const rawAmt = parseAmount(String(row[amtIdx] ?? ""))
      if (rawAmt === null) continue
      if (rawAmt >= 0) {
        debit = rawAmt
      } else {
        credit = Math.abs(rawAmt)
      }
    } else {
      debit  = debitIdx  >= 0 ? parseAmount(String(row[debitIdx]  ?? "")) : null
      credit = creditIdx >= 0 ? parseAmount(String(row[creditIdx] ?? "")) : null
    }

    if (debit === null && credit === null) continue
    // Skip rows where both are zero (often subtotal rows)
    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue

    rows.push({
      transaction_date: dateStr,
      description:      rawDesc,
      reference_number: refIdx >= 0 ? String(row[refIdx] ?? "").trim() || null : null,
      debit:  debit  && debit  > 0 ? debit  : null,
      credit: credit && credit > 0 ? credit : null,
      balance: balanceIdx >= 0 ? parseAmount(String(row[balanceIdx] ?? "")) : null,
    })
  }

  return rows
}
