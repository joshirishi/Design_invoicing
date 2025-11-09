"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

interface InvoiceStatusChartProps {
  data: Array<{ status: string; count: number; color: string }>
}

export function InvoiceStatusChart({ data }: InvoiceStatusChartProps) {
  const totalInvoices = data.reduce((sum, item) => sum + item.count, 0)

  if (totalInvoices === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No invoice data available yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">{payload[0].name}</span>
                        <span className="font-bold text-foreground">{payload[0].value} invoices</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.status}</span>
            </div>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
