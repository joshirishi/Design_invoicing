"use client"

import { useState } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react"
import type { Vendor } from "@/lib/types"
import { INDIAN_STATES } from "@/lib/financial-year"

function emptyForm(): Omit<Vendor, "id" | "org_id" | "created_at" | "updated_at"> {
  return { name: "", gstin: null, pan_no: null, state_code: null, address: null, email: null, phone: null }
}

export function VendorsView({ vendors: initial }: { vendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)
  const [search, setSearch]   = useState("")
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm]       = useState(emptyForm())
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const set = (field: string, value: string | null) =>
    setForm((f) => ({ ...f, [field]: value || null }))

  // Auto-fill state_code from GSTIN
  const handleGstin = (v: string) => {
    set("gstin", v)
    if (v.length >= 2 && /^\d{2}/.test(v)) {
      const code = v.slice(0, 2)
      if (INDIAN_STATES.find((s) => s.code === code)) set("state_code", code)
    }
  }

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.gstin || "").toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm({ name: v.name, gstin: v.gstin, pan_no: v.pan_no, state_code: v.state_code, address: v.address, email: v.email, phone: v.phone })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { setError("Vendor name is required"); return }
    setSaving(true); setError(null)
    try {
      if (editing) {
        const updated = await fetchFromAPI("/api/vendors", { method: "PUT", body: JSON.stringify({ id: editing.id, ...form }) })
        setVendors((prev) => prev.map((v) => v.id === updated.id ? updated : v))
      } else {
        const created = await fetchFromAPI("/api/vendors", { method: "POST", body: JSON.stringify(form) })
        setVendors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setOpen(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this vendor? Existing purchases linked to them will not be affected.")) return
    setDeleting(id)
    try {
      await fetchFromAPI(`/api/vendors?id=${id}`, { method: "DELETE" })
      setVendors((prev) => prev.filter((v) => v.id !== id))
    } catch (e: any) { alert(e.message) }
    finally { setDeleting(null) }
  }

  const stateName = (code: string | null) =>
    code ? (INDIAN_STATES.find((s) => s.code === code)?.name ?? code) : null

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendors or GSTIN…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Add Vendor
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">{vendors.length === 0 ? "No vendors yet" : "No vendors match your search"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {vendors.length === 0 ? "Add vendors to link them to purchase bills for ITC tracking." : "Try a different search term."}
            </p>
            {vendors.length === 0 && (
              <Button className="mt-4" size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1.5" />Add First Vendor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Card key={v.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{v.name}</p>
                    {v.gstin && <p className="text-xs text-muted-foreground font-mono mt-0.5">{v.gstin}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(v.id)} disabled={deleting === v.id}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {v.state_code && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {stateName(v.state_code)}
                    </Badge>
                  )}
                  {v.pan_no && (
                    <Badge variant="outline" className="text-xs font-mono font-normal">{v.pan_no}</Badge>
                  )}
                </div>

                {(v.email || v.phone) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {v.email && <p className="truncate">{v.email}</p>}
                    {v.phone && <p>{v.phone}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Vendor Name *</Label>
              <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Company or individual name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>GSTIN</Label>
                <Input value={form.gstin ?? ""} onChange={(e) => handleGstin(e.target.value)} placeholder="27AAGCC1503R1ZH" maxLength={15} />
                <p className="text-xs text-muted-foreground">State auto-filled from GSTIN</p>
              </div>
              <div className="space-y-1.5">
                <Label>PAN</Label>
                <Input value={form.pan_no ?? ""} onChange={(e) => set("pan_no", e.target.value.toUpperCase())} placeholder="AAGCC1503R" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={form.state_code ?? ""} onValueChange={(v) => set("state_code", v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="vendor@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91-9999999999" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Full address" rows={2} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Vendor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
