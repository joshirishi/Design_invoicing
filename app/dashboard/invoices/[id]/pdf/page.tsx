export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { sql } from "@/lib/db"
import { numberToWords } from "@/lib/utils/number-to-words"
import { PrintButton } from "./print-button"
import { TemplatePreview, SAMPLE_PROFILE } from "@/components/template-preview"
import { CanvasTemplatePreview } from "@/components/canvas-template-preview"
import { CLASSIC_TEMPLATE } from "@/lib/template-defaults"
import type { TemplateConfig } from "@/lib/template-defaults"

export default async function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const invoices = await sql`
    SELECT i.*,
      json_build_object(
        'id', c.id, 'name', c.name, 'email', c.email,
        'address', c.address, 'gstin', c.gstin, 'phone', c.phone
      ) as client
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ${id}
  `

  const invoice = invoices[0] as Record<string, unknown> & { client: Record<string, unknown> }
  if (!invoice) notFound()

  // Load profile scoped to org
  const orgId = invoice.org_id as number
  const profiles  = await sql`SELECT * FROM profiles WHERE org_id = ${orgId} LIMIT 1`
  const profile   = profiles[0] as typeof SAMPLE_PROFILE | undefined

  // Load org's active template, fall back to Classic
  const templateRows = await sql`
    SELECT config FROM invoice_templates
    WHERE org_id = ${orgId} AND is_default = TRUE
    ORDER BY updated_at DESC LIMIT 1
  `
  const config: TemplateConfig = (templateRows[0]?.config as TemplateConfig) ?? CLASSIC_TEMPLATE

  // Load line items (if multi-item template)
  const lineItems = await sql`
    SELECT * FROM invoice_line_items WHERE invoice_id = ${id} ORDER BY sort_order ASC
  `

  // Build the invoice data shape that TemplatePreview expects
  const invoiceData = {
    invoice_number:    String(invoice.invoice_number),
    invoice_date:      String(invoice.invoice_date),
    service_date:      invoice.service_date ? String(invoice.service_date) : "",
    description:       String(invoice.description),
    hsn_code:          String(invoice.hsn_code || ""),
    amount_before_tax: Number(invoice.amount_before_tax),
    cgst_rate:         Number(invoice.cgst_rate),
    sgst_rate:         Number(invoice.sgst_rate),
    cgst_amount:       Number(invoice.cgst_amount),
    sgst_amount:       Number(invoice.sgst_amount),
    total_amount:      Number(invoice.total_amount),
    terms:             String(invoice.terms || ""),
    status:            String(invoice.status),
    client: {
      name:    String(invoice.client?.name || ""),
      address: String(invoice.client?.address || ""),
      gstin:   String(invoice.client?.gstin || ""),
      email:   String(invoice.client?.email || ""),
      phone:   String(invoice.client?.phone || ""),
    },
    line_items: lineItems.length > 0
      ? lineItems.map((li) => ({
          description: String(li.description),
          hsn_code:    String(li.hsn_code || ""),
          qty:         Number(li.qty),
          rate:        Number(li.rate),
          amount:      Number(li.amount),
        }))
      : [{
          description: String(invoice.description),
          hsn_code:    String(invoice.hsn_code || ""),
          qty:         1,
          rate:        Number(invoice.amount_before_tax),
          amount:      Number(invoice.amount_before_tax),
        }],
  }

  const profileData = profile
    ? {
        full_name:      profile.full_name      || "",
        email:          profile.email          || "",
        phone:          profile.phone          || "",
        address:        profile.address        || "",
        gstin:          profile.gstin          || "",
        pan_no:         profile.pan_no         || "",
        bank_name:      profile.bank_name      || "",
        account_name:   profile.account_name   || "",
        account_number: profile.account_number || "",
        ifsc_code:      profile.ifsc_code      || "",
      }
    : SAMPLE_PROFILE

  const amountInWords = numberToWords(invoiceData.total_amount)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-page { box-shadow: none !important; }
        }
      `}</style>

      {/* Print toolbar */}
      <div className="no-print bg-gray-100 px-6 py-3 flex items-center justify-between border-b">
        <p className="text-sm text-gray-600">Invoice preview — click Print / Save as PDF</p>
        <PrintButton />
      </div>

      {/* Rendered invoice using saved template */}
      <div className="invoice-page mx-auto my-8 shadow-xl">
        {config.templateId === "canvas" ? (
          <CanvasTemplatePreview config={config} invoice={invoiceData} profile={profileData} isPrint />
        ) : (
          <TemplatePreview config={config} invoice={invoiceData} profile={profileData} isPrint />
        )}
      </div>

      {/* Amount in words below the template */}
      <div className="no-print mx-auto mb-8 bg-gray-50 border border-gray-200 rounded p-3 text-sm" style={{ maxWidth: "210mm" }}>
        <span className="font-semibold text-gray-700">Total in Words: </span>
        <span className="text-gray-800 italic">{amountInWords}</span>
      </div>
    </>
  )
}
