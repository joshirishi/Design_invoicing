export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { PaymentForm } from "@/components/payment-form"

export default async function NewPaymentPage() {
  const [invoices, clients] = await Promise.all([
    sql`
      SELECT i.*, 
             json_build_object('name', c.name) as client
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.status IN ('unpaid', 'partially_paid', 'overdue')
      ORDER BY i.issue_date DESC
    `,
    sql`SELECT * FROM clients ORDER BY name ASC`,
  ])

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
          <p className="text-muted-foreground">Add a new payment record</p>
        </div>

        <PaymentForm invoices={invoices} clients={clients} />
      </div>
    
  )
}
