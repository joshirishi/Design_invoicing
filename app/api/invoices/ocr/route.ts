import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

// POST /api/invoices/ocr
// Accepts a multipart form with a "file" field (PNG/JPG/WEBP/PDF).
// Returns extracted invoice data as JSON for the user to confirm.
//
// Requires env: GOOGLE_GENERATIVE_AI_API_KEY
// (Google Gemini — free tier: 1500 req/day, ~$0.0001/image on paid)

const PROMPT = `You are an invoice data extractor for Indian tax invoices.
Extract all invoice fields from this document and return ONLY a valid JSON object — no markdown, no explanation.

Return this exact shape:
{
  "invoice_number": string | null,
  "client_name": string | null,
  "client_gstin": string | null,
  "invoice_date": "YYYY-MM-DD" | null,
  "line_items": [
    {
      "description": string,
      "hsn_code": string | null,
      "quantity": number,
      "rate": number,
      "gst_rate": number (combined %, e.g. 18 for 9+9)
    }
  ],
  "cgst_rate": number | null,
  "sgst_rate": number | null,
  "total_amount": number | null,
  "terms": string | null
}

Rules:
- If you cannot read a field clearly, set it to null.
- For line_items, include every line on the invoice.
- gst_rate should be the combined rate (CGST + SGST), e.g. 18 for 9% + 9%.
- Amounts should be plain numbers without currency symbols or commas.
- invoice_date must be YYYY-MM-DD format.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OCR not configured",
        detail: "Add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables. Get a free key at aistudio.google.com.",
      },
      { status: 503 },
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const supported = ["png", "jpg", "jpeg", "webp", "pdf"]
    if (!supported.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type ".${ext}". Use PNG, JPG, WEBP, or PDF.` },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const google = createGoogleGenerativeAI({ apiKey })

    let result: string

    if (ext === "pdf") {
      // For PDFs, extract text first then ask Gemini to structure it
      const pdfParse = (await import("pdf-parse")).default
      const pdfData = await pdfParse(buffer)
      const text = pdfData.text?.trim()

      if (!text) {
        return NextResponse.json(
          { error: "Could not extract text from PDF. Is it a scanned/image PDF? Try uploading as an image instead." },
          { status: 422 },
        )
      }

      const { text: response } = await generateText({
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: `${PROMPT}\n\nHere is the invoice text:\n\n${text.slice(0, 8000)}`,
          },
        ],
      })
      result = response
    } else {
      // Image — pass directly as base64
      const base64 = buffer.toString("base64")
      const mimeMap: Record<string, string> = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
      }
      const mimeType = mimeMap[ext] ?? "image/jpeg"

      const { text: response } = await generateText({
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: base64, mimeType },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      })
      result = response
    }

    // Strip markdown code fences if Gemini wraps the JSON
    const cleaned = result.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "AI returned unexpected output. Try a clearer image.", raw: result.slice(0, 500) },
        { status: 422 },
      )
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error("[invoices/ocr] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR failed" },
      { status: 500 },
    )
  }
}
