"use client"
import { useState, useMemo } from "react"
import { Search, Check } from "lucide-react"
import { PANTONE_COLORS, PANTONE_CATEGORIES } from "@/lib/pantone-colors-data"
import type { PantoneCategory } from "@/lib/pantone-colors-data"

interface Props {
  selected: string   // currently selected hex
  onSelect: (hex: string) => void
}

// Determine whether to show white or black label over a swatch
function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? "#000000" : "#ffffff"
}

export function PantoneColorPicker({ selected, onSelect }: Props) {
  const [search,   setSearch]   = useState("")
  const [category, setCategory] = useState<PantoneCategory>("All")
  const [hovered,  setHovered]  = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return PANTONE_COLORS.filter(c =>
      (category === "All" || c.category === category) &&
      (!q || c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q))
    )
  }, [search, category])

  const hoveredColor = hovered ? PANTONE_COLORS.find(c => c.hex === hovered) : null
  const selectedColor = PANTONE_COLORS.find(c => c.hex.toLowerCase() === selected?.toLowerCase())

  return (
    <div className="flex flex-col gap-4">
      {/* Currently selected */}
      {selectedColor && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-10 h-10 rounded-lg shadow-sm" style={{ backgroundColor: selectedColor.hex }} />
          <div>
            <p className="text-sm font-semibold text-gray-800">{selectedColor.name}</p>
            <p className="text-xs text-gray-500 font-mono">{selectedColor.hex} · RGB({selectedColor.rgb.join(", ")})</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or hex…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PANTONE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all
              ${category === cat
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hover info bar */}
      {hoveredColor && (
        <div className="flex items-center gap-3 py-2 px-3 bg-white border border-gray-200 rounded-lg shadow-sm text-xs transition-all">
          <div className="w-5 h-5 rounded shadow-sm shrink-0" style={{ backgroundColor: hoveredColor.hex }} />
          <span className="font-semibold text-gray-700 truncate">{hoveredColor.name}</span>
          <span className="font-mono text-gray-500 ml-auto shrink-0">{hoveredColor.hex}</span>
          <span className="text-gray-400 shrink-0">RGB({hoveredColor.rgb.join(", ")})</span>
        </div>
      )}

      {/* Swatch grid */}
      <div className="grid grid-cols-8 gap-1.5 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="col-span-8 text-center text-sm text-gray-400 py-8">No colors found</div>
        )}
        {filtered.map(color => {
          const isSelected = color.hex.toLowerCase() === selected?.toLowerCase()
          return (
            <button
              key={color.hex + color.name}
              title={`${color.name}\n${color.hex}\nRGB(${color.rgb.join(", ")})\nCMYK(${color.cmyk.join(", ")})`}
              onClick={() => onSelect(color.hex)}
              onMouseEnter={() => setHovered(color.hex)}
              onMouseLeave={() => setHovered(null)}
              className="relative aspect-square rounded-lg transition-all hover:scale-110 hover:z-10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ backgroundColor: color.hex }}
            >
              {isSelected && (
                <Check
                  className="absolute inset-0 m-auto w-3.5 h-3.5"
                  style={{ color: contrastText(color.hex) }}
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">{filtered.length} colors · hover for details</p>
    </div>
  )
}
