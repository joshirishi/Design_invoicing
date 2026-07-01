import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGateway } from "@ai-sdk/gateway"

// POST /api/invoices/ocr
// Accepts a multipart form with a "file" field (PNG/JPG/WEBP/PDF).
// Returns extracted invoice data as JSON for the user to confirm.
//
// Uses @ai-sdk/gateway → google/gemini-2.5-flash
// AI SDK v7: content parts use { type: "image", image, mediaType } or { type: "file", data, mediaType }

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
  const gatewayKey = process.env.AI_GATEWAY_API_KEY

  if (!gatewayKey) {
    return NextResponse.json(
      { error: "OCR not configured", detail: "AI_GATEWAY_API_KEY is missing." },
      { status: 503 },
    )
  }

  const gateway = createGateway({ apiKey: gatewayKey })
  const model = gateway("google/gemini-2.5-flash")

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

    const buffer = Buffer.from(await file.arrayBuffer())

    // AI SDK v7 uses "mediaType" (not "mimeType") in content parts
    const mediaTypeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      pdf: "application/pdf",
    }
    const mediaType = mediaTypeMap[ext] ?? "image/jpeg"

    // Build the file content part (AI SDK v7 schema):
    //   - Images: { type: "image", image: Buffer, mediaType }
    //   - PDFs:   { type: "file", data: Buffer, mediaType }
    // Gemini 2.5 Flash reads PDFs natively — no pdf-parse needed.
    const filePart = ext === "pdf"
      ? { type: "file" as const, data: buffer, mediaType }
      : { type: "image" as const, image: buffer, mediaType }

    const { text: response } = await generateText({
      model,
      messages: [{
        role: "user",
        content: [
          filePart,
          { type: "text", text: PROMPT },
        ],
      }],
    })

    // Strip markdown code fences if the model wraps the JSON
    const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "AI returned unexpected output. Try a clearer image.", raw: response.slice(0, 500) },
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
