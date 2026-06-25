export const dynamic = "force-dynamic"

import { ClientForm } from "@/components/client-form"

export default function NewClientPage() {
  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Client</h1>
          <p className="text-muted-foreground">Create a new client profile</p>
        </div>

        <ClientForm />
      </div>
    
  )
}
