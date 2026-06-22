"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Plus, Star, Sparkles } from "lucide-react"
import { TemplatePreview } from "@/components/template-preview"
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Templates</h1>
        <p className="text-gray-500 text-sm mt-1">
          Choose a starter, then customise colors, fonts, and fields to match your brand.
        </p>
      </div>

      {/* Saved templates */}
      {saved.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Saved Templates</h2>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{saved.length}</span>
          </div>
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
        </section>
      )}

      {/* Starter templates */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Starter Templates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {starters.map((s) => (
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

// ── Template Card ──────────────────────────────────────────────────────────

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
      {/* Thumbnail: scaled-down preview */}
      <div
        className="relative overflow-hidden bg-gray-50 cursor-pointer"
        style={{ height: 220 }}
        onClick={onEdit}
      >
        <div style={{ transform: "scale(0.25)", transformOrigin: "top left", width: "400%", height: "400%", pointerEvents: "none" }}>
          <TemplatePreview config={config} />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-full px-4 py-2 shadow text-sm font-medium text-indigo-700 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" /> Customize
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
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Color dot */}
          <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c.primary }} />
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
