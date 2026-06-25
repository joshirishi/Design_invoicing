"use client"
import type { TemplateConfig } from "@/lib/template-defaults"
import { FONT_OPTIONS } from "@/lib/template-defaults"

const LAYOUT_OPTIONS: Array<{ id: string; label: string; hint: string }> = [
  { id: "t1",           label: "Minimal Accent",  hint: "Thin colored left bar, clean white" },
  { id: "t2",           label: "Top Banner",       hint: "Full-width colored header band" },
  { id: "t3",           label: "Dark Sidebar",     hint: "Dark full-height left panel" },
  { id: "t4",           label: "Corner Block",     hint: "Colored block anchored top-right" },
  { id: "t5",           label: "Centered",         hint: "Company name centered at top" },
  { id: "t6",           label: "Footer Accent",    hint: "Colored footer strip with totals" },
  { id: "t7",           label: "Light Sidebar",    hint: "Soft tinted left column" },
  { id: "t8",           label: "Bold Title",       hint: "Large INVOICE heading" },
  { id: "t9",           label: "Grid Header",      hint: "3-cell colored header grid" },
  { id: "t10",          label: "Right Block",      hint: "Dark block flush to the right" },
  { id: "t11",          label: "Underline",        hint: "Colored underline separators" },
  { id: "t12",          label: "Two-Tone",         hint: "Colored left panel, white right" },
  { id: "classic",      label: "Classic (legacy)", hint: "Original navy header" },
  { id: "modern",       label: "Modern (legacy)",  hint: "Original indigo minimal" },
  { id: "professional", label: "Pro (legacy)",     hint: "Original teal bold header" },
]

interface Props {
  config: TemplateConfig
  onChange: (patch: Partial<TemplateConfig>) => void
}

const COLOR_PRESETS = [
  { label: "Navy",    primary: "#1e3a5f", secondary: "#e2e8f0", headerText: "#ffffff" },
  { label: "Indigo",  primary: "#6366f1", secondary: "#e0e7ff", headerText: "#ffffff" },
  { label: "Teal",    primary: "#0f766e", secondary: "#ccfbf1", headerText: "#ffffff" },
  { label: "Crimson", primary: "#be123c", secondary: "#ffe4e6", headerText: "#ffffff" },
  { label: "Amber",   primary: "#b45309", secondary: "#fef3c7", headerText: "#ffffff" },
  { label: "Slate",   primary: "#334155", secondary: "#f1f5f9", headerText: "#ffffff" },
  { label: "Violet",  primary: "#7c3aed", secondary: "#ede9fe", headerText: "#ffffff" },
  { label: "Forest",  primary: "#15803d", secondary: "#dcfce7", headerText: "#ffffff" },
]

export function TemplateStylePanel({ config, onChange }: Props) {
  function setColors(patch: Partial<TemplateConfig["colors"]>) {
    onChange({ colors: { ...config.colors, ...patch } })
  }
  function setFonts(patch: Partial<TemplateConfig["fonts"]>) {
    onChange({ fonts: { ...config.fonts, ...patch } })
  }

  return (
    <div className="space-y-6 text-sm">
      {/* Layout selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Layout</label>
        <div className="grid grid-cols-2 gap-1.5">
          {LAYOUT_OPTIONS.map(({ id, label, hint }) => (
            <button
              key={id}
              onClick={() => onChange({ templateId: id as TemplateConfig["templateId"] })}
              title={hint}
              className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all text-left leading-tight
                ${config.templateId === id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color presets */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color Preset</label>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => setColors({ primary: p.primary, secondary: p.secondary, headerText: p.headerText })}
              className={`h-8 rounded-md border-2 transition-all flex items-center justify-center text-white text-xs font-bold
                ${config.colors.primary === p.primary ? "border-gray-900 scale-105" : "border-transparent"}`}
              style={{ backgroundColor: p.primary }}
            >
              {p.label.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      {/* Individual color pickers */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Custom Colors</label>
        <div className="space-y-3">
          {([
            { key: "primary",    label: "Accent / Header" },
            { key: "secondary",  label: "Stripe / Background Tint" },
            { key: "text",       label: "Body Text" },
            { key: "background", label: "Page Background" },
            { key: "headerText", label: "Header Text" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-gray-600 text-xs">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.colors[key]}
                  onChange={(e) => setColors({ [key]: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={config.colors[key]}
                  onChange={(e) => setColors({ [key]: e.target.value })}
                  className="w-20 text-xs border border-gray-200 rounded px-2 py-1 font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Typography</label>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Heading Font</span>
            <select
              value={config.fonts.heading}
              onChange={(e) => setFonts({ heading: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Body Font</span>
            <select
              value={config.fonts.body}
              onChange={(e) => setFonts({ body: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Text Size</span>
            <div className="flex gap-2">
              {(["sm", "md", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFonts({ size: s })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all
                    ${config.fonts.size === s
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  {s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Page & items options */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Layout Options</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Page size</span>
            <div className="flex gap-2">
              {(["A4", "Letter"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ pageSize: s })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${config.pageSize === s
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-gray-700">Multi-line items</span>
              <p className="text-xs text-gray-400">Enable separate rows for qty, rate, amount</p>
            </div>
            <button
              onClick={() => onChange({ lineItems: !config.lineItems })}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors
                ${config.lineItems ? "bg-indigo-500" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow
                ${config.lineItems ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
