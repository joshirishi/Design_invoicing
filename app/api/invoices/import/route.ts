import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { parseInvoiceCsv, getInvoiceImportTemplate } from "@/lib/parsers/invoice-csv"

// GET /api/invoices/import — download the CSV template
export async function GET() {
  const csv = getInvoiceImportTemplate()
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="invoice-import-template.csv"',
    },
  })
}

// POST /api/invoices/import — upload a filled-in CSV
// Returns { inserted, skipped, errors }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (ext !== "csv") {
      return NextResponse.json({ error: "Invoice import only supports CSV files." }, { status: 400 })
    }

    const text = await file.text()
    const { rows, errors } = parseInvoiceCsv(text)

    if (rows.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: "Could not parse any rows", parseErrors: errors }, { status: 422 })
    }

    const orgId = await getCurrentOrgId()
    let inserted = 0
    let skipped = 0

    for (const row of rows) {
      // Find or create client by name
      let clientId: number
      const existingClient = await sql`
        SELECT id FROM clients
        WHERE org_id = ${orgId} AND LOWER(name) = LOWER(${row.client_name})
        LIMIT 1
      `

      if (existingClient.length > 0) {
        clientId = existingClient[0].id as number
      } else {
        const newClient = await sql`
          INSERT INTO clients (org_id, name) VALUES (${orgId}, ${row.client_name}) RETURNING id
        `
        clientId = newClient[0].id as number
      }

      // Skip duplicate invoice numbers
      const exists = await sql`
        SELECT id FROM invoices
        WHERE org_id = ${orgId} AND invoice_number = ${row.invoice_number}
        LIMIT 1
      `
      if (exists.length > 0) { skipped++; continue }

      await sql`
        INSERT INTO invoices (
          org_id, client_id, invoice_number, invoice_date,
          description, hsn_code, amount_before_tax,
          cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount,
          terms, status, payment_due_days, import_source
        ) VALUES (
          ${orgId}, ${clientId}, ${row.invoice_number}, ${row.invoice_date},
          ${row.description}, ${row.hsn_code ?? null}, ${row.amount_before_tax},
          ${row.cgst_rate}, ${row.sgst_rate}, ${row.cgst_amount}, ${row.sgst_amount}, ${row.total_amount},
          ${row.terms ?? null}, ${row.status}, ${row.payment_due_days}, 'csv_import'
        )
      `
      inserted++
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: rows.length,
      parseErrors: errors,
    })
  } catch (error) {
    console.error("[invoices/import] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    )
  }
}
