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

export interface TemplateConfig {
  templateId: "classic" | "modern" | "professional"
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
]

export const FONT_OPTIONS = [
  { label: "Inter (Sans)",           value: "Inter, sans-serif" },
  { label: "Arial (Sans)",           value: "Arial, sans-serif" },
  { label: "Georgia (Serif)",        value: "Georgia, serif" },
  { label: "Trebuchet MS (Sans)",    value: "Trebuchet MS, sans-serif" },
  { label: "Courier New (Mono)",     value: "Courier New, monospace" },
  { label: "Times New Roman (Serif)",value: "Times New Roman, serif" },
]

export const SIZE_SCALE = { sm: "11px", md: "13px", lg: "15px" }
