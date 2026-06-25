"use client"
import { useState, useCallback } from "react"
import { Check, Loader2, Palette, LayoutGrid, ArrowLeft, Save, Eye } from "lucide-react"
import { TemplatePreview } from "@/components/template-preview"
import { TemplateStylePanel } from "@/components/template-style-panel"
import { TemplateFieldPanel } from "@/components/template-field-panel"
import { CanvasTemplateEditor } from "@/components/canvas-template-editor"
import { fetchFromAPI } from "@/lib/fetch"
import type { TemplateConfig } from "@/lib/template-defaults"
import { useRouter } from "next/navigation"

interface Props {
  initialConfig: TemplateConfig
  savedTemplateId?: number   // id of existing saved template (for PUT)
  templateName?: string
}

type Tab = "style" | "fields"

export function TemplateEditor({ initialConfig, savedTemplateId, templateName = "My Template" }: Props) {
  const router = useRouter()

  // Canvas mode gets its own full-screen editor
  if (initialConfig.templateId === "canvas") {
    return (
      <CanvasTemplateEditor
        initialConfig={initialConfig}
        savedTemplateId={savedTemplateId}
        templateName={templateName}
      />
    )
  }
  const [config, setConfig]   = useState<TemplateConfig>(initialConfig)
  const [tab, setTab]         = useState<Tab>("style")
  const [name, setName]       = useState(templateName)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")
  const [mobileView, setMobileView] = useState<"controls" | "preview">("controls")

  const handleChange = useCallback((patch: Partial<TemplateConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }, [])

  async function saveTemplate(asDefault: boolean) {
    setSaving(true)
    setError("")
    try {
      if (savedTemplateId) {
        await fetchFromAPI(`/api/invoice-templates`, {
          method: "PUT",
          body: JSON.stringify({ id: savedTemplateId, name, config, is_default: asDefault }),
        })
      } else {
        await fetchFromAPI(`/api/invoice-templates`, {
          method: "POST",
          body: JSON.stringify({ name, config, is_default: asDefault }),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (asDefault) router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "style",  label: "Style",  icon: Palette    },
    { id: "fields", label: "Fields", icon: LayoutGrid },
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/invoices/templates")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1 min-w-0 max-w-48"
          />
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileView(mobileView === "controls" ? "preview" : "controls")}
            className="lg:hidden flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {mobileView === "controls" ? "Preview" : "Controls"}
          </button>
          <button
            onClick={() => saveTemplate(false)}
            disabled={saving}
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <button
            onClick={() => saveTemplate(true)}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 font-medium transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Set as Default
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left control panel */}
        <aside className={`w-72 shrink-0 bg-white border-r flex flex-col overflow-hidden
          ${mobileView === "preview" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Tabs */}
          <div className="flex border-b shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2
                  ${tab === t.id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "style"  && <TemplateStylePanel config={config} onChange={handleChange} />}
            {tab === "fields" && <TemplateFieldPanel config={config} onChange={handleChange} />}
          </div>
        </aside>

        {/* Right: live preview */}
        <main className={`flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6
          ${mobileView === "controls" ? "hidden lg:flex" : "flex"}`}
        >
          {/* A4 preview with shadow */}
          <div
            className="bg-white shadow-2xl rounded-sm"
            style={{
              width: "210mm",
              minHeight: "297mm",
              // Scale down to fit viewport on most screens
              transform: "scale(0.72)",
              transformOrigin: "top center",
              marginBottom: "-297mm",  // collapse the scaled whitespace below
            }}
          >
            <TemplatePreview config={config} />
          </div>
        </main>
      </div>
    </div>
  )
}
