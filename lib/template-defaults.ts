// Template configuration types and starter presets.
// TemplateConfig is stored as JSONB in invoice_templates.config

export interface TemplateFieldConfig {
  show: boolean
  label?: string
}

export interface CustomField {
  id: string
  label: string
  value: string
  show: boolean
}

// Layout descriptor for a single draggable field in canvas templates
export interface CanvasFieldLayout {
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: "normal" | "bold"
  color: string
  textAlign: "left" | "center" | "right"
  show: boolean
  w: number
}

// Default positions — ALL values are percentages of the 595×842 canvas.
// x/y = top-left offset from canvas edges (0–100%). w = field width (0–100%).
export const DEFAULT_CANVAS_FIELD_LAYOUT: Record<string, CanvasFieldLayout> = {
  invoiceTitle:   { x: 57,  y: 4,   fontSize: 22, fontFamily: "Inter", fontWeight: "bold",   color: "#1e293b", textAlign: "left",   show: true,  w: 37 },
  businessName:   { x: 7,   y: 4,   fontSize: 16, fontFamily: "Inter", fontWeight: "bold",   color: "#1e293b", textAlign: "left",   show: true,  w: 45 },
  businessInfo:   { x: 7,   y: 9,   fontSize: 10, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 47 },
  invoiceMeta:    { x: 57,  y: 12,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 37 },
  billTo:         { x: 7,   y: 19,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#1e293b", textAlign: "left",   show: true,  w: 43 },
  serviceDate:    { x: 57,  y: 19,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 33 },
  hsnCode:        { x: 7,   y: 27,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 33 },
  lineItemsTable: { x: 7,   y: 31,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#1e293b", textAlign: "left",   show: true,  w: 86 },
  subtotal:       { x: 59,  y: 59,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 33 },
  cgst:           { x: 59,  y: 62,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 33 },
  sgst:           { x: 59,  y: 65,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 33 },
  totalAmount:    { x: 59,  y: 69,  fontSize: 13, fontFamily: "Inter", fontWeight: "bold",   color: "#1e293b", textAlign: "left",   show: true,  w: 33 },
  terms:          { x: 7,   y: 76,  fontSize: 10, fontFamily: "Inter", fontWeight: "normal", color: "#94a3b8", textAlign: "left",   show: true,  w: 86 },
  bankDetails:    { x: 7,   y: 82,  fontSize: 10, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "left",   show: true,  w: 50 },
  signature:      { x: 64,  y: 90,  fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#1e293b", textAlign: "center", show: true,  w: 23 },
  logo:           { x: 7,   y: 2,   fontSize: 11, fontFamily: "Inter", fontWeight: "normal", color: "#1e293b", textAlign: "left",   show: false, w: 13 },
}

export interface TemplateConfig {
  templateId:
    | "classic" | "modern" | "professional"
    | "t1" | "t2" | "t3" | "t4" | "t5" | "t6"
    | "t7" | "t8" | "t9" | "t10" | "t11" | "t12"
    | "canvas"
  colors: {
    primary: string      // header bg / accent
    secondary: string    // subheadings / borders / tints
    text: string         // body text
    background: string   // page background
    headerText: string   // text inside colored header
  }
  fonts: {
    heading: string
    body: string
    size: "sm" | "md" | "lg"
  }
  fields: {
    logo: TemplateFieldConfig
    senderPhone: TemplateFieldConfig
    senderAddress: TemplateFieldConfig
    clientPhone: TemplateFieldConfig
    clientGstin: TemplateFieldConfig
    hsnCode: TemplateFieldConfig
    serviceDate: TemplateFieldConfig
    cgstSgst: TemplateFieldConfig
    terms: TemplateFieldConfig
    bankDetails: TemplateFieldConfig
    signature: TemplateFieldConfig
    custom: CustomField[]
  }
  lineItems: boolean
  pageSize: "A4" | "Letter"
  // Canvas-mode only (optional)
  canvasBackground?: string
  fieldLayout?: Record<string, CanvasFieldLayout>
}

// ── Shared field defaults ─────────────────────────────────────────────────────

const FIELDS_FULL: TemplateConfig["fields"] = {
  logo:          { show: false },
  senderPhone:   { show: true,  label: "Phone" },
  senderAddress: { show: true,  label: "Address" },
  clientPhone:   { show: false },
  clientGstin:   { show: true,  label: "GSTIN" },
  hsnCode:       { show: true,  label: "HSN/SAC" },
  serviceDate:   { show: true,  label: "Service Date" },
  cgstSgst:      { show: true },
  terms:         { show: true },
  bankDetails:   { show: true },
  signature:     { show: true },
  custom:        [],
}

const FIELDS_MINIMAL: TemplateConfig["fields"] = {
  ...FIELDS_FULL,
  hsnCode:     { show: false },
  serviceDate: { show: false },
  terms:       { show: false },
  signature:   { show: false },
}

// ── Legacy presets (keep for backward compat with saved DB records) ───────────

export const CLASSIC_TEMPLATE: TemplateConfig = {
  templateId: "classic",
  colors: { primary: "#1e3a5f", secondary: "#94a3b8", text: "#1e293b", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Georgia, serif", body: "Arial, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: false,
  pageSize: "A4",
}

export const MODERN_TEMPLATE: TemplateConfig = {
  templateId: "modern",
  colors: { primary: "#6366f1", secondary: "#e0e7ff", text: "#111827", background: "#fafafa", headerText: "#ffffff" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_MINIMAL,
  lineItems: false,
  pageSize: "A4",
}

export const PROFESSIONAL_TEMPLATE: TemplateConfig = {
  templateId: "professional",
  colors: { primary: "#0f766e", secondary: "#ccfbf1", text: "#0f172a", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Trebuchet MS, sans-serif", body: "Trebuchet MS, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// ── Figma Kit — 12 new templates ──────────────────────────────────────────────

// T1 — Minimal Left Accent: thin colored left bar, clean white, sender top-left
const T1: TemplateConfig = {
  templateId: "t1",
  colors: { primary: "#1a2744", secondary: "#e2e8f0", text: "#1e293b", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Georgia, serif", body: "Arial, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T2 — Top Banner: full-width muted header band, two columns below
const T2: TemplateConfig = {
  templateId: "t2",
  colors: { primary: "#2d6a4f", secondary: "#d8f3dc", text: "#1b4332", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T3 — Dark Sidebar: dark colored left panel (~38%), white content right
const T3: TemplateConfig = {
  templateId: "t3",
  colors: { primary: "#0f172a", secondary: "#1e293b", text: "#334155", background: "#ffffff", headerText: "#f8fafc" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T4 — Corner Block: colored block in upper-right corner, sender top-left
const T4: TemplateConfig = {
  templateId: "t4",
  colors: { primary: "#c2410c", secondary: "#fff7ed", text: "#1c1917", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Trebuchet MS, sans-serif", body: "Arial, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T5 — Centered Logo: company name large centered at top, symmetric layout
const T5: TemplateConfig = {
  templateId: "t5",
  colors: { primary: "#7c3aed", secondary: "#ede9fe", text: "#1e1b4b", background: "#faf9ff", headerText: "#ffffff" },
  fonts: { heading: "Georgia, serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T6 — Footer Accent: clean white top, colored strip at bottom around totals
const T6: TemplateConfig = {
  templateId: "t6",
  colors: { primary: "#374151", secondary: "#f3f4f6", text: "#111827", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Trebuchet MS, sans-serif", body: "Arial, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T7 — Light Sidebar: light-tinted left column, white right with items
const T7: TemplateConfig = {
  templateId: "t7",
  colors: { primary: "#1d4ed8", secondary: "#dbeafe", text: "#1e3a5f", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T8 — Bold Title: very large "INVOICE" text at top, clean minimal
const T8: TemplateConfig = {
  templateId: "t8",
  colors: { primary: "#15803d", secondary: "#dcfce7", text: "#14532d", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Georgia, serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T9 — Grid Header: header split into 3 colored cells
const T9: TemplateConfig = {
  templateId: "t9",
  colors: { primary: "#be123c", secondary: "#ffe4e6", text: "#1c1917", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T10 — Right Block: sender info left, dark block flush-right with invoice details
const T10: TemplateConfig = {
  templateId: "t10",
  colors: { primary: "#1e293b", secondary: "#f1f5f9", text: "#334155", background: "#ffffff", headerText: "#f8fafc" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T11 — Underline Style: white page, colored underline separators, no filled header
const T11: TemplateConfig = {
  templateId: "t11",
  colors: { primary: "#0369a1", secondary: "#e0f2fe", text: "#0c4a6e", background: "#ffffff", headerText: "#ffffff" },
  fonts: { heading: "Georgia, serif", body: "Arial, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// T12 — Two-Tone: colored left half full height, white right side
const T12: TemplateConfig = {
  templateId: "t12",
  colors: { primary: "#312e81", secondary: "#e0e7ff", text: "#1e1b4b", background: "#ffffff", headerText: "#e0e7ff" },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: FIELDS_FULL,
  lineItems: true,
  pageSize: "A4",
}

// ── Starter templates shown on /dashboard/invoices/templates ─────────────────

export const STARTER_TEMPLATES: Array<{
  id: TemplateConfig["templateId"]
  name: string
  description: string
  config: TemplateConfig
}> = [
  { id: "t1",  name: "Minimal Accent",   description: "Clean white page with a bold left accent bar. Business name top-left, invoice number top-right.", config: T1 },
  { id: "t2",  name: "Top Banner",       description: "Full-width colored header band with sender and invoice info in a two-column layout below.", config: T2 },
  { id: "t3",  name: "Dark Sidebar",     description: "Dark full-height left sidebar with sender details in white, clean white content area on the right.", config: T3 },
  { id: "t4",  name: "Corner Block",     description: "Bold colored block anchored to the upper-right corner, sender info on the left.", config: T4 },
  { id: "t5",  name: "Centered",         description: "Company name large and centered at the top. Symmetric, balanced layout — great for creative studios.", config: T5 },
  { id: "t6",  name: "Footer Accent",    description: "Clean white invoice with a bold colored footer strip that holds the total amount.", config: T6 },
  { id: "t7",  name: "Light Sidebar",    description: "Soft tinted left column for sender details, white right column for line items and totals.", config: T7 },
  { id: "t8",  name: "Bold Title",       description: "Very large INVOICE heading in your accent color, followed by a minimal structured layout.", config: T8 },
  { id: "t9",  name: "Grid Header",      description: "Header split into three colored cells — sender info, invoice details, and logo area.", config: T9 },
  { id: "t10", name: "Right Block",      description: "Sender info on the left, a bold dark block flush to the right holds the invoice number and date.", config: T10 },
  { id: "t11", name: "Underline",        description: "Fully white page with colored underline separators between sections. Clean and timeless.", config: T11 },
  { id: "t12", name: "Two-Tone",         description: "Colored left panel extends the full page height. White right side holds all invoice content.", config: T12 },
  {
    id: "canvas",
    name: "Canvas Mode",
    description: "Upload a branded PNG background and freely drag invoice fields anywhere on it. Supports Google Fonts and Pantone colors.",
    config: {
      templateId: "canvas",
      colors: { primary: "#7c3aed", secondary: "#ede9fe", text: "#1e1b4b", background: "#ffffff", headerText: "#ffffff" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
      fields: FIELDS_FULL,
      lineItems: false,
      pageSize: "A4",
    },
  },
]

export const FONT_OPTIONS = [
  { label: "Inter (Sans)",            value: "Inter, sans-serif" },
  { label: "Arial (Sans)",            value: "Arial, sans-serif" },
  { label: "Georgia (Serif)",         value: "Georgia, serif" },
  { label: "Trebuchet MS (Sans)",     value: "Trebuchet MS, sans-serif" },
  { label: "Courier New (Mono)",      value: "Courier New, monospace" },
  { label: "Times New Roman (Serif)", value: "Times New Roman, serif" },
]

export const SIZE_SCALE = { sm: "11px", md: "13px", lg: "15px" }

// Named exports for legacy compat
export { T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12 }
