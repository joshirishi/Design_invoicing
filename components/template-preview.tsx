// Renders an invoice using a TemplateConfig.
// Used in: live editor preview, PDF print page, and invoice detail view.
// Pure presentational — no data fetching, no API calls.

import type { TemplateConfig } from "@/lib/template-defaults"
import { SIZE_SCALE } from "@/lib/template-defaults"

// Minimal sample data shown in the editor preview
export const SAMPLE_INVOICE = {
  invoice_number: "INV-2024-001",
  invoice_date: "2024-06-15",
  service_date: "2024-06-01",
  description: "Web Design & Development Services",
  hsn_code: "998314",
  amount_before_tax: 50000,
  cgst_rate: 9,
  sgst_rate: 9,
  cgst_amount: 4500,
  sgst_amount: 4500,
  total_amount: 59000,
  terms: "Payment due within 7 days. Thank you for your business.",
  status: "unpaid",
  client: {
    name: "Acme Corp Pvt Ltd",
    address: "101 Business Park, Pune 411001",
    gstin: "27AABCU9603R1ZX",
    email: "accounts@acme.com",
    phone: "+91 98765 43210",
  },
  line_items: [
    { description: "UI Design — 5 screens", hsn_code: "998314", qty: 5, rate: 5000, amount: 25000 },
    { description: "Frontend Development", hsn_code: "998314", qty: 1, rate: 20000, amount: 20000 },
    { description: "Project Management", hsn_code: "998314", qty: 1, rate: 5000, amount: 5000 },
  ],
}

export const SAMPLE_PROFILE = {
  full_name: "Your Business Name",
  email: "you@example.com",
  phone: "+91 98765 00000",
  address: "42 MG Road, Bengaluru 560001",
  gstin: "29AABCU9603R1ZM",
  pan_no: "AABCU9603R",
  bank_name: "HDFC Bank",
  account_name: "Your Business Name",
  account_number: "50200012345678",
  ifsc_code: "HDFC0001234",
}

function fmtMoney(n: number | string) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
}

function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface PreviewProps {
  config: TemplateConfig
  invoice?: typeof SAMPLE_INVOICE
  profile?: typeof SAMPLE_PROFILE
  scale?: number   // CSS transform scale for editor thumbnail (default 1)
  isPrint?: boolean
}

export function TemplatePreview({ config, invoice, profile, scale = 1, isPrint = false }: PreviewProps) {
  const inv  = invoice || SAMPLE_INVOICE
  const prof = profile || SAMPLE_PROFILE
  const c    = config.colors
  const f    = config.fonts
  const flds = config.fields
  const fs   = SIZE_SCALE[f.size]

  const lineItems = config.lineItems && inv.line_items?.length
    ? inv.line_items
    : [{ description: inv.description, hsn_code: inv.hsn_code, qty: 1, rate: inv.amount_before_tax, amount: inv.amount_before_tax }]

  const wrapStyle: React.CSSProperties = {
    fontFamily: f.body,
    fontSize: fs,
    color: c.text,
    backgroundColor: c.background,
    width: "210mm",
    minHeight: "297mm",
    padding: "16mm 16mm 20mm",
    boxSizing: "border-box",
    position: "relative",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: scale !== 1 ? "top left" : undefined,
  }

  // ── Classic layout ───────────────────────────────────────────────────────
  if (config.templateId === "classic") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Header band */}
        <div style={{ backgroundColor: c.primary, color: c.headerText, padding: "10mm 12mm", margin: "-16mm -16mm 8mm", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "20px", fontWeight: 700, marginBottom: 4 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.85, fontSize: "11px" }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ opacity: 0.85, fontSize: "11px" }}>{prof.phone}</div>}
            <div style={{ opacity: 0.85, fontSize: "11px" }}>{prof.email}</div>
            {prof.gstin && <div style={{ opacity: 0.85, fontSize: "11px" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "26px", fontWeight: 700, letterSpacing: 2 }}>TAX INVOICE</div>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <div><strong>Invoice #:</strong> {inv.invoice_number}</div>
              <div><strong>Date:</strong> {fmtDate(inv.invoice_date)}</div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
          <div style={{ width: "48%" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.secondary, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
          </div>
          <div style={{ width: "48%", textAlign: "right" }}>
            {flds.serviceDate.show && inv.service_date && (
              <div style={{ fontSize: "11px" }}><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <LineItemsTable lineItems={lineItems} config={config} />

        {/* Totals */}
        <TotalsBlock inv={inv} config={config} />

        {/* Custom fields */}
        {flds.custom.filter(f => f.show).map(cf => (
          <div key={cf.id} style={{ marginTop: 4, fontSize: "11px" }}><strong>{cf.label}:</strong> {cf.value}</div>
        ))}

        {/* Terms */}
        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms & Conditions:</strong> {inv.terms}
          </div>
        )}

        {/* Bank details */}
        {flds.bankDetails.show && (
          <BankDetails prof={prof} config={config} />
        )}

        {/* Signature */}
        {flds.signature.show && (
          <div style={{ marginTop: "10mm", textAlign: "right" }}>
            <div style={{ borderTop: `1px solid ${c.text}`, display: "inline-block", paddingTop: 6, minWidth: 120, textAlign: "center", fontSize: "11px" }}>
              Authorised Signatory<br /><span style={{ fontWeight: 700 }}>{prof.full_name}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Modern layout ────────────────────────────────────────────────────────
  if (config.templateId === "modern") {
    return (
      <div style={wrapStyle}>
        {/* Top accent line */}
        <div style={{ height: 5, backgroundColor: c.primary, margin: "-16mm -16mm 10mm", marginTop: "-16mm" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8mm" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "22px", fontWeight: 800, color: c.primary }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{prof.phone}</div>}
            <div style={{ color: "#64748b", fontSize: "11px" }}>{prof.email}</div>
            {prof.gstin && <div style={{ color: "#64748b", fontSize: "11px" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "28px", fontWeight: 900, color: c.primary, letterSpacing: -1 }}>INVOICE</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>
              #{inv.invoice_number}<br />{fmtDate(inv.invoice_date)}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ backgroundColor: c.secondary, borderRadius: 8, padding: "6mm 8mm", marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Invoice For</div>
          <div style={{ fontWeight: 700, fontSize: "14px" }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#475569", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />

        {flds.custom.filter(f => f.show).map(cf => (
          <div key={cf.id} style={{ marginTop: 4, fontSize: "11px" }}><strong>{cf.label}:</strong> {cf.value}</div>
        ))}

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", fontSize: "10px", color: "#94a3b8" }}>{inv.terms}</div>
        )}

        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}

        {flds.signature.show && (
          <div style={{ marginTop: "10mm", textAlign: "right" }}>
            <div style={{ borderTop: `2px solid ${c.primary}`, display: "inline-block", paddingTop: 6, minWidth: 120, textAlign: "center", fontSize: "11px" }}>
              <span style={{ color: c.primary, fontWeight: 700 }}>{prof.full_name}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Professional layout ──────────────────────────────────────────────────
  return (
    <div style={wrapStyle}>
      {/* Full-width header block */}
      <div style={{ backgroundColor: c.primary, color: c.headerText, margin: "-16mm -16mm 10mm", padding: "12mm 16mm 10mm" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "24px", fontWeight: 800, letterSpacing: -0.5 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.8, fontSize: "11px", marginTop: 2 }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ opacity: 0.8, fontSize: "11px" }}>{prof.phone} | {prof.email}</div>}
            {prof.gstin && <div style={{ opacity: 0.8, fontSize: "11px" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "32px", fontWeight: 900, letterSpacing: 2 }}>TAX INVOICE</div>
          </div>
        </div>
        {/* Invoice meta strip */}
        <div style={{ marginTop: 10, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 6, padding: "6px 12px", display: "flex", gap: 24, fontSize: "11px" }}>
          <span><strong>Invoice #</strong> {inv.invoice_number}</span>
          <span><strong>Date</strong> {fmtDate(inv.invoice_date)}</span>
          {flds.serviceDate.show && inv.service_date && <span><strong>{flds.serviceDate.label || "Period"}</strong> {fmtDate(inv.service_date)}</span>}
        </div>
      </div>

      {/* Bill To */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
        <div style={{ width: "50%", borderLeft: `4px solid ${c.primary}`, paddingLeft: 10 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>
        {prof.pan_no && (
          <div style={{ textAlign: "right", fontSize: "11px" }}>
            <div><strong>PAN:</strong> {prof.pan_no}</div>
          </div>
        )}
      </div>

      <LineItemsTable lineItems={lineItems} config={config} />
      <TotalsBlock inv={inv} config={config} />

      {flds.custom.filter(f => f.show).map(cf => (
        <div key={cf.id} style={{ marginTop: 4, fontSize: "11px" }}><strong>{cf.label}:</strong> {cf.value}</div>
      ))}

      {flds.terms.show && inv.terms && (
        <div style={{ marginTop: "8mm", borderTop: `2px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
          <strong>Terms:</strong> {inv.terms}
        </div>
      )}

      {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}

      {flds.signature.show && (
        <div style={{ marginTop: "10mm", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 40, borderBottom: `1px solid ${c.text}`, marginBottom: 4, minWidth: 140 }} />
            <div style={{ fontSize: "11px" }}>Authorised Signatory</div>
            <div style={{ fontSize: "12px", fontWeight: 700 }}>{prof.full_name}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function LineItemsTable({ lineItems, config }: { lineItems: typeof SAMPLE_INVOICE.line_items; config: TemplateConfig }) {
  const c = config.colors
  const f = config.fonts
  const flds = config.fields
  const showHsn = flds.hsnCode.show

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm", fontSize: "11px" }}>
      <thead>
        <tr style={{ backgroundColor: c.primary, color: c.headerText }}>
          <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: f.heading }}>#</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: f.heading }}>Description</th>
          {showHsn && <th style={{ padding: "6px 8px", textAlign: "center", fontFamily: f.heading }}>{flds.hsnCode.label || "HSN/SAC"}</th>}
          {config.lineItems && <th style={{ padding: "6px 8px", textAlign: "right", fontFamily: f.heading }}>Qty</th>}
          {config.lineItems && <th style={{ padding: "6px 8px", textAlign: "right", fontFamily: f.heading }}>Rate (₹)</th>}
          <th style={{ padding: "6px 8px", textAlign: "right", fontFamily: f.heading }}>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {lineItems.map((item, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? c.background : c.secondary }}>
            <td style={{ padding: "6px 8px" }}>{i + 1}</td>
            <td style={{ padding: "6px 8px" }}>{item.description}</td>
            {showHsn && <td style={{ padding: "6px 8px", textAlign: "center" }}>{item.hsn_code}</td>}
            {config.lineItems && <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.qty}</td>}
            {config.lineItems && <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtMoney(item.rate)}</td>}
            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmtMoney(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TotalsBlock({ inv, config }: { inv: typeof SAMPLE_INVOICE; config: TemplateConfig }) {
  const c = config.colors
  const showGst = config.fields.cgstSgst.show

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6mm" }}>
      <table style={{ fontSize: "11px", minWidth: 220 }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 8px", color: "#64748b" }}>Subtotal</td>
            <td style={{ padding: "3px 8px", textAlign: "right" }}>₹{fmtMoney(inv.amount_before_tax)}</td>
          </tr>
          {showGst && (
            <>
              <tr>
                <td style={{ padding: "3px 8px", color: "#64748b" }}>CGST ({inv.cgst_rate}%)</td>
                <td style={{ padding: "3px 8px", textAlign: "right" }}>₹{fmtMoney(inv.cgst_amount)}</td>
              </tr>
              <tr>
                <td style={{ padding: "3px 8px", color: "#64748b" }}>SGST ({inv.sgst_rate}%)</td>
                <td style={{ padding: "3px 8px", textAlign: "right" }}>₹{fmtMoney(inv.sgst_amount)}</td>
              </tr>
            </>
          )}
          <tr style={{ backgroundColor: config.colors.primary, color: config.colors.headerText }}>
            <td style={{ padding: "6px 8px", fontWeight: 700 }}>Total</td>
            <td style={{ padding: "6px 8px", fontWeight: 700, textAlign: "right", fontSize: "13px" }}>₹{fmtMoney(inv.total_amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function BankDetails({ prof, config }: { prof: typeof SAMPLE_PROFILE; config: TemplateConfig }) {
  const c = config.colors
  return (
    <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8 }}>
      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bank Details</div>
      <div style={{ display: "flex", gap: 32, fontSize: "11px" }}>
        <div>
          <div><strong>Bank:</strong> {prof.bank_name}</div>
          <div><strong>A/C Name:</strong> {prof.account_name}</div>
        </div>
        <div>
          <div><strong>A/C No:</strong> {prof.account_number}</div>
          <div><strong>IFSC:</strong> {prof.ifsc_code}</div>
        </div>
        {prof.pan_no && (
          <div>
            <div><strong>PAN:</strong> {prof.pan_no}</div>
          </div>
        )}
      </div>
    </div>
  )
}
