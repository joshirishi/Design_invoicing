// Parses a bulk invoice import CSV into structured invoice rows.
// Expected columns (case-insensitive, flexible names):
//   invoice_number, client_name, invoice_date, amount_before_tax,
//   cgst_rate, sgst_rate, status, description, hsn_code, terms, payment_due_days

export interface ParsedInvoiceRow {
  invoice_number: string
  client_name: string
  invoice_date: string        // ISO date
  amount_before_tax: number
  cgst_rate: number           // default 9
  sgst_rate: number           // default 9
  cgst_amount: number         // computed
  sgst_amount: number         // computed
  total_amount: number        // computed
  description: string
  hsn_code: string | null
  terms: string | null
  status: "paid" | "unpaid" | "overdue"
  payment_due_days: number    // default 7
}

export interface ParseInvoiceResult {
  rows: ParsedInvoiceRow[]
  errors: Array<{ line: number; message: string }>
}

export function parseInvoiceCsv(text: string): ParseInvoiceResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, message: "File is empty or has no data rows" }] }

  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/"/g, "").trim().toLowerCase().replace(/[\s_-]+/g, "_"))

  const get = (row: string[], keys: string[]): string => {
    for (const k of keys) {
      const idx = headers.findIndex((h) => h === k || h.includes(k.split("_")[0]))
      if (idx >= 0) return row[idx]?.replace(/"/g, "").trim() ?? ""
    }
    return ""
  }

  const rows: ParsedInvoiceRow[] = []
  const errors: Array<{ line: number; message: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/"/g, "").trim())

    const invoiceNumber = get(cols, ["invoice_number", "invoice_no", "inv_no", "number"])
    const clientName    = get(cols, ["client_name", "client", "customer", "party"])
    const dateRaw       = get(cols, ["invoice_date", "date", "inv_date"])
    const amtRaw        = get(cols, ["amount_before_tax", "amount", "subtotal", "net_amount", "basic_amount"])
    const description   = get(cols, ["description", "desc", "particulars", "service"])
    const statusRaw     = get(cols, ["status", "payment_status"])
    const cgstRaw       = get(cols, ["cgst_rate", "cgst", "cgst_%"])
    const sgstRaw       = get(cols, ["sgst_rate", "sgst", "sgst_%"])
    const hsnRaw        = get(cols, ["hsn_code", "hsn", "sac"])
    const termsRaw      = get(cols, ["terms", "payment_terms", "notes"])
    const dueDaysRaw    = get(cols, ["payment_due_days", "due_days", "due_in"])

    // Validate required fields
    if (!invoiceNumber) { errors.push({ line: i + 1, message: "Missing invoice_number" }); continue }
    if (!clientName)    { errors.push({ line: i + 1, message: "Missing client_name" }); continue }
    if (!amtRaw)        { errors.push({ line: i + 1, message: "Missing amount" }); continue }

    const amount = parseFloat(amtRaw.replace(/[^0-9.-]/g, ""))
    if (isNaN(amount) || amount < 0) { errors.push({ line: i + 1, message: `Invalid amount: "${amtRaw}"` }); continue }

    const invoiceDate = fallbackParseDate(dateRaw)

    const cgstRate = cgstRaw ? parseFloat(cgstRaw) || 9 : 9
    const sgstRate = sgstRaw ? parseFloat(sgstRaw) || 9 : 9
    const cgstAmount = Math.round(amount * (cgstRate / 100) * 100) / 100
    const sgstAmount = Math.round(amount * (sgstRate / 100) * 100) / 100
    const totalAmount = Math.round((amount + cgstAmount + sgstAmount) * 100) / 100

    const validStatuses = ["paid", "unpaid", "overdue"]
    const status = (validStatuses.includes(statusRaw.toLowerCase()) ? statusRaw.toLowerCase() : "unpaid") as ParsedInvoiceRow["status"]

    rows.push({
      invoice_number: invoiceNumber,
      client_name: clientName,
      invoice_date: invoiceDate,
      amount_before_tax: amount,
      cgst_rate: cgstRate,
      sgst_rate: sgstRate,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      total_amount: totalAmount,
      description: description || invoiceNumber,
      hsn_code: hsnRaw || null,
      terms: termsRaw || null,
      status,
      payment_due_days: dueDaysRaw ? parseInt(dueDaysRaw) || 7 : 7,
    })
  }

  return { rows, errors }
}

// Sync fallback (used when dynamic import isn't available)
function fallbackParseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0]
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const dt = new Date(raw)
  return isNaN(dt.getTime()) ? new Date().toISOString().split("T")[0] : dt.toISOString().split("T")[0]
}

// Generate a downloadable CSV template string
export function getInvoiceImportTemplate(): string {
  const header = "invoice_number,client_name,invoice_date,amount_before_tax,cgst_rate,sgst_rate,status,description,hsn_code,terms,payment_due_days"
  const example1 = "INV-001,Acme Corp,01/04/2025,50000,9,9,paid,Web Development Services,9983,,30"
  const example2 = "INV-002,Beta Ltd,15/04/2025,25000,9,9,unpaid,UI/UX Design,9983,Payment due in 30 days,30"
  return [header, example1, example2].join("\n")
}
