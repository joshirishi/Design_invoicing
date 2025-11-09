import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ClientList } from "@/components/client-list"

async function getClients() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/clients`, {
      cache: "no-store",
    })
    if (!res.ok) throw new Error("Failed to fetch clients")
    return await res.json()
  } catch (error) {
    console.error("[v0] Error fetching clients:", error)
    return []
  }
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  )
}
