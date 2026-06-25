// Renders an invoice using a TemplateConfig.
// Used in: live editor preview, PDF print page, and invoice detail view.
// Pure presentational — no data fetching, no API calls.

import type { TemplateConfig } from "@/lib/template-defaults"
import { SIZE_SCALE } from "@/lib/template-defaults"

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
    { description: "Frontend Development",  hsn_code: "998314", qty: 1, rate: 20000, amount: 20000 },
    { description: "Project Management",    hsn_code: "998314", qty: 1, rate: 5000, amount: 5000 },
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
  scale?: number
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

  const baseWrap: React.CSSProperties = {
    fontFamily: f.body,
    fontSize: fs,
    color: c.text,
    backgroundColor: c.background,
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    position: "relative",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: scale !== 1 ? "top left" : undefined,
  }

  const wrapStyle: React.CSSProperties = { ...baseWrap, padding: "16mm 16mm 20mm" }

  // ── T1 — Minimal Left Accent ──────────────────────────────────────────────
  if (config.templateId === "t1") {
    return (
      <div style={{ ...baseWrap, display: "flex", padding: 0 }} className={isPrint ? "print-page" : ""}>
        {/* Thin left accent bar */}
        <div style={{ width: 6, backgroundColor: c.primary, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "14mm 14mm 18mm" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" }}>
            <div>
              <div style={{ fontFamily: f.heading, fontSize: "20px", fontWeight: 700, color: c.primary, marginBottom: 4 }}>{prof.full_name}</div>
              {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
              {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
              <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
              {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: f.heading, fontSize: "28px", fontWeight: 900, color: c.primary, letterSpacing: 3 }}>TAX INVOICE</div>
              <div style={{ marginTop: 8, fontSize: "12px", color: c.text }}>
                <div><strong>#{inv.invoice_number}</strong></div>
                <div style={{ color: "#64748b" }}>{fmtDate(inv.invoice_date)}</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 2, backgroundColor: c.primary, marginBottom: "8mm" }} />

          {/* Bill To */}
          <div style={{ marginBottom: "8mm" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
            {flds.serviceDate.show && inv.service_date && (
              <div style={{ marginTop: 4, fontSize: "11px" }}><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</div>
            )}
          </div>

          <LineItemsTable lineItems={lineItems} config={config} />
          <TotalsBlock inv={inv} config={config} />
          <CustomFields config={config} />

          {flds.terms.show && inv.terms && (
            <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
              <strong>Terms:</strong> {inv.terms}
            </div>
          )}
          {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
          {flds.signature.show && <Signature prof={prof} config={config} />}
        </div>
      </div>
    )
  }

  // ── T2 — Top Banner ───────────────────────────────────────────────────────
  if (config.templateId === "t2") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Full-width header band */}
        <div style={{ backgroundColor: c.primary, color: c.headerText, padding: "10mm 12mm", margin: "-16mm -16mm 10mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "22px", fontWeight: 800 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.8, fontSize: "11px", marginTop: 2 }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ opacity: 0.8, fontSize: "11px" }}>{prof.phone}</div>}
            <div style={{ opacity: 0.8, fontSize: "11px" }}>{prof.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "30px", fontWeight: 900, letterSpacing: 2 }}>TAX INVOICE</div>
            {prof.gstin && <div style={{ opacity: 0.75, fontSize: "11px", marginTop: 4 }}>GSTIN: {prof.gstin}</div>}
          </div>
        </div>

        {/* Invoice meta strip */}
        <div style={{ display: "flex", gap: 20, marginBottom: "8mm", backgroundColor: c.secondary, padding: "6px 12px", borderRadius: 6, fontSize: "11px" }}>
          <span><strong>Invoice #:</strong> {inv.invoice_number}</span>
          <span><strong>Date:</strong> {fmtDate(inv.invoice_date)}</span>
          {flds.serviceDate.show && inv.service_date && <span><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</span>}
        </div>

        {/* Two-column bill info */}
        <div style={{ display: "flex", gap: "8mm", marginBottom: "8mm" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
          </div>
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `2px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T3 — Dark Sidebar ────────────────────────────────────────────────────
  if (config.templateId === "t3") {
    return (
      <div style={{ ...baseWrap, display: "flex", padding: 0 }} className={isPrint ? "print-page" : ""}>
        {/* Dark left sidebar */}
        <div style={{ width: "38%", backgroundColor: c.primary, color: c.headerText, padding: "14mm 10mm", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: f.heading, fontSize: "18px", fontWeight: 800, marginBottom: 4 }}>{prof.full_name}</div>
          {flds.senderAddress.show && <div style={{ opacity: 0.7, fontSize: "10px", marginBottom: 2 }}>{prof.address}</div>}
          {flds.senderPhone.show && <div style={{ opacity: 0.7, fontSize: "10px", marginBottom: 2 }}>{prof.phone}</div>}
          <div style={{ opacity: 0.7, fontSize: "10px", marginBottom: 2 }}>{prof.email}</div>
          {prof.gstin && <div style={{ opacity: 0.7, fontSize: "10px" }}>GSTIN: {prof.gstin}</div>}

          <div style={{ marginTop: "10mm", paddingTop: "8mm", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, marginBottom: 6 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: 2 }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.7, fontSize: "10px", marginBottom: 2 }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ opacity: 0.7, fontSize: "10px" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ opacity: 0.7, fontSize: "10px" }}>{inv.client.phone}</div>}
          </div>

          {flds.bankDetails.show && (
            <div style={{ marginTop: "auto", paddingTop: "8mm", borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: "10px" }}>
              <div style={{ fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Bank Details</div>
              <div style={{ opacity: 0.8 }}>{prof.bank_name}</div>
              <div style={{ opacity: 0.8 }}>A/C: {prof.account_number}</div>
              <div style={{ opacity: 0.8 }}>IFSC: {prof.ifsc_code}</div>
            </div>
          )}
        </div>

        {/* White right content */}
        <div style={{ flex: 1, padding: "14mm 12mm 18mm", backgroundColor: c.background }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" }}>
            <div style={{ fontFamily: f.heading, fontSize: "26px", fontWeight: 900, color: c.primary, letterSpacing: 2 }}>TAX INVOICE</div>
            <div style={{ textAlign: "right", fontSize: "11px" }}>
              <div style={{ fontWeight: 700 }}>{inv.invoice_number}</div>
              <div style={{ color: "#64748b" }}>{fmtDate(inv.invoice_date)}</div>
              {flds.serviceDate.show && inv.service_date && <div style={{ color: "#64748b" }}>{fmtDate(inv.service_date)}</div>}
            </div>
          </div>

          <LineItemsTable lineItems={lineItems} config={config} />
          <TotalsBlock inv={inv} config={config} />
          <CustomFields config={config} />

          {flds.terms.show && inv.terms && (
            <div style={{ marginTop: "6mm", fontSize: "10px", color: "#64748b", borderTop: `1px solid ${c.secondary}`, paddingTop: 6 }}>
              <strong>Terms:</strong> {inv.terms}
            </div>
          )}
          {flds.signature.show && <Signature prof={prof} config={config} />}
        </div>
      </div>
    )
  }

  // ── T4 — Corner Block ────────────────────────────────────────────────────
  if (config.templateId === "t4") {
    return (
      <div style={{ ...wrapStyle, overflow: "hidden" }} className={isPrint ? "print-page" : ""}>
        {/* Colored corner block anchored top-right */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "48mm", backgroundColor: c.primary, clipPath: "polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", padding: "0 14mm 0 20mm" }}>
          <div style={{ fontFamily: f.heading, fontSize: "26px", fontWeight: 900, color: c.headerText, letterSpacing: 2 }}>TAX INVOICE</div>
          <div style={{ color: c.headerText, fontSize: "11px", opacity: 0.85, marginTop: 4 }}>
            <span>#{inv.invoice_number}</span>
            <span style={{ marginLeft: 12 }}>{fmtDate(inv.invoice_date)}</span>
          </div>
        </div>

        {/* Sender info top-left */}
        <div style={{ width: "45%", paddingTop: "2mm", marginBottom: "14mm" }}>
          <div style={{ fontFamily: f.heading, fontSize: "18px", fontWeight: 700, color: c.primary, marginBottom: 3 }}>{prof.full_name}</div>
          {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
          {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
          <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
          {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
        </div>

        {/* Bill To — below the corner block */}
        <div style={{ marginBottom: "8mm", marginTop: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: "13px" }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
          {flds.serviceDate.show && inv.service_date && (
            <div style={{ fontSize: "11px", marginTop: 4 }}><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</div>
          )}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T5 — Centered ────────────────────────────────────────────────────────
  if (config.templateId === "t5") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Centered header */}
        <div style={{ textAlign: "center", marginBottom: "8mm" }}>
          <div style={{ fontFamily: f.heading, fontSize: "26px", fontWeight: 800, color: c.primary, marginBottom: 4 }}>{prof.full_name}</div>
          {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
          {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone} &nbsp;|&nbsp; {prof.email}</div>}
          {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
        </div>

        {/* Accent divider with invoice title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "8mm" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: c.secondary }} />
          <div style={{ fontFamily: f.heading, fontSize: "14px", fontWeight: 700, color: c.primary, letterSpacing: 3, textTransform: "uppercase" }}>Tax Invoice</div>
          <div style={{ flex: 1, height: 1, backgroundColor: c.secondary }} />
        </div>

        {/* Invoice meta centered */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: "8mm", fontSize: "11px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Invoice No</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{inv.invoice_number}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Date</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{fmtDate(inv.invoice_date)}</div>
          </div>
          {flds.serviceDate.show && inv.service_date && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{flds.serviceDate.label || "Service Date"}</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{fmtDate(inv.service_date)}</div>
            </div>
          )}
        </div>

        {/* Bill To */}
        <div style={{ backgroundColor: c.secondary, borderRadius: 8, padding: "6mm 8mm", marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: "13px" }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", fontSize: "10px", color: "#94a3b8", textAlign: "center" }}>{inv.terms}</div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T6 — Footer Accent ───────────────────────────────────────────────────
  if (config.templateId === "t6") {
    return (
      <div style={{ ...wrapStyle, display: "flex", flexDirection: "column", minHeight: "297mm" }} className={isPrint ? "print-page" : ""}>
        {/* Header: sender left, invoice ref right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "20px", fontWeight: 800, color: c.primary, marginBottom: 3 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
            <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
            {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "24px", fontWeight: 900, color: c.text, letterSpacing: 1 }}>TAX INVOICE</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: 4 }}>
              <div>#{inv.invoice_number}</div>
              <div>{fmtDate(inv.invoice_date)}</div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: c.secondary, marginBottom: "8mm" }} />

        {/* Bill To */}
        <div style={{ marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
          {flds.serviceDate.show && inv.service_date && (
            <div style={{ fontSize: "11px", marginTop: 4 }}><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</div>
          )}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "6mm", fontSize: "10px", color: "#64748b" }}>{inv.terms}</div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}

        {/* Spacer pushes footer to bottom */}
        <div style={{ flex: 1 }} />

        {/* Colored footer strip with totals */}
        <div style={{ margin: "0 -16mm -20mm", backgroundColor: c.primary, color: c.headerText, padding: "8mm 16mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {flds.signature.show && (
              <div style={{ fontSize: "11px" }}>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.4)", paddingTop: 6, minWidth: 120, textAlign: "center" }}>
                  <div style={{ opacity: 0.7 }}>Authorised Signatory</div>
                  <div style={{ fontWeight: 700 }}>{prof.full_name}</div>
                </div>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              {config.fields.cgstSgst.show && (
                <div style={{ fontSize: "11px", opacity: 0.8, marginBottom: 4 }}>
                  <div>CGST ({inv.cgst_rate}%): ₹{fmtMoney(inv.cgst_amount)}</div>
                  <div>SGST ({inv.sgst_rate}%): ₹{fmtMoney(inv.sgst_amount)}</div>
                </div>
              )}
              <div style={{ fontSize: "20px", fontWeight: 900 }}>₹{fmtMoney(inv.total_amount)}</div>
              <div style={{ fontSize: "10px", opacity: 0.7 }}>Total Amount</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── T7 — Light Sidebar ───────────────────────────────────────────────────
  if (config.templateId === "t7") {
    return (
      <div style={{ ...baseWrap, display: "flex", padding: 0 }} className={isPrint ? "print-page" : ""}>
        {/* Light tinted left sidebar */}
        <div style={{ width: "35%", backgroundColor: c.secondary, padding: "14mm 8mm", flexShrink: 0 }}>
          <div style={{ fontFamily: f.heading, fontSize: "15px", fontWeight: 800, color: c.primary, marginBottom: 6 }}>{prof.full_name}</div>
          {flds.senderAddress.show && <div style={{ fontSize: "10px", color: "#475569", marginBottom: 2 }}>{prof.address}</div>}
          {flds.senderPhone.show && <div style={{ fontSize: "10px", color: "#475569", marginBottom: 2 }}>{prof.phone}</div>}
          <div style={{ fontSize: "10px", color: "#475569", marginBottom: 2 }}>{prof.email}</div>
          {prof.gstin && <div style={{ fontSize: "10px", color: "#475569" }}>GSTIN: {prof.gstin}</div>}

          <div style={{ marginTop: "8mm", paddingTop: "6mm", borderTop: `1px solid ${c.primary}30` }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: "12px", color: c.text, marginBottom: 2 }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ fontSize: "10px", color: "#475569" }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "10px", color: "#475569" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "10px", color: "#475569" }}>{inv.client.phone}</div>}
          </div>

          <div style={{ marginTop: "8mm", paddingTop: "6mm", borderTop: `1px solid ${c.primary}30` }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: c.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Invoice</div>
            <div style={{ fontSize: "10px", color: "#475569" }}>#{inv.invoice_number}</div>
            <div style={{ fontSize: "10px", color: "#475569" }}>{fmtDate(inv.invoice_date)}</div>
            {flds.serviceDate.show && inv.service_date && <div style={{ fontSize: "10px", color: "#475569" }}>{fmtDate(inv.service_date)}</div>}
          </div>

          {flds.bankDetails.show && (
            <div style={{ marginTop: "8mm", paddingTop: "6mm", borderTop: `1px solid ${c.primary}30`, fontSize: "10px", color: "#475569" }}>
              <div style={{ fontWeight: 700, color: c.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Bank</div>
              <div>{prof.bank_name}</div>
              <div>A/C: {prof.account_number}</div>
              <div>IFSC: {prof.ifsc_code}</div>
            </div>
          )}
        </div>

        {/* White right column */}
        <div style={{ flex: 1, padding: "14mm 12mm 18mm", backgroundColor: c.background }}>
          <div style={{ fontFamily: f.heading, fontSize: "24px", fontWeight: 900, color: c.primary, letterSpacing: 2, marginBottom: "8mm" }}>TAX INVOICE</div>

          <LineItemsTable lineItems={lineItems} config={config} />
          <TotalsBlock inv={inv} config={config} />
          <CustomFields config={config} />

          {flds.terms.show && inv.terms && (
            <div style={{ marginTop: "6mm", fontSize: "10px", color: "#64748b", borderTop: `1px solid ${c.secondary}`, paddingTop: 6 }}>
              <strong>Terms:</strong> {inv.terms}
            </div>
          )}
          {flds.signature.show && <Signature prof={prof} config={config} />}
        </div>
      </div>
    )
  }

  // ── T8 — Bold Title ──────────────────────────────────────────────────────
  if (config.templateId === "t8") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Giant invoice heading */}
        <div style={{ marginBottom: "6mm" }}>
          <div style={{ fontFamily: f.heading, fontSize: "48px", fontWeight: 900, color: c.primary, lineHeight: 1, letterSpacing: -1 }}>TAX</div>
          <div style={{ fontFamily: f.heading, fontSize: "48px", fontWeight: 900, color: c.primary, lineHeight: 1, letterSpacing: -1 }}>INVOICE</div>
        </div>

        <div style={{ height: 4, backgroundColor: c.primary, marginBottom: "8mm" }} />

        {/* Two-column meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "14px", fontWeight: 700, marginBottom: 4 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
            <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
            {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Invoice No</div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>{inv.invoice_number}</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: 4 }}>Date</div>
            <div style={{ fontWeight: 700 }}>{fmtDate(inv.invoice_date)}</div>
            {flds.serviceDate.show && inv.service_date && <>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: 4 }}>{flds.serviceDate.label || "Service Date"}</div>
              <div style={{ fontWeight: 700 }}>{fmtDate(inv.service_date)}</div>
            </>}
          </div>
        </div>

        {/* Bill To */}
        <div style={{ backgroundColor: c.secondary, padding: "6mm 8mm", borderRadius: 6, marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T9 — Grid Header ─────────────────────────────────────────────────────
  if (config.templateId === "t9") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* 3-cell grid header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", margin: "-16mm -16mm 10mm" }}>
          {/* Cell 1 — sender info */}
          <div style={{ backgroundColor: c.primary, color: c.headerText, padding: "10mm 10mm" }}>
            <div style={{ fontFamily: f.heading, fontSize: "13px", fontWeight: 700, marginBottom: 4 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.75, fontSize: "10px" }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ opacity: 0.75, fontSize: "10px" }}>{prof.phone}</div>}
            <div style={{ opacity: 0.75, fontSize: "10px" }}>{prof.email}</div>
            {prof.gstin && <div style={{ opacity: 0.75, fontSize: "10px" }}>GSTIN: {prof.gstin}</div>}
          </div>
          {/* Cell 2 — invoice title */}
          <div style={{ backgroundColor: `${c.primary}cc`, color: c.headerText, padding: "10mm 10mm", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <div style={{ fontFamily: f.heading, fontSize: "22px", fontWeight: 900, letterSpacing: 2 }}>TAX INVOICE</div>
          </div>
          {/* Cell 3 — invoice details */}
          <div style={{ backgroundColor: c.secondary, color: c.text, padding: "10mm 10mm" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 6 }}>Invoice Details</div>
            <div style={{ fontSize: "11px" }}><strong>No:</strong> {inv.invoice_number}</div>
            <div style={{ fontSize: "11px" }}><strong>Date:</strong> {fmtDate(inv.invoice_date)}</div>
            {flds.serviceDate.show && inv.service_date && <div style={{ fontSize: "11px" }}><strong>{flds.serviceDate.label || "Period"}:</strong> {fmtDate(inv.service_date)}</div>}
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T10 — Right Block ────────────────────────────────────────────────────
  if (config.templateId === "t10") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Header: sender left, dark block right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", margin: "-16mm -16mm 10mm" }}>
          <div style={{ padding: "12mm 14mm", flex: 1 }}>
            <div style={{ fontFamily: f.heading, fontSize: "20px", fontWeight: 700, color: c.primary, marginBottom: 4 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
            <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
            {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ backgroundColor: c.primary, color: c.headerText, padding: "12mm 14mm", minWidth: "45%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: f.heading, fontSize: "24px", fontWeight: 900, letterSpacing: 2, marginBottom: 8 }}>TAX INVOICE</div>
            <div style={{ fontSize: "11px", opacity: 0.8 }}>No: {inv.invoice_number}</div>
            <div style={{ fontSize: "11px", opacity: 0.8 }}>Date: {fmtDate(inv.invoice_date)}</div>
            {flds.serviceDate.show && inv.service_date && <div style={{ fontSize: "11px", opacity: 0.8 }}>{flds.serviceDate.label || "Period"}: {fmtDate(inv.service_date)}</div>}
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: "8mm", borderLeft: `4px solid ${c.primary}`, paddingLeft: 10 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T11 — Underline ──────────────────────────────────────────────────────
  if (config.templateId === "t11") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
        {/* Header row — no filled background, just text */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "6mm", borderBottom: `3px solid ${c.primary}`, marginBottom: "8mm" }}>
          <div>
            <div style={{ fontFamily: f.heading, fontSize: "22px", fontWeight: 800, color: c.primary }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2 }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.phone}</div>}
            <div style={{ fontSize: "11px", color: "#64748b" }}>{prof.email}</div>
            {prof.gstin && <div style={{ fontSize: "11px", color: "#64748b" }}>GSTIN: {prof.gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: f.heading, fontSize: "26px", fontWeight: 900, color: c.text }}>TAX INVOICE</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: 4 }}>
              #{inv.invoice_number} &nbsp;·&nbsp; {fmtDate(inv.invoice_date)}
            </div>
          </div>
        </div>

        {/* Bill To with underline */}
        <div style={{ paddingBottom: "6mm", borderBottom: `1px solid ${c.secondary}`, marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
          {flds.serviceDate.show && inv.service_date && (
            <div style={{ fontSize: "11px", marginTop: 4 }}><strong>{flds.serviceDate.label || "Service Date"}:</strong> {fmtDate(inv.service_date)}</div>
          )}
        </div>

        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />

        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", paddingTop: 8, borderTop: `1px solid ${c.secondary}`, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── T12 — Two-Tone ───────────────────────────────────────────────────────
  if (config.templateId === "t12") {
    return (
      <div style={{ ...baseWrap, display: "flex", padding: 0 }} className={isPrint ? "print-page" : ""}>
        {/* Colored left panel — full height */}
        <div style={{ width: "38%", backgroundColor: c.primary, color: c.headerText, padding: "16mm 10mm", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {/* Invoice title */}
          <div style={{ fontFamily: f.heading, fontSize: "22px", fontWeight: 900, letterSpacing: 2, marginBottom: "8mm", paddingBottom: "6mm", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
            TAX<br />INVOICE
          </div>

          {/* Invoice meta */}
          <div style={{ fontSize: "11px", marginBottom: "8mm" }}>
            <div style={{ opacity: 0.65, fontSize: "9px", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Invoice No</div>
            <div style={{ fontWeight: 700 }}>{inv.invoice_number}</div>
            <div style={{ opacity: 0.65, fontSize: "9px", textTransform: "uppercase", letterSpacing: 1, marginTop: 6, marginBottom: 2 }}>Date</div>
            <div style={{ fontWeight: 700 }}>{fmtDate(inv.invoice_date)}</div>
            {flds.serviceDate.show && inv.service_date && <>
              <div style={{ opacity: 0.65, fontSize: "9px", textTransform: "uppercase", letterSpacing: 1, marginTop: 6, marginBottom: 2 }}>{flds.serviceDate.label || "Service Date"}</div>
              <div style={{ fontWeight: 700 }}>{fmtDate(inv.service_date)}</div>
            </>}
          </div>

          {/* Bill To */}
          <div style={{ paddingTop: "6mm", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "11px", marginBottom: "8mm" }}>
            <div style={{ opacity: 0.65, fontSize: "9px", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{inv.client.name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.75, fontSize: "10px" }}>{inv.client.address}</div>}
            {flds.clientGstin.show && inv.client.gstin && <div style={{ opacity: 0.75, fontSize: "10px" }}>GSTIN: {inv.client.gstin}</div>}
            {flds.clientPhone.show && inv.client.phone && <div style={{ opacity: 0.75, fontSize: "10px" }}>{inv.client.phone}</div>}
          </div>

          {/* Sender at bottom of left panel */}
          <div style={{ marginTop: "auto", paddingTop: "6mm", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "10px" }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{prof.full_name}</div>
            {flds.senderAddress.show && <div style={{ opacity: 0.7 }}>{prof.address}</div>}
            {flds.senderPhone.show && <div style={{ opacity: 0.7 }}>{prof.phone}</div>}
            <div style={{ opacity: 0.7 }}>{prof.email}</div>
            {prof.gstin && <div style={{ opacity: 0.7 }}>GSTIN: {prof.gstin}</div>}
          </div>
        </div>

        {/* White right panel */}
        <div style={{ flex: 1, padding: "16mm 12mm 20mm", backgroundColor: c.background }}>
          <LineItemsTable lineItems={lineItems} config={config} />
          <TotalsBlock inv={inv} config={config} />
          <CustomFields config={config} />

          {flds.terms.show && inv.terms && (
            <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
              <strong>Terms:</strong> {inv.terms}
            </div>
          )}
          {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
          {flds.signature.show && <Signature prof={prof} config={config} />}
        </div>
      </div>
    )
  }

  // ── Classic layout (legacy) ───────────────────────────────────────────────
  if (config.templateId === "classic") {
    return (
      <div style={wrapStyle} className={isPrint ? "print-page" : ""}>
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
        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />
        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", borderTop: `1px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
            <strong>Terms & Conditions:</strong> {inv.terms}
          </div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── Modern layout (legacy) ────────────────────────────────────────────────
  if (config.templateId === "modern") {
    return (
      <div style={wrapStyle}>
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
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>#{inv.invoice_number}<br />{fmtDate(inv.invoice_date)}</div>
          </div>
        </div>
        <div style={{ backgroundColor: c.secondary, borderRadius: 8, padding: "6mm 8mm", marginBottom: "8mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Invoice For</div>
          <div style={{ fontWeight: 700, fontSize: "14px" }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#475569", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>
        <LineItemsTable lineItems={lineItems} config={config} />
        <TotalsBlock inv={inv} config={config} />
        <CustomFields config={config} />
        {flds.terms.show && inv.terms && (
          <div style={{ marginTop: "8mm", fontSize: "10px", color: "#94a3b8" }}>{inv.terms}</div>
        )}
        {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
        {flds.signature.show && <Signature prof={prof} config={config} />}
      </div>
    )
  }

  // ── Professional layout (legacy) + default fallback ───────────────────────
  return (
    <div style={wrapStyle}>
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
        <div style={{ marginTop: 10, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 6, padding: "6px 12px", display: "flex", gap: 24, fontSize: "11px" }}>
          <span><strong>Invoice #</strong> {inv.invoice_number}</span>
          <span><strong>Date</strong> {fmtDate(inv.invoice_date)}</span>
          {flds.serviceDate.show && inv.service_date && <span><strong>{flds.serviceDate.label || "Period"}</strong> {fmtDate(inv.service_date)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
        <div style={{ width: "50%", borderLeft: `4px solid ${c.primary}`, paddingLeft: 10 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.primary, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
          {flds.senderAddress.show && <div style={{ color: "#64748b", fontSize: "11px" }}>{inv.client.address}</div>}
          {flds.clientGstin.show && inv.client.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {inv.client.gstin}</div>}
          {flds.clientPhone.show && inv.client.phone && <div style={{ fontSize: "11px" }}>{inv.client.phone}</div>}
        </div>
        {prof.pan_no && (
          <div style={{ textAlign: "right", fontSize: "11px" }}><div><strong>PAN:</strong> {prof.pan_no}</div></div>
        )}
      </div>
      <LineItemsTable lineItems={lineItems} config={config} />
      <TotalsBlock inv={inv} config={config} />
      <CustomFields config={config} />
      {flds.terms.show && inv.terms && (
        <div style={{ marginTop: "8mm", borderTop: `2px solid ${c.secondary}`, paddingTop: 8, fontSize: "10px", color: "#64748b" }}>
          <strong>Terms:</strong> {inv.terms}
        </div>
      )}
      {flds.bankDetails.show && <BankDetails prof={prof} config={config} />}
      {flds.signature.show && <Signature prof={prof} config={config} />}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

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
          <tr style={{ backgroundColor: c.primary, color: c.headerText }}>
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
          <div><div><strong>PAN:</strong> {prof.pan_no}</div></div>
        )}
      </div>
    </div>
  )
}

function Signature({ prof, config }: { prof: typeof SAMPLE_PROFILE; config: TemplateConfig }) {
  const c = config.colors
  return (
    <div style={{ marginTop: "10mm", textAlign: "right" }}>
      <div style={{ borderTop: `1px solid ${c.text}`, display: "inline-block", paddingTop: 6, minWidth: 120, textAlign: "center", fontSize: "11px" }}>
        Authorised Signatory<br /><span style={{ fontWeight: 700 }}>{prof.full_name}</span>
      </div>
    </div>
  )
}

function CustomFields({ config }: { config: TemplateConfig }) {
  const visible = config.fields.custom.filter(f => f.show)
  if (!visible.length) return null
  return (
    <div>
      {visible.map(cf => (
        <div key={cf.id} style={{ marginTop: 4, fontSize: "11px" }}><strong>{cf.label}:</strong> {cf.value}</div>
      ))}
    </div>
  )
}
