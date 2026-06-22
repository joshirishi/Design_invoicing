"use client"
import { useState } from "react"
import { Check, ChevronDown, Sparkles, User } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"

const CATEGORY_COLORS: Record<string, string> = {
  "Income / Salary":    "bg-emerald-100 text-emerald-800",
  "GST Payment":        "bg-orange-100 text-orange-800",
  "Income Tax":         "bg-red-100 text-red-800",
  "Food & Dining":      "bg-yellow-100 text-yellow-800",
  "Groceries":          "bg-lime-100 text-lime-800",
  "Travel & Transport": "bg-sky-100 text-sky-800",
  "Medical & Health":   "bg-pink-100 text-pink-800",
  "Shopping & Retail":  "bg-purple-100 text-purple-800",
  "Utilities & Bills":  "bg-blue-100 text-blue-800",
  "Rent & Housing":     "bg-indigo-100 text-indigo-800",
  "Banking & Finance":  "bg-slate-100 text-slate-800",
  "Education":          "bg-cyan-100 text-cyan-800",
  "Entertainment":      "bg-violet-100 text-violet-800",
  "Office & Business":  "bg-teal-100 text-teal-800",
  "Refund / Reversal":  "bg-green-100 text-green-800",
  "Transfer":           "bg-gray-100 text-gray-700",
  "Uncategorized":      "bg-gray-50 text-gray-500 border border-dashed border-gray-300",
}

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS)

interface Props {
  transactionId: string | number
  description: string
  category: string
  source?: string
  orgId?: number
}

export function CategoryBadge({ transactionId, description, category, source, orgId = 1 }: Props) {
  const [current, setCurrent]   = useState(category || "Uncategorized")
  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)
  const [learned, setLearned]   = useState(false)
  const router = useRouter()

  const colorClass = CATEGORY_COLORS[current] || "bg-gray-100 text-gray-700"
  const isAuto = source !== "user"

  async function applyCategory(cat: string) {
    if (cat === current) { setOpen(false); return }
    setSaving(true)
    try {
      await fetchFromAPI("/api/categorize/learn", {
        method: "POST",
        body: JSON.stringify({ transaction_id: transactionId, description, category: cat, org_id: orgId }),
      })
      setCurrent(cat)
      setLearned(true)
      setTimeout(() => setLearned(false), 2000)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${colorClass} hover:opacity-80`}
        title={isAuto ? "Auto-categorized · click to correct" : "User-set · click to change"}
      >
        {isAuto ? <Sparkles className="w-2.5 h-2.5 opacity-60" /> : <User className="w-2.5 h-2.5 opacity-60" />}
        {current}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {learned && (
        <span className="absolute -top-5 left-0 text-xs text-emerald-600 whitespace-nowrap flex items-center gap-1">
          <Check className="w-3 h-3" /> Learned!
        </span>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-52 max-h-72 overflow-y-auto py-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Change category</p>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => applyCategory(cat)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${cat === current ? "font-semibold text-indigo-700" : "text-gray-700"}`}
              >
                <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]?.split(" ")[0] || "bg-gray-200"}`} />
                {cat}
                {cat === current && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
