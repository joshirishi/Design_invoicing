export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { InvoiceView } from "@/components/invoice-view"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const invoices = await sql`
    SELECT i.*,
           json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'address', c.address, 'gstin', c.gstin) as client
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ${id}
  `

  const invoice = invoices[0]

  if (!invoice) {
    notFound()
  }

  const orgId = invoice.org_id
  const profiles = await sql`SELECT * FROM profiles WHERE org_id = ${orgId} LIMIT 1`
  const profile = profiles[0] || null

  return (
    <DashboardLayout>
      <InvoiceView invoice={invoice} profile={profile} />
    </DashboardLayout>
  )
}
