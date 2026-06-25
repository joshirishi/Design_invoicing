// Template configuration types and 3 starter presets.
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

// Per-field position + style for canvas mode
export interface CanvasFieldLayout {
  x: number           // % from left (0-100)
  y: number           // % from top  (0-100)
  w: number           // % width (0-100)
  fontSize: number    // px
  color: string       // hex
  fontFamily: string
  fontWeight: "normal" | "bold"
  textAlign: "left" | "center" | "right"
  show: boolean
}

export interface TemplateConfig {
  templateId: "classic" | "modern" | "professional" | "canvas"
  colors: {
    primary: string      // header bg / accent
    secondary: string    // subheadings / borders
    text: string         // body text
    background: string   // page background
    headerText: string   // text inside colored header
  }
  fonts: {
    heading: string      // font-family for headings
    body: string         // font-family for body
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
  lineItems: boolean   // true = multi-row table, false = single description
  pageSize: "A4" | "Letter"
  // Canvas-mode only fields
  canvasBackground?: string                          // Supabase Storage public URL
  fieldLayout?: Record<string, CanvasFieldLayout>   // keyed by fieldKey
}

// ── Starter presets ──────────────────────────────────────────────────────────

export const CLASSIC_TEMPLATE: TemplateConfig = {
  templateId: "classic",
  colors: {
    primary:    "#1e3a5f",
    secondary:  "#94a3b8",
    text:       "#1e293b",
    background: "#ffffff",
    headerText: "#ffffff",
  },
  fonts: { heading: "Georgia, serif", body: "Arial, sans-serif", size: "md" },
  fields: {
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
  },
  lineItems: false,
  pageSize: "A4",
}

export const MODERN_TEMPLATE: TemplateConfig = {
  templateId: "modern",
  colors: {
    primary:    "#6366f1",
    secondary:  "#e0e7ff",
    text:       "#111827",
    background: "#fafafa",
    headerText: "#ffffff",
  },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: {
    logo:          { show: false },
    senderPhone:   { show: true,  label: "Phone" },
    senderAddress: { show: true,  label: "Address" },
    clientPhone:   { show: true },
    clientGstin:   { show: true,  label: "GSTIN" },
    hsnCode:       { show: false, label: "HSN/SAC" },
    serviceDate:   { show: false, label: "Service Date" },
    cgstSgst:      { show: true },
    terms:         { show: false },
    bankDetails:   { show: true },
    signature:     { show: false },
    custom:        [],
  },
  lineItems: false,
  pageSize: "A4",
}

export const PROFESSIONAL_TEMPLATE: TemplateConfig = {
  templateId: "professional",
  colors: {
    primary:    "#0f766e",
    secondary:  "#ccfbf1",
    text:       "#0f172a",
    background: "#ffffff",
    headerText: "#ffffff",
  },
  fonts: { heading: "Trebuchet MS, sans-serif", body: "Trebuchet MS, sans-serif", size: "md" },
  fields: {
    logo:          { show: false },
    senderPhone:   { show: true,  label: "Phone" },
    senderAddress: { show: true,  label: "Address" },
    clientPhone:   { show: true },
    clientGstin:   { show: true,  label: "GSTIN" },
    hsnCode:       { show: true,  label: "HSN/SAC" },
    serviceDate:   { show: true,  label: "Period" },
    cgstSgst:      { show: true },
    terms:         { show: true },
    bankDetails:   { show: true },
    signature:     { show: true },
    custom:        [],
  },
  lineItems: true,
  pageSize: "A4",
}

export const FONT_OPTIONS = [
  { label: "Inter (Sans)",           value: "Inter, sans-serif" },
  { label: "Arial (Sans)",           value: "Arial, sans-serif" },
  { label: "Georgia (Serif)",        value: "Georgia, serif" },
  { label: "Trebuchet MS (Sans)",    value: "Trebuchet MS, sans-serif" },
  { label: "Courier New (Mono)",     value: "Courier New, monospace" },
  { label: "Times New Roman (Serif)",value: "Times New Roman, serif" },
]

export const SIZE_SCALE = { sm: "11px", md: "13px", lg: "15px" }

// Default field layout for canvas mode — reasonable A4 positions
export const DEFAULT_CANVAS_FIELD_LAYOUT: Record<string, CanvasFieldLayout> = {
  businessName:  { x: 5,  y: 4,  w: 50, fontSize: 20, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "bold",   textAlign: "left",  show: true  },
  businessInfo:  { x: 5,  y: 11, w: 50, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: true  },
  invoiceTitle:  { x: 65, y: 4,  w: 30, fontSize: 22, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "bold",   textAlign: "right", show: true  },
  invoiceMeta:   { x: 55, y: 12, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  billTo:        { x: 5,  y: 25, w: 45, fontSize: 12, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: true  },
  serviceDate:   { x: 55, y: 25, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  hsnCode:       { x: 55, y: 29, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  lineItemsTable:{ x: 5,  y: 38, w: 90, fontSize: 11, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: true  },
  subtotal:      { x: 55, y: 66, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  cgst:          { x: 55, y: 69, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  sgst:          { x: 55, y: 72, w: 40, fontSize: 11, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "right", show: true  },
  totalAmount:   { x: 55, y: 76, w: 40, fontSize: 14, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "bold",   textAlign: "right", show: true  },
  terms:         { x: 5,  y: 83, w: 60, fontSize: 10, color: "#64748b", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: true  },
  bankDetails:   { x: 5,  y: 88, w: 55, fontSize: 10, color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: true  },
  signature:     { x: 65, y: 88, w: 30, fontSize: 11, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "center",show: true  },
  logo:          { x: 5,  y: 2,  w: 20, fontSize: 12, color: "#1e293b", fontFamily: "Inter, sans-serif", fontWeight: "normal", textAlign: "left",  show: false },
}

export const CANVAS_TEMPLATE: TemplateConfig = {
  templateId: "canvas",
  colors: {
    primary:    "#1e293b",
    secondary:  "#e2e8f0",
    text:       "#1e293b",
    background: "#ffffff",
    headerText: "#ffffff",
  },
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", size: "md" },
  fields: {
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
  },
  lineItems: false,
  pageSize: "A4",
  fieldLayout: DEFAULT_CANVAS_FIELD_LAYOUT,
}

export const STARTER_TEMPLATES: Array<{
  id: TemplateConfig["templateId"]
  name: string
  description: string
  config: TemplateConfig
}> = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional two-column GST invoice with navy header. Best for consulting and services.",
    config: CLASSIC_TEMPLATE,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean minimal layout with indigo accents and generous whitespace. Great for agencies.",
    config: MODERN_TEMPLATE,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Bold full-width teal header with multi-line item support. Ideal for product businesses.",
    config: PROFESSIONAL_TEMPLATE,
  },
  {
    id: "canvas",
    name: "Canvas",
    description: "Upload your own branded background image and freely position all invoice fields on it.",
    config: CANVAS_TEMPLATE,
  },
]
