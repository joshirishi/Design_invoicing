import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = await getCurrentOrgId()
    const { id } = params

    const invoices = await sql`
      SELECT i.*,
        json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'address', c.address, 'gstin', c.gstin) as client
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${id} AND i.org_id = ${orgId}
    `
    const invoice = invoices[0]
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    if (!invoice.client?.email) return NextResponse.json({ error: "Client has no email address" }, { status: 400 })

    const profiles = await sql`SELECT * FROM profiles WHERE org_id = ${orgId} LIMIT 1`
    const profile = profiles[0]
    if (!profile) return NextResponse.json({ error: "Profile not configured" }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    await sendInvoiceEmail({
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientGstin: invoice.client.gstin,
      senderName: profile.full_name,
      senderEmail: profile.email,
      senderGstin: profile.gstin,
      senderPan: profile.pan_no,
      invoiceDate: invoice.invoice_date,
      totalAmount: Number(invoice.total_amount),
      amountBeforeTax: Number(invoice.amount_before_tax),
      cgstAmount: Number(invoice.cgst_amount),
      sgstAmount: Number(invoice.sgst_amount),
      cgstRate: Number(invoice.cgst_rate),
      sgstRate: Number(invoice.sgst_rate),
      description: invoice.description,
      hsnCode: invoice.hsn_code,
      serviceDate: invoice.service_date,
      terms: invoice.terms,
      bankName: profile.bank_name,
      accountName: profile.account_name,
      accountNumber: profile.account_number,
      ifscCode: profile.ifsc_code,
      invoiceUrl: `${appUrl}/dashboard/invoices/${id}/pdf`,
    })

    // Stamp sent_at on the invoice
    await sql`
      UPDATE invoices SET sent_at = NOW() WHERE id = ${id} AND org_id = ${orgId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
