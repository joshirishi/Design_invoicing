import { Card, CardContent } from "@/components/ui/card"

export default function InvoicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-56 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-muted rounded" />
          <div className="h-9 w-32 bg-muted rounded" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="flex-1 h-4 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
