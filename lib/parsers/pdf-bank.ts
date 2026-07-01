import { type ParsedBankRow, parseAmount, parseDate } from "./types"

// Parse a bank statement PDF buffer into ParsedBankRow[]
// Uses pdf-parse for text extraction, then regex for ICICI format.
// ICICI bank statement lines look like:
//   "20 Jun 2026  UPI-MERCHANT NAME  REF123456  5,000.00   -   1,23,456.78"
// or credit card statement:
//   "04-MAY-25  Late Payment Fee  900.00  900.00"
export async function parsePdfBank(buffer: Buffer): Promise<ParsedBankRow[]> {
  // Import the internal module directly to avoid pdf-parse v1's test-runner
  // which tries to open './test/data/05-versions-space.pdf' and fails in production
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
  const data = await pdfParse(buffer)
  const text = data.text

  return extractRowsFromText(text)
}

function extractRowsFromText(text: string): ParsedBankRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: ParsedBankRow[] = []

  // Regex patterns for different ICICI statement line formats
  // Pattern 1: "DD-MMM-YY  description  amount  amount" (credit card CSV/PDF style)
  const ccPattern = /^(\d{2}-[A-Za-z]{3}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/

  // Pattern 2: "DD Mon YYYY  description  ref  withdrawal  deposit  balance"
  const bankPattern = /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s{2,}([\d,]*\.?\d*)\s+([\d,]*\.?\d*)\s+([\d,]+\.\d{2})\s*$/

  // Pattern 3: Generic amount detection — find lines with a date + amounts
  const genericPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\/\-][A-Za-z]{3}[\/\-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/

  for (const line of lines) {
    // Try bank pattern first (more specific)
    const m2 = line.match(bankPattern)
    if (m2) {
      const [, date, desc, w, d, bal] = m2
      const debit  = parseAmount(w)
      const credit = parseAmount(d)
      if (debit !== null || credit !== null) {
        rows.push({
          transaction_date: parseDate(date),
          description: desc.trim(),
          reference_number: null,
          debit:   debit  && debit  > 0 ? debit  : null,
          credit:  credit && credit > 0 ? credit : null,
          balance: parseAmount(bal),
        })
        continue
      }
    }

    // Try CC pattern
    const m1 = line.match(ccPattern)
    if (m1) {
      const [, date, desc, , amt] = m1
      const amount = parseAmount(amt)
      if (amount !== null) {
        // Negative descriptions (payments/refunds) indicate credits
        const isCredit = desc.toLowerCase().includes("payment received") || desc.toLowerCase().includes("refund")
        rows.push({
          transaction_date: parseDate(date),
          description: desc.trim(),
          reference_number: null,
          debit:  isCredit ? null : amount,
          credit: isCredit ? amount : null,
          balance: null,
        })
        continue
      }
    }

    // Try generic pattern
    const m3 = line.match(genericPattern)
    if (m3) {
      const [, date, desc, amt] = m3
      const amount = parseAmount(amt)
      if (amount !== null && amount > 0) {
        const isCredit = desc.toLowerCase().includes("credit") || desc.toLowerCase().includes("received")
        rows.push({
          transaction_date: parseDate(date),
          description: desc.trim(),
          reference_number: null,
          debit:  isCredit ? null : amount,
          credit: isCredit ? amount : null,
          balance: null,
        })
      }
    }
  }

  return rows
}
