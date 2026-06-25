"use client"
import { useState, useMemo, useEffect } from "react"
import { Search, Check } from "lucide-react"
import { GOOGLE_FONTS, FONT_CATEGORIES, loadGoogleFont } from "@/lib/google-fonts-data"
import type { GoogleFont } from "@/lib/google-fonts-data"

interface Props {
  selected: string
  onSelect: (family: string) => void
}

export function GoogleFontsPicker({ selected, onSelect }: Props) {
  const [search, setSearch]     = useState("")
  const [category, setCategory] = useState<typeof FONT_CATEGORIES[number]>("All")
  // Preloaded fonts for visible items
  const [loaded, setLoaded]     = useState<Set<string>>(new Set())

  const filtered = useMemo<GoogleFont[]>(() => {
    const q = search.toLowerCase()
    return GOOGLE_FONTS
      .filter(f =>
        (category === "All" || f.category === category) &&
        (!q || f.family.toLowerCase().includes(q))
      )
      .sort((a, b) => a.rank - b.rank)
  }, [search, category])

  // Load fonts for the first visible batch
  useEffect(() => {
    filtered.slice(0, 30).forEach(f => {
      if (!loaded.has(f.family)) {
        loadGoogleFont(f.family)
        setLoaded(prev => new Set(prev).add(f.family))
      }
    })
  }, [filtered, loaded])

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fonts…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FONT_CATEGORIES.map(cat => (
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

      {/* Font list */}
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">No fonts found</p>
        )}
        {filtered.map(font => {
          const isSelected = selected === font.family
          return (
            <button
              key={font.family}
              onClick={() => {
                loadGoogleFont(font.family)
                onSelect(font.family)
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all text-left
                ${isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50 border border-transparent"}`}
            >
              <div className="min-w-0">
                {/* Preview text rendered in the font itself */}
                <p
                  className="text-base truncate"
                  style={{ fontFamily: `'${font.family}', ${font.category === "Serif" ? "serif" : font.category === "Monospace" ? "monospace" : "sans-serif"}` }}
                >
                  Aa — The quick brown fox
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{font.family} · {font.category}</p>
              </div>
              {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
            </button>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">{filtered.length} fonts · scroll to see more</p>
      )}
    </div>
  )
}
