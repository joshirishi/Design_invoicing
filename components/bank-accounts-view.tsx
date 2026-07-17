"use client"

import { useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Landmark } from "lucide-react"
import type { BankAccount } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = { savings: "Savings", current: "Current", demat: "Demat" }

function emptyForm(): Omit<BankAccount, "id" | "org_id" | "created_at" | "updated_at"> {
  return { nickname: "", account_type: "current", is_personal: false }
}

export function BankAccountsView({ accounts: initial }: { accounts: BankAccount[] }) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }

  function openEdit(a: BankAccount) {
    setEditing(a)
    setForm({ nickname: a.nickname, account_type: a.account_type, is_personal: a.is_personal })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nickname.trim()) { setError("Account nickname is required"); return }
    setSaving(true); setError(null)
    try {
      if (editing) {
        const updated = await fetchFromAPI("/api/bank-accounts", { method: "PUT", body: JSON.stringify({ id: editing.id, ...form }) })
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      } else {
        const created = await fetchFromAPI("/api/bank-accounts", { method: "POST", body: JSON.stringify(form) })
        setAccounts((prev) => [...prev, created])
      }
      setOpen(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this account? Transactions already uploaded to it will keep their history but lose the account link.")) return
    try {
      await fetchFromAPI(`/api/bank-accounts?id=${id}`, { method: "DELETE" })
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add more than one account to keep personal and business transactions — or a demat account — separate when reconciling.
        </p>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Add Account
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => (
          <Card key={a.id} className="group">
            <CardContent className="p-4 flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-semibold truncate">{a.nickname}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs font-normal">{TYPE_LABELS[a.account_type]}</Badge>
                  <Badge variant="outline" className="text-xs font-normal">{a.is_personal ? "Personal" : "Business"}</Badge>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nickname *</Label>
              <Input
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="e.g. Business Current — HDFC"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.account_type} onValueChange={(v) => setForm((f) => ({ ...f, account_type: v as BankAccount["account_type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="demat">Demat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <Label className="text-sm">Personal account</Label>
                <p className="text-xs text-muted-foreground">Excluded from business P&L and GST rollups by default</p>
              </div>
              <Switch checked={form.is_personal} onCheckedChange={(v) => setForm((f) => ({ ...f, is_personal: v }))} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
