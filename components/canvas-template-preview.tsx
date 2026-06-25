// Print-safe render for canvas-mode templates.
// Background PNG + absolutely positioned invoice fields.
// Used by the PDF/print page and the editor's thumbnail.

import type { TemplateConfig, CanvasFieldLayout } from "@/lib/template-defaults"
import { DEFAULT_CANVAS_FIELD_LAYOUT } from "@/lib/template-defaults"

// ── Sample data (same as template-preview) ──────────────────────────────────

export const SAMPLE_INVOICE = {
  invoice_number:    "INV-2024-001",
  invoice_date:      "2024-06-15",
  service_date:      "2024-06-01",
  description:       "Web Design & Development Services",
  hsn_code:          "998314",
  amount_before_tax: 50000,
  cgst_rate:         9,
  sgst_rate:         9,
  cgst_amount:       4500,
  sgst_amount:       4500,
  total_amount:      59000,
  terms:             "Payment due within 7 days. Thank you for your business.",
  status:            "unpaid",
  client: {
    name:    "Acme Corp Pvt Ltd",
    address: "101 Business Park, Pune 411001",
    gstin:   "27AABCU9603R1ZX",
    email:   "accounts@acme.com",
    phone:   "+91 98765 43210",
  },
  line_items: [
    { description: "UI Design — 5 screens", hsn_code: "998314", qty: 5, rate: 5000, amount: 25000 },
    { description: "Frontend Development",  hsn_code: "998314", qty: 1, rate: 20000, amount: 20000 },
    { description: "Project Management",    hsn_code: "998314", qty: 1, rate: 5000,  amount: 5000  },
  ],
}

export const SAMPLE_PROFILE = {
  full_name:      "Your Business Name",
  email:          "you@example.com",
  phone:          "+91 98765 00000",
  address:        "42 MG Road, Bengaluru 560001",
  gstin:          "29AABCU9603R1ZM",
  pan_no:         "AABCU9603R",
  bank_name:      "HDFC Bank",
  account_name:   "Your Business Name",
  account_number: "50200012345678",
  ifsc_code:      "HDFC0001234",
}

function fmt(n: number | string) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
}
function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Field content builders ───────────────────────────────────────────────────

function buildFieldContent(
  key: string,
  inv: typeof SAMPLE_INVOICE,
  prof: typeof SAMPLE_PROFILE,
  fl: CanvasFieldLayout,
): React.ReactNode {
  switch (key) {
    case "invoiceTitle":
      return <span style={{ fontFamily: fl.fontFamily, fontWeight: fl.fontWeight }}>TAX INVOICE</span>

    case "businessName":
      return prof.full_name

    case "businessInfo":
      return (
        <span style={{ whiteSpace: "pre-line" }}>
          {[prof.phone, prof.email, prof.gstin ? `GSTIN: ${prof.gstin}` : ""].filter(Boolean).join("\n")}
        </span>
      )

    case "invoiceMeta":
      return (
        <span style={{ whiteSpace: "pre-line" }}>
          {`Invoice #: ${inv.invoice_number}\nDate: ${fmtDate(inv.invoice_date)}`}
        </span>
      )

    case "billTo":
      return (
        <span style={{ whiteSpace: "pre-line" }}>
          {`Bill To:\n${inv.client.name}\n${inv.client.address}${inv.client.gstin ? `\nGSTIN: ${inv.client.gstin}` : ""}${inv.client.phone ? `\n${inv.client.phone}` : ""}`}
        </span>
      )

    case "serviceDate":
      return inv.service_date ? `Service Date: ${fmtDate(inv.service_date)}` : null

    case "hsnCode":
      return inv.hsn_code ? `HSN/SAC: ${inv.hsn_code}` : null

    case "lineItemsTable":
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: `${fl.fontSize}px` }}>
          <thead>
            <tr style={{ borderBottom: "1px solid currentColor", opacity: 0.7 }}>
              <th style={{ textAlign: "left", padding: "2px 4px", fontWeight: "bold" }}>#</th>
              <th style={{ textAlign: "left", padding: "2px 4px", fontWeight: "bold" }}>Description</th>
              <th style={{ textAlign: "right", padding: "2px 4px", fontWeight: "bold" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "2px 4px", fontWeight: "bold" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "2px 4px", fontWeight: "bold" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(inv.line_items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <td style={{ padding: "2px 4px" }}>{i + 1}</td>
                <td style={{ padding: "2px 4px" }}>{item.description}</td>
                <td style={{ padding: "2px 4px", textAlign: "right" }}>{item.qty}</td>
                <td style={{ padding: "2px 4px", textAlign: "right" }}>₹{fmt(item.rate)}</td>
                <td style={{ padding: "2px 4px", textAlign: "right" }}>₹{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )

    case "subtotal":
      return `Subtotal   ₹${fmt(inv.amount_before_tax)}`

    case "cgst":
      return `CGST (${inv.cgst_rate}%)   ₹${fmt(inv.cgst_amount)}`

    case "sgst":
      return `SGST (${inv.sgst_rate}%)   ₹${fmt(inv.sgst_amount)}`

    case "totalAmount":
      return `Total   ₹${fmt(inv.total_amount)}`

    case "terms":
      return inv.terms ? (
        <span style={{ whiteSpace: "pre-line" }}>{`Terms & Conditions:\n${inv.terms}`}</span>
      ) : null

    case "bankDetails":
      return (
        <span style={{ whiteSpace: "pre-line" }}>
          {`Bank: ${prof.bank_name}   A/C: ${prof.account_number}   IFSC: ${prof.ifsc_code}${prof.pan_no ? `\nPAN: ${prof.pan_no}` : ""}`}
        </span>
      )

    case "signature":
      return (
        <span style={{ whiteSpace: "pre-line", textAlign: "center" as const }}>
          {`\n\n————————————\nAuthorised Signatory\n${prof.full_name}`}
        </span>
      )

    case "logo":
      return <span style={{ opacity: 0.3 }}>[Logo]</span>

    default:
      return null
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  config: TemplateConfig
  invoice?: typeof SAMPLE_INVOICE
  profile?: typeof SAMPLE_PROFILE
  isPrint?: boolean
  // For editor thumbnail: override px dimensions
  width?: number
  height?: number
}

export function CanvasTemplatePreview({ config, invoice, profile, isPrint = false, width, height }: Props) {
  const inv  = invoice  ?? SAMPLE_INVOICE
  const prof = profile  ?? SAMPLE_PROFILE
  const layout: Record<string, CanvasFieldLayout> = {
    ...DEFAULT_CANVAS_FIELD_LAYOUT,
    ...(config.fieldLayout ?? {}),
  }

  const W = width  ?? 595  // default: A4 at 72dpi
  const H = height ?? 842

  const containerStyle: React.CSSProperties = {
    position:  "relative",
    width:     isPrint ? "210mm" : `${W}px`,
    height:    isPrint ? "297mm" : `${H}px`,
    overflow:  "hidden",
    backgroundColor: "#ffffff",
  }

  return (
    <div style={containerStyle} className={isPrint ? "print-canvas-page" : ""}>
      {/* Background image */}
      {config.canvasBackground && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.canvasBackground}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
        />
      )}

      {/* Invoice fields */}
      {Object.entries(layout).map(([key, fl]) => {
        if (!fl.show) return null
        const content = buildFieldContent(key, inv, prof, fl)
        if (content === null) return null
        return (
          <div
            key={key}
            style={{
              position:   "absolute",
              left:       `${fl.x}%`,
              top:        `${fl.y}%`,
              width:      `${fl.w}%`,
              fontSize:   `${fl.fontSize}px`,
              color:      fl.color,
              fontFamily: fl.fontFamily,
              fontWeight: fl.fontWeight,
              textAlign:  fl.textAlign,
              lineHeight: 1.4,
            }}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
