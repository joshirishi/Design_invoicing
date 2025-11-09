import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { PaymentList } from "@/components/payment-list"

export default async function PaymentsPage() {
  const payments = await sql`
    SELECT p.*, 
           i.invoice_number,
           c.name as client_name
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY p.payment_date DESC
  `

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">Track all received payments</p>
          </div>
          <Link href="/dashboard/payments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </Link>
        </div>

        <PaymentList payments={payments} />
      </div>
    </DashboardLayout>
  )
}
