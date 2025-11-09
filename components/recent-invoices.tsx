"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Link from "next/link"
import type { Invoice } from "@/lib/types"

interface RecentInvoicesProps {
  invoices: Invoice[]
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "unpaid":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "partially_paid":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{invoice.invoice_number}</p>
              <Badge className={getStatusColor(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-semibold">₹{Number(invoice.total_amount).toLocaleString("en-IN")}</p>
            <Link href={`/dashboard/invoices/${invoice.id}`}>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
