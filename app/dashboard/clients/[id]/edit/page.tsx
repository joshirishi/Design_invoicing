export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { sql } from "@/lib/db"
import { ClientForm } from "@/components/client-form"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const clients = await sql`SELECT * FROM clients WHERE id = ${id}`
  const client = clients[0]

  if (!client) {
    notFound()
  }

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Client</h1>
          <p className="text-muted-foreground">Update client information</p>
        </div>

        <ClientForm client={client} />
      </div>
    
  )
}
