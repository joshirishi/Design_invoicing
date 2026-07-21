import { generateObject } from "ai"
import { z } from "zod"
import { DOC_ORDER } from "@/components/gst-document-checklist"

// Fallback classifier for files none of the deterministic parsers recognised —
// mirrors upi-statement.ts's extractUpiContactsWithGemini pattern: only called
// when the structural checks (schema/sheet-name/report-title matches) already
// came up empty, never as the primary path.

const MODEL_ID = "google/gemini-2.5-flash"

const ClassifyResultSchema = z.object({
  category: z.enum(["bank_statement", "upi_statement", "gst_document", "unsupported"]),
  gstDocType: z.enum(DOC_ORDER as [string, ...string[]]).nullable(),
  reasoning: z.string(),
})

export interface AiClassification {
  category: "bank_statement" | "upi_statement" | "gst_document" | "unsupported"
  gstDocType: string | null
  reasoning: string
}

function hasApiKey(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
}

// Deliberately scoped to categories that are either safe to store as-is
// (gst_document — no figures are extracted, just filed) or that already have
// a proven Gemini row-extraction fallback of their own (bank/UPI statements).
// GSTR-2B and Tax P&L are excluded: getting a tax figure or capital-gains
// classification wrong from a free-text AI guess is a real-money mistake, not
// a filing convenience, so those stay strictly deterministic.
export async function classifyDocumentWithGemini(text: string, fileName: string): Promise<AiClassification | null> {
  if (!hasApiKey()) {
    console.warn("[ai-classify] No Gemini API key set — skipping AI classification fallback")
    return null
  }
  if (!text.trim()) return null

  const docTypeList = DOC_ORDER.join(", ")
  const prompt = `You are classifying a document uploaded to an Indian GST bookkeeping app. Deterministic
parsers already tried and failed to recognise this file's structure. Look at the filename and
extracted text below and decide which category it most likely belongs to:

- "bank_statement": a bank or credit card statement with dated transactions (debit/credit/balance)
- "upi_statement": a UPI app statement (PhonePe/GPay/BHIM/Amazon Pay) listing payments to/from people or merchants
- "gst_document": a document from the Indian GST portal (gst.gov.in) — a filed return acknowledgment
  (GSTR-1/3B/9), registration certificate, payment challan, or an electronic ledger. If this fits,
  also pick the single closest gstDocType from this list: ${docTypeList}
- "unsupported": none of the above, or you're not confident

Filename: ${fileName}

Text (may be truncated):
${text.slice(0, 6000)}

Give a one-sentence reasoning for your choice.`

  try {
    const { object } = await generateObject({ model: MODEL_ID, schema: ClassifyResultSchema, prompt })
    return object
  } catch (err) {
    console.error("[ai-classify] Gemini classification failed:", err)
    return null
  }
}
