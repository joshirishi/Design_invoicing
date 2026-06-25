export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { InvoiceForm } from "@/components/invoice-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function NewInvoicePage() {
  try {
    const [clients, profile] = await Promise.all([
      sql`SELECT * FROM clients ORDER BY name ASC`,
      sql`SELECT * FROM profiles LIMIT 1`.then((rows) => rows[0] || null),
    ])

    return (
      
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
            <p className="text-muted-foreground">Fill in the details to generate a new invoice</p>
          </div>

          <InvoiceForm clients={clients} profile={profile} />
        </div>
      
    )
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return (
        
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                The database tables haven't been created yet. Please run the SQL script{" "}
                <code className="bg-muted px-1 py-0.5 rounded">scripts/001_create_neon_schema.sql</code> to set up your
                database.
              </AlertDescription>
            </Alert>
          </div>
        
      )
    }

    return (
      
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load data: {error.message}</AlertDescription>
          </Alert>
        </div>
      
    )
  }
}
