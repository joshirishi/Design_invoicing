"use client"

import { useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Lock, Building2 } from "lucide-react"
import type { ChartOfAccount } from "@/lib/types"

const TYPE_COLORS: Record<string, string> = {
  Asset:     "bg-blue-50 text-blue-700 border-blue-200",
  Liability: "bg-red-50 text-red-700 border-red-200",
  Equity:    "bg-purple-50 text-purple-700 border-purple-200",
  Income:    "bg-green-50 text-green-700 border-green-200",
  Expense:   "bg-amber-50 text-amber-700 border-amber-200",
}

const TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const
const TALLY_GROUPS = [
  "Bank Accounts", "Cash-in-Hand", "Sundry Debtors", "Sundry Creditors",
  "Sales Accounts", "Purchase Accounts", "Direct Income", "Indirect Income",
  "Direct Expenses", "Indirect Expenses", "Duties & Taxes", "Capital Account",
  "Reserves & Surplus", "Loans (Liability)", "Bank OD A/c", "Term Loans",
  "Fixed Assets", "Plant & Machinery", "Furniture & Fittings", "Computer",
  "Deposits (Asset)", "Loans & Advances (Asset)", "Travelling Expenses", "Other Income",
]

function emptyForm() {
  return { name: "", type: "Expense" as string, tally_group: "Indirect Expenses", tally_parent: "Indirect Expenses" }
}

export function LedgerView({ accounts: initial }: { accounts: ChartOfAccount[] }) {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(initial)
  const [filter, setFilter]     = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<ChartOfAccount | null>(null)
  const [form, setForm]         = useState(emptyForm())
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const filtered = accounts.filter((a) => {
    const matchText = a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.tally_group.toLowerCase().includes(filter.toLowerCase())
    const matchType = typeFilter === "All" || a.type === typeFilter
    return matchText && matchType
  })

  // Group by type for display
  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = filtered.filter((a) => a.type === t)
    return acc
  }, {} as Record<string, ChartOfAccount[]>)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }

  function openEdit(a: ChartOfAccount) {
    if (a.is_system && a.org_id === null) return
    setEditing(a)
    setForm({ name: a.name, type: a.type, tally_group: a.tally_group, tally_parent: a.tally_parent || "" })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Account name is required"); return }
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        const updated = await fetchFromAPI("/api/chart-of-accounts", {
          method: "PUT",
          body: JSON.stringify({ id: editing.id, ...form }),
        })
        setAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a))
      } else {
        const created = await fetchFromAPI("/api/chart-of-accounts", {
          method: "POST",
          body: JSON.stringify(form),
        })
        setAccounts((prev) => [...prev, created])
      }
      setOpen(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const counts = TYPES.reduce((acc, t) => {
    acc[t] = accounts.filter((a) => a.type === t).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? "All" : t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              typeFilter === t ? TYPE_COLORS[t] : "bg-muted text-muted-foreground border-transparent hover:border-border"
            }`}
          >
            {t} · {counts[t]}
          </button>
        ))}
        {typeFilter !== "All" && (
          <button onClick={() => setTypeFilter("All")} className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground">
            Clear filter
          </button>
        )}
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search accounts or Tally groups…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Add Account
        </Button>
      </div>

      {/* Grouped tables */}
      {TYPES.map((type) => {
        const rows = grouped[type]
        if (rows.length === 0) return null
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[type]}`}>{type}</span>
                <span className="text-muted-foreground font-normal text-sm">{rows.length} accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {rows.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.is_system && a.org_id === null
                        ? <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.tally_group}{a.tally_parent ? ` › ${a.tally_parent}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.is_system && a.org_id === null
                        ? <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">System default</span>
                        : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No accounts match your filter.
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Web Hosting Expense" />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tally Group *</Label>
              <Select value={form.tally_group} onValueChange={(v) => setForm((f) => ({ ...f, tally_group: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TALLY_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used in Tally XML export</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
