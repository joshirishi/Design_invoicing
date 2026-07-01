import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function NewInvoiceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><div className="h-5 w-28 bg-muted rounded" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-muted rounded mb-2" />
                  <div className="h-9 w-full bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="h-5 w-24 bg-muted rounded" /></CardHeader>
            <CardContent>
              <div className="h-32 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><div className="h-5 w-20 bg-muted rounded" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              ))}
              <div className="h-9 w-full bg-muted rounded mt-4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
