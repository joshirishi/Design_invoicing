export const dynamic = "force-dynamic"

import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { PaymentList } from "@/components/payment-list"
import { TdsSummaryView } from "@/components/tds-summary-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function PaymentsPage() {
  const orgId = await getCurrentOrgId()
  const oid = String(Math.floor(orgId))

  // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
  const payments = await rawSql(
    `SELECT p.*, i.invoice_number, c.name AS client_name FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id LEFT JOIN clients c ON i.client_id = c.id WHERE p.org_id = ${oid} ORDER BY p.payment_date DESC`,
  )

  return (
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

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tds-summary">TDS Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="pt-4">
          <PaymentList payments={payments} />
        </TabsContent>
        <TabsContent value="tds-summary" className="pt-4">
          <TdsSummaryView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
