export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ClientList } from "@/components/client-list"

export default async function ClientsPage() {
  const orgId = await getCurrentOrgId()
  const clients = await sql`SELECT * FROM clients WHERE org_id = ${orgId} ORDER BY name ASC`.catch(() => [])

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage your client information</p>
          </div>
          <Link href="/dashboard/clients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>

        <ClientList clients={clients} />
      </div>
    
  )
}
