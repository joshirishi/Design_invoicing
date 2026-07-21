export const dynamic = "force-dynamic"

import { AdvanceTaxView } from "@/components/advance-tax-view"

export default function AdvanceTaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advance Tax</h1>
        <p className="text-muted-foreground">Track your quarterly instalment schedule against a liability estimate you confirm</p>
      </div>
      <AdvanceTaxView />
    </div>
  )
}
