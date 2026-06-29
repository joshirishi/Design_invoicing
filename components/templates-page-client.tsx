"use client"
import { useState } from "react"
import { Check, Pencil, Star, Sparkles, Layers, FolderOpen } from "lucide-react"
import { TemplatePreview } from "@/components/template-preview"
import { CanvasTemplatePreview } from "@/components/canvas-template-preview"
import { TemplateEditor } from "@/components/template-editor"
import type { TemplateConfig } from "@/lib/template-defaults"
import { STARTER_TEMPLATES } from "@/lib/template-defaults"

interface SavedTemplate {
  id: number
  name: string
  is_default: boolean
  config: TemplateConfig
  updated_at: string
}

interface Props {
  starters: typeof STARTER_TEMPLATES
  saved: SavedTemplate[]
}

export default function TemplatesPageClient({ starters, saved }: Props) {
  const [editing, setEditing] = useState<{
    config: TemplateConfig
    id?: number
    name?: string
  } | null>(null)

  if (editing) {
    return (
      <TemplateEditor
        initialConfig={editing.config}
        savedTemplateId={editing.id}
        templateName={editing.name || "My Template"}
      />
    )
  }

  const canvasConfig = STARTER_TEMPLATES.find(s => s.id === "canvas")!.config

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Templates</h1>
        <p className="text-gray-500 text-sm mt-1">
          Design your invoice once, reuse it forever. Pick a starter or build your own from scratch.
        </p>
      </div>

      {/* ── Section 1: Your Templates ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <FolderOpen className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Your Templates</h2>
          {saved.length > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {saved.length}
            </span>
          )}
        </div>

        {saved.length === 0 ? (
          // Empty state — always visible so users know where saved templates will appear
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 bg-gray-50/50">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">No saved templates yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Customise a starter below and hit <strong>Save</strong> — it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {saved.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                config={t.config}
                isDefault={t.is_default}
                savedId={t.id}
                onEdit={() => setEditing({ config: t.config, id: t.id, name: t.name })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Starter Templates & Template Builder ───────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Starter Templates &amp; Template Builder</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Pick any layout, customise it to your brand, and save it to Your Templates.
        </p>

        {/* Canvas builder CTA — pinned at the top of this section */}
        <div
          onClick={() => setEditing({ config: canvasConfig, name: "Canvas Template" })}
          className="group cursor-pointer rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 p-6 flex items-center gap-5 transition-all shadow-sm hover:shadow-md mb-6"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-sm">Canvas Builder — Upload Your Own Design</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload a branded PNG/JPG background, then drag invoice fields anywhere on it. Supports Google Fonts &amp; Pantone colors.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm group-hover:bg-violet-500 transition shrink-0">
            <Pencil className="w-3.5 h-3.5" /> Open Canvas
          </span>
        </div>

        {/* 12 starter templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {starters.filter(s => s.id !== "canvas").map((s) => (
            <TemplateCard
              key={s.id}
              name={s.name}
              description={s.description}
              config={s.config}
              onEdit={() => setEditing({ config: s.config, name: s.name })}
              isStarter
            />
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  name, description, config, isDefault, isStarter, savedId, onEdit,
}: {
  name: string
  description?: string
  config: TemplateConfig
  isDefault?: boolean
  isStarter?: boolean
  savedId?: number
  onEdit: () => void
}) {
  const c = config.colors

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden bg-gray-50 cursor-pointer"
        style={{ height: 220 }}
        onClick={onEdit}
      >
        {config.templateId === "canvas" ? (
          <div style={{ transform: "scale(0.37)", transformOrigin: "top left", width: "270%", height: "270%", pointerEvents: "none" }}>
            <CanvasTemplatePreview config={config} />
          </div>
        ) : (
          <div style={{ transform: "scale(0.25)", transformOrigin: "top left", width: "400%", height: "400%", pointerEvents: "none" }}>
            <TemplatePreview config={config} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-full px-4 py-2 shadow text-sm font-medium text-indigo-700 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" />
            {isStarter ? "Customise & Save" : "Edit"}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isDefault && (
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow">
              <Check className="w-3 h-3" /> Active
            </span>
          )}
          {isStarter && (
            <span className="flex items-center gap-1 bg-white/90 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm border border-indigo-100">
              <Star className="w-3 h-3" /> Starter
            </span>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c.primary }} />
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-100 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 transition"
          >
            <Pencil className="w-3 h-3" />
            {isStarter ? "Use & Edit" : "Edit"}
          </button>
        </div>
      </div>
    </div>
  )
}
