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
import { Plus, Trash2, AlertCircle } from "lucide-react"
import type { ChartOfAccount, JournalEntry } from "@/lib/types"

const SOURCE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  payment: "Payment",
  purchase: "Purchase",
  manual: "Manual",
}

const SOURCE_COLORS: Record<string, string> = {
  invoice: "bg-green-50 text-green-700 border-green-200",
  payment: "bg-blue-50 text-blue-700 border-blue-200",
  purchase: "bg-amber-50 text-amber-700 border-amber-200",
  manual: "bg-slate-50 text-slate-700 border-slate-200",
}

function formatINR(n: number): string {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface DraftLine {
  account_id: string
  debit: string
  credit: string
}

function emptyLines(): DraftLine[] {
  return [
    { account_id: "", debit: "", credit: "" },
    { account_id: "", debit: "", credit: "" },
  ]
}

export function JournalView({
  entries: initial,
  accounts,
}: {
  entries: JournalEntry[]
  accounts: ChartOfAccount[]
}) {
  const [entries, setEntries] = useState<JournalEntry[]>(initial)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [narration, setNarration] = useState("")
  const [lines, setLines] = useState<DraftLine[]>(emptyLines())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts],
  )

  // Flatten entries → one row per line, so the table reads as a dense register
  // rather than requiring a click-to-expand per voucher (Anuj's concept, Raj's arbitration).
  const rows = useMemo(() => {
    const out: Array<{ entry: JournalEntry; line: NonNullable<JournalEntry["lines"]>[number] }> = []
    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        out.push({ entry, line })
      }
    }
    return out
  }, [entries])

  const debitTotal = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const creditTotal = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { account_id: "", debit: "", credit: "" }])
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  function openNew() {
    setDate(new Date().toISOString().split("T")[0])
    setNarration("")
    setLines(emptyLines())
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setError(null)
    if (!isBalanced) {
      setError("Debit and credit totals must match before saving.")
      return
    }
    const cleanLines = lines
      .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        account_id: Number(l.account_id),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    if (cleanLines.length < 2) {
      setError("Add at least two lines with an account and an amount.")
      return
    }

    setSaving(true)
    try {
      await fetchFromAPI("/api/journal-entries", {
        method: "POST",
        body: JSON.stringify({ date, narration, lines: cleanLines }),
      })
      const fresh = await fetchFromAPI("/api/journal-entries")
      setEntries(fresh)
      setOpen(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Journal Entry
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journal</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No journal entries yet. Invoices, payments, and purchases post here automatically.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Date</th>
                    <th className="py-2 pr-2 font-medium">Narration</th>
                    <th className="py-2 pr-2 font-medium">Account</th>
                    <th className="py-2 pr-2 font-medium">Source</th>
                    <th className="py-2 pr-2 font-medium text-right">Debit</th>
                    <th className="py-2 pl-2 font-medium text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ entry, line }, i) => (
                    <tr key={`${entry.id}-${line.account_id}-${i}`} className="hover:bg-muted/30">
                      <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">{entry.entry_date}</td>
                      <td className="py-2 pr-2 max-w-xs truncate" title={entry.narration ?? ""}>
                        {entry.narration}
                      </td>
                      <td className="py-2 pr-2 font-medium">{line.account_name}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SOURCE_COLORS[entry.source_type]}`}>
                          {SOURCE_LABELS[entry.source_type] ?? entry.source_type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {line.debit > 0 ? formatINR(line.debit) : ""}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums">
                        {line.credit > 0 ? formatINR(line.credit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              For things that aren't an invoice, payment, or purchase — e.g. depreciation, accruals, contra entries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Narration</Label>
                <Input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. Depreciation for March"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lines — debit and credit must balance</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add line
                </Button>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={line.account_id} onValueChange={(v) => updateLine(i, { account_id: v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedAccounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name} · {a.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Debit"
                    className="w-28"
                    value={line.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                  />
                  <Input
                    type="number"
                    placeholder="Credit"
                    className="w-28"
                    value={line.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <p className={`text-xs ${isBalanced ? "text-green-600" : "text-muted-foreground"}`}>
                Debit ₹{formatINR(debitTotal)} · Credit ₹{formatINR(creditTotal)}
                {isBalanced ? " — balanced" : ""}
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !isBalanced}>
              {saving ? "Saving…" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
