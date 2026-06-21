"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, X, Receipt } from "lucide-react"
import { fetchFromAPI } from "@/lib/db"
import type { Purchase } from "@/lib/types"

interface PurchasesViewProps {
  purchases: Purchase[]
}

const EMPTY_FORM = {
  vendor_name: "", vendor_gstin: "", invoice_date: new Date().toISOString().split("T")[0],
  invoice_number: "", description: "", amount: "",
  cgst: "", sgst: "", igst: "",
}

export function PurchasesView({ purchases: initial }: PurchasesViewProps) {
  const router = useRouter()
  const [purchases, setPurchases] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const totalGstPaid = purchases.reduce((s, p) => s + Number(p.cgst) + Number(p.sgst) + Number(p.igst), 0)
  const totalExpense = purchases.reduce((s, p) => s + Number(p.amount), 0)

  const handleSave = async () => {
    if (!form.vendor_name || !form.invoice_date || !form.amount) return
    setSaving(true)
    try {
      const result = await fetchFromAPI("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          cgst: Number(form.cgst) || 0,
          sgst: Number(form.sgst) || 0,
          igst: Number(form.igst) || 0,
        }),
      })
      setPurchases((p) => [result, ...p])
      setForm(EMPTY_FORM)
      setShowForm(false)
      router.refresh()
    } catch (err) {
      console.error("Save failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetchFromAPI(`/api/purchases?id=${id}`, { method: "DELETE" })
      setPurchases((p) => p.filter((x) => x.id !== id))
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{purchases.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Expense (excl. GST)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">₹{totalExpense.toLocaleString("en-IN")}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Input GST Credit</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₹{totalGstPaid.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">Claimable against output GST</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Purchase Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Purchase Records</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Purchase
        </Button>
      </div>

      {/* Add Purchase Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">New Purchase / Expense</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vendor Name *</Label>
                <Input value={form.vendor_name} onChange={set("vendor_name")} placeholder="Vendor Company Pvt Ltd" required />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor GSTIN</Label>
                <Input value={form.vendor_gstin} onChange={(e) => setForm((p) => ({ ...p, vendor_gstin: e.target.value.toUpperCase() }))} placeholder="27XXXXX0000X1Z5" maxLength={15} />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Date *</Label>
                <Input type="date" value={form.invoice_date} onChange={set("invoice_date")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor Invoice No.</Label>
                <Input value={form.invoice_number} onChange={set("invoice_number")} placeholder="INV-2024-001" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={set("description")} placeholder="What was purchased" />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (excl. GST) *</Label>
                <Input type="number" value={form.amount} onChange={set("amount")} placeholder="10000" required />
              </div>
              <div className="space-y-1.5">
                <Label>CGST</Label>
                <Input type="number" value={form.cgst} onChange={set("cgst")} placeholder="900" />
              </div>
              <div className="space-y-1.5">
                <Label>SGST</Label>
                <Input type="number" value={form.sgst} onChange={set("sgst")} placeholder="900" />
              </div>
              <div className="space-y-1.5">
                <Label>IGST (if inter-state)</Label>
                <Input type="number" value={form.igst} onChange={set("igst")} placeholder="0" />
              </div>
            </div>

            {form.amount && (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Total incl. GST: </span>
                <strong>₹{(Number(form.amount) + Number(form.cgst || 0) + Number(form.sgst || 0) + Number(form.igst || 0)).toLocaleString("en-IN")}</strong>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !form.vendor_name || !form.invoice_date || !form.amount}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Purchase"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchases table */}
      {purchases.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No purchases logged yet. Add your first expense above.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p.vendor_name}</span>
                    {p.vendor_gstin && <Badge variant="outline" className="text-xs">{p.vendor_gstin}</Badge>}
                    {p.invoice_number && <Badge variant="secondary" className="text-xs">{p.invoice_number}</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-bold">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-green-600">
                    GST: ₹{(Number(p.cgst) + Number(p.sgst) + Number(p.igst)).toLocaleString("en-IN")}
                    {Number(p.igst) > 0 ? ` (IGST)` : ` (C+S)`}
                  </p>
                  <p className="text-xs text-muted-foreground">Total: ₹{Number(p.total_with_tax).toLocaleString("en-IN")}</p>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                >
                  {deleting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
