"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download } from "lucide-react"
import Link from "next/link"
import type { Invoice } from "@/lib/types"

interface InvoiceListProps {
  invoices: Invoice[]
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
      </Card>
    )
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
        <Card key={invoice.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{invoice.invoice_number}</h3>
                <Badge className={getStatusColor(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{invoice.client?.name}</p>
              <p className="text-sm text-muted-foreground">
                Date: {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">₹{Number(invoice.total_amount).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/invoices/${invoice.id}`}>
                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/dashboard/invoices/${invoice.id}/pdf`} target="_blank">
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
