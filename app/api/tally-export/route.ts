import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import {
  generateTallyXML,
  getExportSummary,
  type TallyInvoice,
  type TallyPurchase,
  type TallyPayment,
} from "@/lib/tally-xml"

// GET  — returns a summary (counts + totals) without generating the file
// POST — generates and returns the XML file as a download
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const fy = searchParams.get("fy") || currentFY()
    const types = parseTypes(searchParams.get("types"))

    const { invoices, purchases, payments } = await fetchData(orgId, fy)
    const summary = getExportSummary(invoices, purchases, payments, types)
    return NextResponse.json({ summary, financialYear: fy })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const fy    = body.fy    || currentFY()
    const types = parseTypes(body.types)

    const profileRows = await sql`SELECT full_name, gstin FROM profiles WHERE org_id = ${orgId} LIMIT 1`
    const profile = profileRows[0] ?? { full_name: "My Business", gstin: null }

    const { invoices, purchases, payments } = await fetchData(orgId, fy)

    const xml = generateTallyXML({
      profile: { company_name: profile.full_name || "My Business", gstin: profile.gstin },
      invoices,
      purchases,
      payments,
      financialYear: fy,
      voucherTypes: types,
    })

    const filename = `Tally_Export_${fy.replace("-", "_")}_${types.join("-")}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type":        "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentFY(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const start = month >= 4 ? year : year - 1
  return `${start}-${String(start + 1).slice(-2)}`
}

function parseTypes(raw: string | null | undefined): ("sales" | "purchases" | "receipts")[] {
  const allowed = ["sales", "purchases", "receipts"] as const
  if (!raw) return [...allowed]
  const requested = raw.split(",").map((s) => s.trim())
  return allowed.filter((t) => requested.includes(t))
}

async function fetchData(orgId: number, fy: string) {
  const [invoiceRows, purchaseRows, paymentRows] = await Promise.all([
    // Sales invoices for the FY
    sql`
      SELECT
        i.invoice_number, i.invoice_date, i.description,
        i.amount_before_tax, i.cgst_rate, i.sgst_rate, i.igst_rate,
        i.cgst_amount, i.sgst_amount,
        COALESCE(i.igst_amount, 0) as igst_amount,
        i.total_amount, i.financial_year, i.place_of_supply,
        c.name as client_name, c.gstin as client_gstin
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.org_id = ${orgId}
        AND i.financial_year = ${fy}
      ORDER BY i.invoice_date ASC
    `,
    // Purchase bills for the FY
    sql`
      SELECT
        vendor_name, vendor_gstin, invoice_date,
        COALESCE(invoice_number, '') as invoice_number,
        description, amount, cgst, sgst, igst, total_with_tax
      FROM purchases
      WHERE org_id = ${orgId}
        AND financial_year = ${fy}
      ORDER BY invoice_date ASC
    `,
    // Payments for the FY
    sql`
      SELECT
        p.payment_date, p.reference_number, p.payment_method,
        p.amount,
        COALESCE(p.tds_amount, 0) as tds_amount,
        c.name as client_name,
        i.invoice_number
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN clients c ON COALESCE(p.client_id, i.client_id) = c.id
      WHERE p.org_id = ${orgId}
        AND CASE
          WHEN EXTRACT(MONTH FROM p.payment_date) >= 4
            THEN EXTRACT(YEAR FROM p.payment_date)::text || '-' || LPAD(((EXTRACT(YEAR FROM p.payment_date)+1)%100)::text, 2, '0')
          ELSE (EXTRACT(YEAR FROM p.payment_date)-1)::text || '-' || LPAD((EXTRACT(YEAR FROM p.payment_date)%100)::text, 2, '0')
        END = ${fy}
      ORDER BY p.payment_date ASC
    `,
  ])

  const invoices: TallyInvoice[] = invoiceRows.map((r: any) => ({
    invoice_number:   r.invoice_number,
    invoice_date:     r.invoice_date,
    client_name:      r.client_name || "Unknown Client",
    client_gstin:     r.client_gstin,
    description:      r.description || "",
    amount_before_tax: Number(r.amount_before_tax),
    cgst_rate:        Number(r.cgst_rate),
    sgst_rate:        Number(r.sgst_rate),
    igst_rate:        Number(r.igst_rate || 0),
    cgst_amount:      Number(r.cgst_amount),
    sgst_amount:      Number(r.sgst_amount),
    igst_amount:      Number(r.igst_amount),
    total_amount:     Number(r.total_amount),
    financial_year:   r.financial_year,
    place_of_supply:  r.place_of_supply,
  }))

  const purchases: TallyPurchase[] = purchaseRows.map((r: any) => ({
    invoice_number: r.invoice_number || null,
    invoice_date:   r.invoice_date,
    vendor_name:    r.vendor_name,
    vendor_gstin:   r.vendor_gstin,
    description:    r.description,
    amount:         Number(r.amount),
    cgst:           Number(r.cgst),
    sgst:           Number(r.sgst),
    igst:           Number(r.igst),
    total_with_tax: Number(r.total_with_tax),
  }))

  const payments: TallyPayment[] = paymentRows.map((r: any) => ({
    payment_date:     r.payment_date,
    reference_number: r.reference_number,
    payment_method:   r.payment_method,
    amount:           Number(r.amount),
    tds_amount:       Number(r.tds_amount || 0),
    client_name:      r.client_name || "Unknown",
    invoice_number:   r.invoice_number,
  }))

  return { invoices, purchases, payments }
}
