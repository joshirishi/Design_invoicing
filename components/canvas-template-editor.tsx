"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import {
  ArrowLeft, Save, Check, Loader2, Upload, ImageIcon, Eye, EyeOff,
  Type, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Minus, Plus,
  Layers, Settings2, X
} from "lucide-react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/fetch"
import { GoogleFontsPicker } from "@/components/google-fonts-picker"
import { PantoneColorPicker } from "@/components/pantone-color-picker"
import { loadGoogleFont } from "@/lib/google-fonts-data"
import type { TemplateConfig, CanvasFieldLayout } from "@/lib/template-defaults"
import { DEFAULT_CANVAS_FIELD_LAYOUT } from "@/lib/template-defaults"
import { SAMPLE_INVOICE, SAMPLE_PROFILE } from "@/components/canvas-template-preview"

// ── Field metadata ──────────────────────────────────────────────────────────

const CANVAS_FIELDS: { key: string; label: string; previewFn: (inv: typeof SAMPLE_INVOICE, prof: typeof SAMPLE_PROFILE) => string }[] = [
  { key: "invoiceTitle",   label: "Invoice Title",         previewFn: () => "TAX INVOICE"                               },
  { key: "businessName",   label: "Business Name",         previewFn: (_, p) => p.full_name                            },
  { key: "businessInfo",   label: "Business Info",         previewFn: (_, p) => `${p.phone} · ${p.email} · GSTIN: ${p.gstin}` },
  { key: "invoiceMeta",    label: "Invoice # & Date",      previewFn: (i) => `${i.invoice_number}   Jun 2024`          },
  { key: "billTo",         label: "Bill To Block",         previewFn: (i) => `${i.client.name}\n${i.client.address}`   },
  { key: "serviceDate",    label: "Service Date",          previewFn: (i) => `Service Date: Jun 2024`                  },
  { key: "hsnCode",        label: "HSN / SAC Code",        previewFn: (i) => `HSN/SAC: ${i.hsn_code}`                  },
  { key: "lineItemsTable", label: "Line Items Table",      previewFn: (i) => `${i.description}\n── ── ── ──`            },
  { key: "subtotal",       label: "Subtotal",              previewFn: (i) => `Subtotal  ₹${i.amount_before_tax.toLocaleString("en-IN")}` },
  { key: "cgst",           label: "CGST",                  previewFn: (i) => `CGST (${i.cgst_rate}%)  ₹${i.cgst_amount.toLocaleString("en-IN")}` },
  { key: "sgst",           label: "SGST",                  previewFn: (i) => `SGST (${i.sgst_rate}%)  ₹${i.sgst_amount.toLocaleString("en-IN")}` },
  { key: "totalAmount",    label: "Total Amount",          previewFn: (i) => `Total  ₹${i.total_amount.toLocaleString("en-IN")}` },
  { key: "terms",          label: "Terms & Conditions",    previewFn: (i) => i.terms                                   },
  { key: "bankDetails",    label: "Bank Details",          previewFn: (_, p) => `${p.bank_name} · A/C ${p.account_number} · IFSC ${p.ifsc_code}` },
  { key: "signature",      label: "Signature",             previewFn: (_, p) => `Authorised Signatory\n${p.full_name}` },
  { key: "logo",           label: "Logo Placeholder",      previewFn: () => "[Logo]"                                   },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialConfig: TemplateConfig
  savedTemplateId?: number
  templateName?: string
}

// ── Component ───────────────────────────────────────────────────────────────

export function CanvasTemplateEditor({ initialConfig, savedTemplateId, templateName = "Canvas Template" }: Props) {
  const router = useRouter()

  // Merge stored fieldLayout with defaults so all keys always exist
  const mergedLayout: Record<string, CanvasFieldLayout> = {
    ...DEFAULT_CANVAS_FIELD_LAYOUT,
    ...(initialConfig.fieldLayout ?? {}),
  }

  const [name, setName]                   = useState(templateName)
  const [background, setBackground]       = useState(initialConfig.canvasBackground ?? "")
  const [fieldLayout, setFieldLayout]     = useState<Record<string, CanvasFieldLayout>>(mergedLayout)
  const [selectedKey, setSelectedKey]     = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState("")
  const [uploading, setUploading]         = useState(false)
  const [sidebarTab, setSidebarTab]       = useState<"fields" | "style">("fields")
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [mobileView, setMobileView]       = useState<"controls" | "canvas">("controls")
  const [isDragging, setIsDragging]       = useState(false)

  // Dragging state (uses refs to avoid re-renders during drag)
  const dragRef = useRef<{
    key: string
    startPtrX: number; startPtrY: number
    startFieldX: number; startFieldY: number
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load Google Font whenever selected field's font changes
  useEffect(() => {
    if (selectedKey) loadGoogleFont(fieldLayout[selectedKey]?.fontFamily ?? "Inter")
  }, [selectedKey, fieldLayout])

  // ── Field layout helpers ─────────────────────────────────────────────────

  const patchField = useCallback((key: string, patch: Partial<CanvasFieldLayout>) => {
    setFieldLayout(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }, [])

  const selectedField = selectedKey ? fieldLayout[selectedKey] : null

  // ── Drag handlers ────────────────────────────────────────────────────────

  function onChipPointerDown(e: React.PointerEvent, key: string) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedKey(key)
    setIsDragging(true)
    dragRef.current = {
      key,
      startPtrX: e.clientX,
      startPtrY: e.clientY,
      startFieldX: fieldLayout[key].x,
      startFieldY: fieldLayout[key].y,
    }
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragRef.current.startPtrX) / rect.width)  * 100
    const dy = ((e.clientY - dragRef.current.startPtrY) / rect.height) * 100
    const newX = Math.max(0, Math.min(95, dragRef.current.startFieldX + dx))
    const newY = Math.max(0, Math.min(97, dragRef.current.startFieldY + dy))
    patchField(dragRef.current.key, { x: newX, y: newY })
  }

  function onCanvasPointerUp() {
    dragRef.current = null
    setIsDragging(false)
  }

  // ── Background upload ────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/template-backgrounds", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      setBackground(data.url)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function save(asDefault: boolean) {
    setSaving(true)
    setError("")
    const config: TemplateConfig = {
      ...initialConfig,
      templateId:        "canvas",
      canvasBackground:  background || undefined,
      fieldLayout,
    }
    try {
      if (savedTemplateId) {
        await fetchFromAPI("/api/invoice-templates", {
          method: "PUT",
          body: JSON.stringify({ id: savedTemplateId, name, config, is_default: asDefault }),
        })
      } else {
        await fetchFromAPI("/api/invoice-templates", {
          method: "POST",
          body: JSON.stringify({ name, config, is_default: asDefault }),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (asDefault) router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b shrink-0 gap-3 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/invoices/templates")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1 min-w-0 max-w-48"
          />
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {error && <span className="text-xs text-red-500 truncate max-w-48">{error}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileView(mobileView === "controls" ? "canvas" : "controls")}
            className="lg:hidden flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {mobileView === "controls" ? "Canvas" : "Controls"}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 font-medium transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Set as Default
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <aside className={`w-72 shrink-0 bg-white border-r flex flex-col overflow-hidden ${mobileView === "canvas" ? "hidden lg:flex" : "flex"}`}>
          {/* Sidebar tabs */}
          <div className="flex border-b shrink-0">
            {([
              { id: "fields", label: "Fields",  Icon: Layers },
              { id: "style",  label: "Style",   Icon: Settings2 },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setSidebarTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors
                  ${sidebarTab === id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── Fields tab ── */}
            {sidebarTab === "fields" && (
              <div className="p-4 space-y-4">
                {/* Background upload */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Background Image</label>
                  {background ? (
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={background} alt="Background" className="w-full h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white text-gray-800 text-xs rounded-lg px-2.5 py-1 font-medium hover:bg-gray-100 transition"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => setBackground("")}
                          className="bg-white text-red-600 text-xs rounded-lg p-1 hover:bg-red-50 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition text-gray-500 hover:text-indigo-600 disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      <span className="text-xs font-medium">{uploading ? "Uploading…" : "Upload PNG / JPG"}</span>
                      <span className="text-xs text-gray-400">Max 5 MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Field visibility toggles */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invoice Fields</label>
                  <p className="text-xs text-gray-400 mb-3">Click a field to select it, then drag it on the canvas</p>
                  <div className="space-y-1">
                    {CANVAS_FIELDS.map(({ key, label }) => {
                      const fl = fieldLayout[key]
                      const isSelected = selectedKey === key
                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedKey(isSelected ? null : key)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs
                            ${isSelected ? "bg-indigo-50 border border-indigo-200 text-indigo-700" : "hover:bg-gray-50 text-gray-700"}`}
                        >
                          <span className="font-medium truncate">{label}</span>
                          <button
                            onClick={e => { e.stopPropagation(); patchField(key, { show: !fl.show }) }}
                            className={`shrink-0 p-1 rounded transition ${fl.show ? "text-indigo-500" : "text-gray-300"}`}
                          >
                            {fl.show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Style tab ── */}
            {sidebarTab === "style" && (
              <div className="p-4 space-y-5">
                {!selectedField ? (
                  <div className="text-center py-8 text-gray-400">
                    <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Select a field on the canvas or in the Fields tab to style it</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-gray-700 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                      Styling: <span className="text-indigo-600">{CANVAS_FIELDS.find(f => f.key === selectedKey)?.label}</span>
                    </div>

                    {/* Font family */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Font</label>
                      <button
                        onClick={() => { setShowFontPicker(true); setShowColorPicker(false) }}
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-xs hover:border-indigo-300 transition"
                        style={{ fontFamily: selectedField.fontFamily }}
                      >
                        <span>{selectedField.fontFamily.split(",")[0].replace(/'/g, "")}</span>
                        <Type className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>

                    {/* Font size */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Size: {selectedField.fontSize}px</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => patchField(selectedKey!, { fontSize: Math.max(8, selectedField.fontSize - 1) })}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <input
                          type="range"
                          min={7} max={36} step={1}
                          value={selectedField.fontSize}
                          onChange={e => patchField(selectedKey!, { fontSize: Number(e.target.value) })}
                          className="flex-1 accent-indigo-500"
                        />
                        <button
                          onClick={() => patchField(selectedKey!, { fontSize: Math.min(36, selectedField.fontSize + 1) })}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Font weight */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Weight</label>
                      <div className="flex gap-2">
                        {(["normal", "bold"] as const).map(w => (
                          <button
                            key={w}
                            onClick={() => patchField(selectedKey!, { fontWeight: w })}
                            className={`flex-1 py-2 rounded-lg border text-xs transition ${selectedField.fontWeight === w ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold" : "border-gray-200 text-gray-600"}`}
                            style={{ fontWeight: w }}
                          >
                            {w === "normal" ? "Regular" : "Bold"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text align */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map(align => {
                          const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight
                          return (
                            <button
                              key={align}
                              onClick={() => patchField(selectedKey!, { textAlign: align })}
                              className={`flex-1 py-2 flex justify-center rounded-lg border transition ${selectedField.textAlign === align ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowColorPicker(true); setShowFontPicker(false) }}
                          className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm hover:border-indigo-300 transition"
                          style={{ backgroundColor: selectedField.color }}
                        />
                        <input
                          type="color"
                          value={selectedField.color}
                          onChange={e => patchField(selectedKey!, { color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          type="text"
                          value={selectedField.color}
                          onChange={e => patchField(selectedKey!, { color: e.target.value })}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-mono"
                          placeholder="#000000"
                        />
                        <button
                          onClick={() => { setShowColorPicker(true); setShowFontPicker(false) }}
                          className="p-1.5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                          title="Open Pantone picker"
                        >
                          <Palette className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Width */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Width: {Math.round(selectedField.w)}%</label>
                      <input
                        type="range"
                        min={5} max={95} step={1}
                        value={selectedField.w}
                        onChange={e => patchField(selectedKey!, { w: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Position (% from edge)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Left: {Math.round(selectedField.x)}%</span>
                          <input
                            type="range" min={0} max={95} step={0.5}
                            value={selectedField.x}
                            onChange={e => patchField(selectedKey!, { x: Number(e.target.value) })}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Top: {Math.round(selectedField.y)}%</span>
                          <input
                            type="range" min={0} max={95} step={0.5}
                            value={selectedField.y}
                            onChange={e => patchField(selectedKey!, { y: Number(e.target.value) })}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Canvas area ────────────────────────────────────────────────── */}
        <main className={`flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-6 ${mobileView === "controls" ? "hidden lg:flex" : "flex"}`}>
          <div className="relative">
            {/* Scale hint */}
            <p className="text-xs text-gray-400 text-center mb-2">A4 Canvas — drag fields to reposition</p>

            {/* A4 canvas */}
            <div
              ref={canvasRef}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerLeave={onCanvasPointerUp}
              className="relative bg-white shadow-2xl overflow-hidden select-none"
              style={{ width: "595px", height: "842px", cursor: isDragging ? "grabbing" : "default" }}
              onClick={e => { if (e.target === canvasRef.current) setSelectedKey(null) }}
            >
              {/* Background image */}
              {background ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={background}
                  alt="Invoice background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  <ImageIcon className="w-12 h-12 text-gray-200" />
                  <p className="text-sm text-gray-300 font-medium">Upload a background image</p>
                  <p className="text-xs text-gray-300">Your invoice fields will sit on top</p>
                </div>
              )}

              {/* Field chips */}
              {CANVAS_FIELDS.map(({ key, previewFn }) => {
                const fl = fieldLayout[key]
                if (!fl.show) return null
                const isSelected = selectedKey === key
                const text = previewFn(SAMPLE_INVOICE as typeof SAMPLE_INVOICE, SAMPLE_PROFILE as typeof SAMPLE_PROFILE)
                loadGoogleFont(fl.fontFamily.split(",")[0].replace(/'/g, "").trim())
                return (
                  <div
                    key={key}
                    onPointerDown={e => onChipPointerDown(e, key)}
                    onClick={e => { e.stopPropagation(); setSelectedKey(key); setSidebarTab("style") }}
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
                      cursor:     "grab",
                      whiteSpace: "pre-line",
                      lineHeight: 1.4,
                      outline:    isSelected ? "2px solid #6366f1" : "1px dashed transparent",
                      outlineOffset: "2px",
                      borderRadius: "2px",
                      padding:    "1px 2px",
                      userSelect: "none",
                      zIndex:     isSelected ? 10 : 1,
                    }}
                  >
                    {text}
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Google Fonts Picker Modal */}
      {showFontPicker && selectedKey && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800 text-sm">Choose a Google Font</h2>
              <button onClick={() => setShowFontPicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <GoogleFontsPicker
                selected={selectedField?.fontFamily.split(",")[0].replace(/'/g, "").trim() ?? ""}
                onSelect={family => {
                  loadGoogleFont(family)
                  patchField(selectedKey!, { fontFamily: `'${family}', sans-serif` })
                  setShowFontPicker(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pantone Color Picker Modal */}
      {showColorPicker && selectedKey && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800 text-sm">Pantone Color Picker</h2>
              <button onClick={() => setShowColorPicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PantoneColorPicker
                selected={selectedField?.color ?? "#000000"}
                onSelect={hex => {
                  patchField(selectedKey!, { color: hex })
                  setShowColorPicker(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
