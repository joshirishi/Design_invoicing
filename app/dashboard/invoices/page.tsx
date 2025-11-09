import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { InvoiceList } from "@/components/invoice-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function InvoicesPage() {
  try {
    const invoices = await sql`
      SELECT i.*, 
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as client
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.issue_date DESC
    `

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground">Manage and track all your invoices</p>
            </div>
            <Link href="/dashboard/invoices/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          </div>

          <InvoiceList invoices={invoices} />
        </div>
      </DashboardLayout>
    )
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return (
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground">Manage and track all your invoices</p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                Please run the SQL script{" "}
                <code className="bg-muted px-1 py-0.5 rounded">scripts/001_create_neon_schema.sql</code> to set up your
                database before creating invoices.
              </AlertDescription>
            </Alert>
          </div>
        </DashboardLayout>
      )
    }
    throw error
  }
}
