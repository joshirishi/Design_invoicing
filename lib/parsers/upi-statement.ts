import * as XLSX from "xlsx"

// Parses a UPI app statement export (PhonePe / BHIM / Google Pay / Amazon Pay)
// into a name-resolution lookup — VPA/UPI ID → real counterparty name.
//
// Deliberately does NOT extract amounts or create transactions: the same money
// movement already exists in an uploaded bank/credit-card statement, so
// importing it again here would double-count it. This exists purely so a
// terse bank description ("UPI/GURUNATH A/gurunathdhavad/...") can be
// resolved to the fuller name the UPI app already knows ("Gurunath Dhavad"),
// via lib/reconcile-engine.ts's resolveCounterpartyName().
//
// NOT verified against a real export of any of these apps (no sample file
// available, unlike the bank/broker parsers) — column names are inferred from
// each app's typical statement layout. Generic header-keyword detection is
// used specifically to tolerate drift; if an app's real export doesn't match,
// this returns zero rows rather than silently importing garbage.

export interface ParsedUpiContact {
  vpa: string | null
  display_name: string
}

const NAME_KEYS = ["paid to", "received from", "payee name", "counterparty", "to / from", "name"]
const VPA_KEYS = ["vpa", "upi id", "payee vpa", "upi address"]

function isMeaningfulName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && !/^\d+$/.test(trimmed)
}

function rowsFromAoa(aoa: unknown[][]): ParsedUpiContact[] {
  let headerRow = -1
  for (let i = 0; i < Math.min(20, aoa.length); i++) {
    const rowStr = (aoa[i] as unknown[]).join(" ").toLowerCase()
    if (NAME_KEYS.some((k) => rowStr.includes(k)) || VPA_KEYS.some((k) => rowStr.includes(k))) {
      headerRow = i
      break
    }
  }
  if (headerRow < 0) return []

  const headers = (aoa[headerRow] as unknown[]).map((h) => String(h ?? "").toLowerCase().trim())
  const idx = (keys: string[]): number => {
    for (const k of keys) {
      const i = headers.findIndex((h) => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }

  const nameIdx = idx(NAME_KEYS)
  const vpaIdx = idx(VPA_KEYS)
  if (nameIdx < 0 && vpaIdx < 0) return []

  const rows: ParsedUpiContact[] = []
  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]
    const name = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : ""
    const vpa = vpaIdx >= 0 ? String(row[vpaIdx] ?? "").trim() : ""
    if (!isMeaningfulName(name) && !vpa) continue
    rows.push({
      vpa: vpa || null,
      display_name: isMeaningfulName(name) ? name : vpa,
    })
  }
  return rows
}

export function parseUpiStatementXls(buffer: Buffer): ParsedUpiContact[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  return rowsFromAoa(aoa)
}

export function parseUpiStatementCsv(text: string): ParsedUpiContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const aoa = lines.map((line) => splitCsvLine(line).map((v) => v.replace(/"/g, "").trim()))
  return rowsFromAoa(aoa)
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

// Dedupes to one contact per VPA (or per name, when no VPA is present),
// keeping the most-recently-seen display name.
export function dedupeContacts(rows: ParsedUpiContact[]): ParsedUpiContact[] {
  const byKey = new Map<string, ParsedUpiContact>()
  for (const row of rows) {
    const key = (row.vpa || row.display_name).toLowerCase()
    byKey.set(key, row)
  }
  return Array.from(byKey.values())
}
