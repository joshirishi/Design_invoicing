import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ReconciliationLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-muted rounded mb-2" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><div className="h-5 w-40 bg-muted rounded" /></CardHeader>
            <CardContent>
              <div className="h-28 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="h-5 w-48 bg-muted rounded" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded" />
                  <div className="h-8 w-28 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><div className="h-5 w-32 bg-muted rounded" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
