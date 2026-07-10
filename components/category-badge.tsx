"use client"
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Sparkles, User, Search, Lock } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"

interface LiteAccount {
  id: number
  name: string
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense"
  parent_id: number | null
  is_system: boolean
}

const TYPE_DOT: Record<string, string> = {
  Asset: "bg-blue-500",
  Liability: "bg-red-500",
  Equity: "bg-purple-500",
  Income: "bg-green-500",
  Expense: "bg-amber-500",
}
const TYPE_BADGE: Record<string, string> = {
  Asset: "bg-blue-100 text-blue-800",
  Liability: "bg-red-100 text-red-800",
  Equity: "bg-purple-100 text-purple-800",
  Income: "bg-green-100 text-green-800",
  Expense: "bg-amber-100 text-amber-800",
}
const UNCATEGORIZED_CLASS = "bg-gray-50 text-gray-500 border border-dashed border-gray-300"

// Shared across all <CategoryBadge> instances on a page — one fetch instead of one per row.
let accountsCache: Promise<LiteAccount[]> | null = null
function getAccounts(): Promise<LiteAccount[]> {
  if (!accountsCache) {
    accountsCache = fetchFromAPI("/api/chart-of-accounts").catch((e) => {
      accountsCache = null
      throw e
    })
  }
  return accountsCache
}

interface Props {
  transactionId: string | number
  description: string
  category: string
  source?: string
  chartAccountId?: number | null
  orgId?: number
}

export function CategoryBadge({ transactionId, description, category, source, chartAccountId, orgId = 1 }: Props) {
  const [accounts, setAccounts] = useState<LiteAccount[]>([])
  const [current, setCurrent] = useState(category || "Uncategorized")
  const [currentId, setCurrentId] = useState<number | null>(chartAccountId ?? null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [learned, setLearned] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  function pathOf(a: LiteAccount): string {
    const parts = [a.name]
    let cur: LiteAccount | undefined = a
    const seen = new Set<number>()
    while (cur?.parent_id != null && !seen.has(cur.parent_id)) {
      seen.add(cur.parent_id)
      const p = byId.get(cur.parent_id)
      if (!p) break
      parts.unshift(p.name)
      cur = p
    }
    return parts.join(" › ")
  }

  const currentAccount = useMemo(() => {
    if (currentId != null) return byId.get(currentId)
    return accounts.find((a) => a.name === current)
  }, [accounts, byId, currentId, current])

  const colorClass = currentAccount ? TYPE_BADGE[currentAccount.type] : UNCATEGORIZED_CLASS
  const dotClass = currentAccount ? TYPE_DOT[currentAccount.type] : "bg-gray-300"
  const isAuto = source !== "user"

  const filtered = useMemo(() => {
    const list = accounts.map((a) => ({ account: a, path: pathOf(a) })).sort((a, b) => a.path.localeCompare(b.path))
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(({ path }) => path.toLowerCase().includes(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, search])

  async function applyCategory(account: LiteAccount) {
    if (account.id === currentId) { setOpen(false); return }
    setSaving(true)
    try {
      await fetchFromAPI("/api/categorize/learn", {
        method: "POST",
        body: JSON.stringify({ transaction_id: transactionId, description, chart_account_id: account.id, org_id: orgId }),
      })
      setCurrent(account.name)
      setCurrentId(account.id)
      setLearned(true)
      setTimeout(() => setLearned(false), 2000)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
      setOpen(false)
      setSearch("")
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
          <div className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-72 max-h-80 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 text-center">No matching categories</p>
              ) : (
                filtered.map(({ account, path }) => (
                  <button
                    key={account.id}
                    onClick={() => applyCategory(account)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                      account.id === currentId ? "font-semibold text-indigo-700 bg-indigo-50/50" : "text-gray-700"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[account.type]}`} />
                    <span className="truncate flex-1">{path}</span>
                    {account.is_system && <Lock className="w-2.5 h-2.5 text-gray-300 shrink-0" />}
                    {account.id === currentId && <Check className="w-3 h-3 text-indigo-500 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
