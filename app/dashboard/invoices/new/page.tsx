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
                Tables are missing. Visit{" "}
                <a href="/api/init-db" className="underline font-medium">/api/init-db</a>{" "}
                then{" "}
                <a href="/api/migrations/invoice-items" className="underline font-medium">/api/migrations/invoice-items</a>{" "}
                to set up the database.
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
