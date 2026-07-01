import { Card, CardContent } from "@/components/ui/card"

export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-28 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="h-9 w-28 bg-muted rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-2">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-3 w-44 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
