"use client"

import { useMemo, useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Plus, Pencil, Lock, ChevronRight, ChevronDown, FolderTree, Trash2,
  ArrowRightLeft, Settings2, ChevronsDownUp, ChevronsUpDown, AlertCircle,
} from "lucide-react"
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
  "Deposits (Asset)", "Loans & Advances (Asset)", "Travelling Expenses",
  "Other Income", "Investments",
]

interface FormState {
  name: string
  type: string
  tally_group: string
  tally_parent: string
  parent_id: number | null
}

function emptyForm(parent?: ChartOfAccount | null): FormState {
  return {
    name: "",
    type: parent?.type ?? "Expense",
    tally_group: parent?.tally_group ?? "Indirect Expenses",
    tally_parent: parent?.tally_parent ?? "Indirect Expenses",
    parent_id: parent?.id ?? null,
  }
}

export function LedgerView({ accounts: initial }: { accounts: ChartOfAccount[] }) {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(initial)
  const [filter, setFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Add / full-edit dialog
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChartOfAccount | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline rename
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Move (reparent) dialog
  const [movingAccount, setMovingAccount] = useState<ChartOfAccount | null>(null)
  const [moveTarget, setMoveTarget] = useState<string>("__root__")
  const [moveError, setMoveError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ChartOfAccount | null>(null)
  const [deleteError, setDeleteError] = useState<{ message: string; hint?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const childrenOf = useMemo(() => {
    const m = new Map<number | null, ChartOfAccount[]>()
    for (const a of accounts) {
      const key = a.parent_id
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(a)
    }
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return m
  }, [accounts])

  function pathOf(a: ChartOfAccount): string {
    const parts = [a.name]
    let cur: ChartOfAccount | undefined = a
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

  function isDescendant(candidateId: number, ancestorId: number): boolean {
    let cur = byId.get(candidateId)
    const seen = new Set<number>()
    while (cur?.parent_id != null && !seen.has(cur.id)) {
      seen.add(cur.id)
      if (cur.parent_id === ancestorId) return true
      cur = byId.get(cur.parent_id)
    }
    return false
  }

  const isSearching = filter.trim().length > 0
  const searchLower = filter.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    return accounts
      .filter(
        (a) =>
          (typeFilter === "All" || a.type === typeFilter) &&
          (a.name.toLowerCase().includes(searchLower) || a.tally_group.toLowerCase().includes(searchLower)),
      )
      .sort((a, b) => pathOf(a).localeCompare(pathOf(b)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, isSearching, searchLower, typeFilter])

  const roots = useMemo(() => {
    const all = childrenOf.get(null) ?? []
    return typeFilter === "All" ? all : all.filter((a) => a.type === typeFilter)
  }, [childrenOf, typeFilter])

  const counts = TYPES.reduce((acc, t) => {
    acc[t] = accounts.filter((a) => a.type === t).length
    return acc
  }, {} as Record<string, number>)

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function expandAll() {
    setExpanded(new Set(accounts.filter((a) => (childrenOf.get(a.id) ?? []).length > 0).map((a) => a.id)))
  }
  function collapseAll() {
    setExpanded(new Set())
  }

  function openAdd(parent?: ChartOfAccount) {
    setEditing(null)
    setForm(emptyForm(parent))
    setError(null)
    setOpen(true)
  }

  function openEditFull(a: ChartOfAccount) {
    setEditing(a)
    setForm({ name: a.name, type: a.type, tally_group: a.tally_group, tally_parent: a.tally_parent || "", parent_id: a.parent_id })
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
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      } else {
        const created = await fetchFromAPI("/api/chart-of-accounts", {
          method: "POST",
          body: JSON.stringify(form),
        })
        setAccounts((prev) => [...prev, created])
        if (form.parent_id) setExpanded((prev) => new Set(prev).add(form.parent_id!))
      }
      setOpen(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function startRename(a: ChartOfAccount) {
    setRenamingId(a.id)
    setRenameValue(a.name)
  }

  async function commitRename(a: ChartOfAccount) {
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (!trimmed || trimmed === a.name) return
    try {
      const updated = await fetchFromAPI("/api/chart-of-accounts", {
        method: "PUT",
        body: JSON.stringify({
          id: a.id, name: trimmed, type: a.type, tally_group: a.tally_group,
          tally_parent: a.tally_parent, parent_id: a.parent_id, is_active: a.is_active,
        }),
      })
      setAccounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e: any) {
      setError(e.message)
    }
  }

  function openMove(a: ChartOfAccount) {
    setMovingAccount(a)
    setMoveTarget(a.parent_id != null ? String(a.parent_id) : "__root__")
    setMoveError(null)
  }

  async function commitMove() {
    if (!movingAccount) return
    const newParentId = moveTarget === "__root__" ? null : Number(moveTarget)
    setMoveError(null)
    try {
      const updated = await fetchFromAPI("/api/chart-of-accounts", {
        method: "PUT",
        body: JSON.stringify({
          id: movingAccount.id, name: movingAccount.name, type: movingAccount.type,
          tally_group: movingAccount.tally_group, tally_parent: movingAccount.tally_parent,
          parent_id: newParentId, is_active: movingAccount.is_active,
        }),
      })
      setAccounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      if (newParentId) setExpanded((prev) => new Set(prev).add(newParentId))
      setMovingAccount(null)
    } catch (e: any) {
      setMoveError(e.message)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await fetchFromAPI(`/api/chart-of-accounts?id=${deleteTarget.id}`, { method: "DELETE" })
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e: any) {
      let message = e.message as string
      let hint: string | undefined
      try {
        const parsed = JSON.parse(e.message)
        message = parsed.details
          ? `In use — ${parsed.details.children} subcategories, ${parsed.details.transactions} transactions, ${parsed.details.rules} rules still reference it.`
          : parsed.error ?? message
        hint = parsed.hint
      } catch {
        // message stays as raw text
      }
      setDeleteError({ message, hint })
    } finally {
      setDeleting(false)
    }
  }

  // Move-target options: everything except the node itself and its own descendants
  const moveOptions = useMemo(() => {
    if (!movingAccount) return []
    return accounts
      .filter((a) => a.id !== movingAccount.id && !isDescendant(a.id, movingAccount.id))
      .map((a) => ({ id: a.id, path: pathOf(a) }))
      .sort((a, b) => a.path.localeCompare(b.path))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, movingAccount])

  function renderNode(a: ChartOfAccount, depth: number) {
    const kids = childrenOf.get(a.id) ?? []
    const hasKids = kids.length > 0
    const isExpanded = expanded.has(a.id)
    const isRenaming = renamingId === a.id

    return (
      <div key={a.id}>
        <div
          className="flex items-center justify-between gap-2 py-1.5 pr-2 hover:bg-muted/40 rounded-md group"
          style={{ paddingLeft: `${depth * 18 + 4}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasKids ? (
              <button onClick={() => toggleExpand(a.id)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            {a.is_system ? (
              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : (
              <FolderTree className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            {isRenaming ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(a)
                  if (e.key === "Escape") setRenamingId(null)
                }}
                onBlur={() => commitRename(a)}
                className="h-6 text-sm py-0 max-w-xs"
              />
            ) : (
              <span className="text-sm font-medium truncate">{a.name}</span>
            )}
            <Badge variant="outline" className={`text-[10px] shrink-0 px-1.5 py-0 ${TYPE_COLORS[a.type]}`}>{a.type}</Badge>
            <span className="text-xs text-muted-foreground truncate hidden md:inline">{a.tally_group}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Add subcategory" onClick={() => openAdd(a)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Rename" onClick={() => startRename(a)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Move to…" onClick={() => openMove(a)}>
              <ArrowRightLeft className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit type / Tally group" onClick={() => openEditFull(a)}>
              <Settings2 className="h-3 w-3" />
            </Button>
            {!a.is_system && (
              <Button
                variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                title="Delete" onClick={() => { setDeleteTarget(a); setDeleteError(null) }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {hasKids && isExpanded && <div>{kids.map((k) => renderNode(k, depth + 1))}</div>}
      </div>
    )
  }

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

      {/* Search + Add + Expand controls */}
      <div className="flex gap-3 items-center flex-wrap">
        <Input
          placeholder="Search accounts or Tally groups…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {!isSearching && (
          <>
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />Expand all
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              <ChevronsDownUp className="h-3.5 w-3.5 mr-1.5" />Collapse all
            </Button>
          </>
        )}
        <Button onClick={() => openAdd()} size="sm" className="ml-auto">
          <Plus className="h-4 w-4 mr-1.5" />Add Account
        </Button>
      </div>

      {/* Tree / search results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isSearching ? `${searchResults.length} matching accounts` : "Chart of Accounts Tree"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isSearching ? (
            searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No accounts match your search.</p>
            ) : (
              <div className="divide-y">
                {searchResults.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-1 py-2.5 hover:bg-muted/30 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {a.is_system ? <Lock className="h-3 w-3 text-muted-foreground shrink-0" /> : <FolderTree className="h-3 w-3 text-muted-foreground shrink-0" />}
                        <span className="text-sm font-medium truncate">{a.name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[a.type]}`}>{a.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pathOf(a)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Move to…" onClick={() => openMove(a)}>
                        <ArrowRightLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => openEditFull(a)}>
                        <Settings2 className="h-3 w-3" />
                      </Button>
                      {!a.is_system && (
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                          title="Delete" onClick={() => { setDeleteTarget(a); setDeleteError(null) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : roots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No accounts yet.</p>
          ) : (
            <div>{roots.map((a) => renderNode(a, 0))}</div>
          )}
        </CardContent>
      </Card>

      {/* Add / Full Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : form.parent_id ? "Add Subcategory" : "Add Account"}</DialogTitle>
            {!editing && form.parent_id && (
              <DialogDescription>Under {byId.get(form.parent_id)?.name}</DialogDescription>
            )}
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
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select
                value={form.parent_id != null ? String(form.parent_id) : "__root__"}
                onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "__root__" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">— No parent (top level) —</SelectItem>
                  {accounts
                    .filter((a) => !editing || (a.id !== editing.id && !isDescendant(a.id, editing.id)))
                    .sort((a, b) => pathOf(a).localeCompare(pathOf(b)))
                    .map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{pathOf(a)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={!!movingAccount} onOpenChange={(v) => !v && setMovingAccount(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move "{movingAccount?.name}"</DialogTitle>
            <DialogDescription>Choose a new parent category, or move it to the top level.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">— No parent (top level) —</SelectItem>
                {moveOptions.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.path}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {moveError && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{moveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovingAccount(null)}>Cancel</Button>
            <Button onClick={commitMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the tree. This can't be undone unless you recreate it manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive space-y-1">
              <p className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{deleteError.message}</p>
              {deleteError.hint && <p className="text-xs text-muted-foreground">{deleteError.hint}</p>}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete() }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
