import * as XLSX from "xlsx"
import { generateObject } from "ai"
import { z } from "zod"

// Parses a UPI app statement export (PhonePe / BHIM / Google Pay / Amazon Pay)
// into a name-resolution lookup — UTR/VPA → real counterparty name.
//
// Deliberately does NOT extract amounts or create transactions: the same money
// movement already exists in an uploaded bank/credit-card statement, so
// importing it again here would double-count it. This exists purely so a
// terse bank description ("UPI/GURUNATH A/gurunathdhavad/.../058376116419/")
// can be resolved to the fuller name the UPI app already knows ("Gurunath
// Atmaram Dhavade"), via lib/reconcile-engine.ts's resolveCounterpartyName().
//
// The PDF parser below is verified against a real PhonePe statement (98
// pages, Apr 2025 - Mar 2026) — not a guessed format. UTR is the primary
// match key: it's an NPCI-assigned reference shared identically between the
// bank statement and the UPI app statement for the same transaction —
// confirmed against real data (UTR 058376116419 appears in both). The
// CSV/XLS paths remain generic header-detection, unverified against a real
// export of any app, same caveat as before.

export interface ParsedUpiContact {
  utr: string | null
  vpa: string | null
  display_name: string
}

const NAME_KEYS = ["paid to", "received from", "payee name", "counterparty", "to / from", "name"]
const VPA_KEYS = ["vpa", "upi id", "payee vpa", "upi address"]

function isMeaningfulName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && !/^\d+$/.test(trimmed) && !/^\*+/.test(trimmed) // skip masked "******1234"
}

// ─── PhonePe-style PDF statement ───────────────────────────────────────────
// Verified line sequence per transaction block (pdf-parse text extraction,
// real file): Date / Time / "Paid to X" | "Received from X" | "Bill paid - X"
// / "Transaction ID : ..." / "UTR No : ..." / "Debited from XX.." | "Credited
// to XX.." / "DebitINR 218.00" | "CreditINR 1788.00" (Type and amount are
// concatenated with no space in the extracted text).

const DATE_LINE = /^[A-Za-z]{3} \d{1,2}, \d{4}$/
const COUNTERPARTY_LINE = /^(?:Paid to|Received from)\s+(.+)$/i
const UTR_LINE = /^UTR No\s*:\s*(\S+)/i
const TYPE_AMOUNT_LINE = /^(Debit|Credit)\s*INR/i

export async function parseUpiStatementPdf(buffer: Buffer): Promise<ParsedUpiContact[]> {
  // Same dynamic-import workaround as lib/parsers/pdf-bank.ts — pdf-parse v1's
  // default export tries to open a bundled test fixture on init in production.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
  const data = await pdfParse(buffer)
  return extractContactsFromPhonePeText(data.text)
}

export function extractContactsFromPhonePeText(text: string): ParsedUpiContact[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const contacts: ParsedUpiContact[] = []

  for (let i = 0; i < lines.length; i++) {
    if (!DATE_LINE.test(lines[i])) continue

    // Look ahead within the next handful of lines for the counterparty + UTR —
    // tolerant of "Bill paid -" rows (no counterparty name) and minor ordering
    // drift, rather than assuming a rigid fixed offset.
    let name: string | null = null
    let utr: string | null = null
    let sawTypeAmount = false

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (DATE_LINE.test(lines[j])) break // next block started

      const cpMatch = lines[j].match(COUNTERPARTY_LINE)
      if (cpMatch) { name = cpMatch[1].trim(); continue }

      const utrMatch = lines[j].match(UTR_LINE)
      if (utrMatch) { utr = utrMatch[1].trim(); continue }

      if (TYPE_AMOUNT_LINE.test(lines[j])) { sawTypeAmount = true; break }
    }

    if (sawTypeAmount && name && isMeaningfulName(name)) {
      contacts.push({ utr, vpa: null, display_name: name })
    }
  }

  return contacts
}

// ─── Generic CSV/XLS header-detection (BHIM/GPay/Amazon Pay) ──────────────
// Unverified against a real export of any of these — see module header.

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
    rows.push({ utr: null, vpa: vpa || null, display_name: isMeaningfulName(name) ? name : vpa })
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

// ─── Gemini fallback — only when the deterministic parser finds nothing ────
// Per project convention (see lib/ai-categorize.ts), every LLM call here uses
// Gemini Flash via the Vercel AI Gateway. This exists strictly as a fallback
// for a UPI app statement whose layout doesn't match the verified PhonePe
// format above — never run when the deterministic parser already succeeded.
// Bounded to the first ~48,000 characters (roughly the first several hundred
// transactions of a text-based export) to keep latency/cost predictable; a
// statement larger than that will get a partial lookup rather than none.

const MODEL_ID = "google/gemini-2.5-flash"
const CHUNK_SIZE = 6000
const MAX_CHUNKS = 8

const GeminiResultSchema = z.object({
  contacts: z.array(
    z.object({
      utr: z.string().nullable().describe("The UTR / transaction reference number for this entry, if present"),
      vpa: z.string().nullable().describe("The UPI VPA / UPI ID for this entry, if present"),
      display_name: z.string().describe("The real counterparty name (who was paid, or who paid the user)"),
    }),
  ),
})

function buildPrompt(chunk: string): string {
  return `This is raw extracted text from a UPI payment app statement (PhonePe, Google Pay, BHIM, or Amazon Pay). Extract every distinct transaction's counterparty name, UTR/reference number, and UPI VPA (if shown) — a name-resolution lookup only, not a transaction ledger. Skip masked account numbers (e.g. "******1234") and generic bill-payment categories with no real counterparty name.

Text:
${chunk}

Return one entry per real transaction found. If a field isn't present in the text, use null for it.`
}

export async function extractUpiContactsWithGemini(text: string): Promise<ParsedUpiContact[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("[upi-statement] Neither AI_GATEWAY_API_KEY nor GOOGLE_GENERATIVE_AI_API_KEY is set — skipping Gemini fallback")
    return []
  }

  const contacts: ParsedUpiContact[] = []
  const chunks: string[] = []
  for (let i = 0; i < text.length && chunks.length < MAX_CHUNKS; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    try {
      const { object } = await generateObject({ model: MODEL_ID, schema: GeminiResultSchema, prompt: buildPrompt(chunk) })
      for (const c of object.contacts) {
        if (isMeaningfulName(c.display_name)) {
          contacts.push({ utr: c.utr, vpa: c.vpa, display_name: c.display_name })
        }
      }
    } catch (err) {
      console.error("[upi-statement] Gemini fallback batch failed:", err)
    }
  }

  return contacts
}

// Dedupes to one contact per UTR (or VPA, or name, in that priority), keeping
// the most-recently-seen display name.
export function dedupeContacts(rows: ParsedUpiContact[]): ParsedUpiContact[] {
  const byKey = new Map<string, ParsedUpiContact>()
  for (const row of rows) {
    const key = (row.utr || row.vpa || row.display_name).toLowerCase()
    byKey.set(key, row)
  }
  return Array.from(byKey.values())
}
