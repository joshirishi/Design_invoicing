"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import type { TrialBalanceRow } from "@/lib/types"

const TYPE_COLORS: Record<string, string> = {
  Asset: "bg-blue-50 text-blue-700 border-blue-200",
  Liability: "bg-red-50 text-red-700 border-red-200",
  Equity: "bg-purple-50 text-purple-700 border-purple-200",
  Income: "bg-green-50 text-green-700 border-green-200",
  Expense: "bg-amber-50 text-amber-700 border-amber-200",
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TrialBalanceView({
  rows,
  totalDebit,
  totalCredit,
  balanced,
}: {
  rows: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
  balanced: boolean
}) {
  const diff = Math.abs(totalDebit - totalCredit)

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium ${
          balanced
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}
      >
        {balanced ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Balanced — ready for your CA
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Off by ₹{formatINR(diff)} — something didn't post correctly
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trial Balance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No journal entries yet. Create an invoice, payment, or purchase to see entries post here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Account</th>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium text-right">Debit</th>
                    <th className="py-2 pl-2 font-medium text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.account_id}>
                      <td className="py-2 pr-2 font-medium">{r.account_name}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[r.account_type]}`}>
                          {r.account_type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {r.debit > 0 ? formatINR(r.debit) : ""}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums">
                        {r.credit > 0 ? formatINR(r.credit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2 pr-2">Total</td>
                    <td className="py-2 pr-2" />
                    <td className="py-2 pr-2 text-right tabular-nums">{formatINR(totalDebit)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">{formatINR(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
