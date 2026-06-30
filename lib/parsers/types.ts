// Shared output shape for all bank statement parsers
export interface ParsedBankRow {
  transaction_date: string   // ISO date YYYY-MM-DD
  description: string
  reference_number: string | null
  debit: number | null
  credit: number | null
  balance: number | null
}

// Helper: clean a numeric string like "1,23,456.78" → 123456.78
export function parseAmount(raw: string | undefined | null): number | null {
  if (!raw) return null
  const cleaned = String(raw).replace(/[^0-9.-]/g, "").trim()
  if (!cleaned || cleaned === "-") return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Helper: parse a DD/MM/YYYY or DD-MMM-YY or DD-MMM-YYYY date into ISO
export function parseDate(raw: string | undefined | null): string {
  if (!raw) return new Date().toISOString().split("T")[0]

  const s = String(raw).trim()

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // DD-MMM-YY or DD-MMM-YYYY (e.g. 04-MAY-25 or 04-May-2025)
  const dmy2 = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/)
  if (dmy2) {
    const months: Record<string, string> = {
      jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
      jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
    }
    const [, d, mon, y] = dmy2
    const m = months[mon.toLowerCase()] || "01"
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y
    return `${year}-${m}-${d.padStart(2, "0")}`
  }

  // Try native Date parse as last resort
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0]

  return new Date().toISOString().split("T")[0]
}
