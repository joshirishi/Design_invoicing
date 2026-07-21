import { generateObject } from "ai"
import { z } from "zod"
import type { ParsedBankRow } from "./types"

// Fallback transaction extractor for bank/credit-card statements that don't match
// any known CSV/XLS/PDF layout — mirrors upi-statement.ts's
// extractUpiContactsWithGemini. Only called when the deterministic parsers
// (header-keyword matching for CSV/XLS, ICICI-format regex for PDF) already
// returned zero rows, never as the primary path.

const MODEL_ID = "google/gemini-2.5-flash"
const CHUNK_SIZE = 6000
const MAX_CHUNKS = 12

const GeminiRowSchema = z.object({
  transaction_date: z.string().describe("ISO date YYYY-MM-DD"),
  description: z.string(),
  reference_number: z.string().nullable(),
  debit: z.number().nullable().describe("Amount debited/withdrawn, null if this row is a credit"),
  credit: z.number().nullable().describe("Amount credited/deposited, null if this row is a debit"),
  balance: z.number().nullable(),
})

const GeminiResultSchema = z.object({ transactions: z.array(GeminiRowSchema) })

function buildPrompt(chunk: string): string {
  return `Extract every bank/credit-card transaction row from this statement text into structured
data. Each row has a date, a description/narration, and either a debit (money out) or a credit
(money in) amount — never both. Include the running balance and any reference/UTR number if
present. Skip header rows, page footers, and summary/totals rows. If a field isn't present, use
null.

Text:
${chunk}`
}

export async function extractBankTransactionsWithGemini(text: string): Promise<ParsedBankRow[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("[bank-ai] Neither AI_GATEWAY_API_KEY nor GOOGLE_GENERATIVE_AI_API_KEY is set — skipping Gemini fallback")
    return []
  }

  const rows: ParsedBankRow[] = []
  const chunks: string[] = []
  for (let i = 0; i < text.length && chunks.length < MAX_CHUNKS; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    try {
      const { object } = await generateObject({ model: MODEL_ID, schema: GeminiResultSchema, prompt: buildPrompt(chunk) })
      for (const t of object.transactions) {
        if (!t.transaction_date || (!t.debit && !t.credit)) continue
        rows.push({
          transaction_date: t.transaction_date,
          description: t.description,
          reference_number: t.reference_number,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance,
        })
      }
    } catch (err) {
      console.error("[bank-ai] Gemini fallback batch failed:", err)
    }
  }

  return rows
}
