"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Client } from "@/lib/types"
import { INDIAN_STATES } from "@/lib/financial-year"

interface ClientFormProps {
  client?: Client
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name:       client?.name       || "",
    email:      client?.email      || "",
    phone:      client?.phone      || "",
    address:    client?.address    || "",
    gstin:      client?.gstin      || "",
    state_code: client?.state_code || "",
    pan_no:     client?.pan_no     || "",
  })

  const set = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  // Auto-fill state_code from GSTIN — first 2 chars of GSTIN are the state code
  const handleGstinChange = (v: string) => {
    set("gstin", v)
    if (v.length >= 2 && /^\d{2}/.test(v)) {
      const code = v.slice(0, 2)
      if (INDIAN_STATES.find((s) => s.code === code)) {
        set("state_code", code)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const payload = {
        name:       formData.name,
        email:      formData.email      || null,
        phone:      formData.phone      || null,
        address:    formData.address    || null,
        gstin:      formData.gstin      || null,
        state_code: formData.state_code || null,
        pan_no:     formData.pan_no     || null,
      }
      if (client) {
        await fetchFromAPI("/api/clients", { method: "PUT", body: JSON.stringify({ id: client.id, ...payload }) })
      } else {
        await fetchFromAPI("/api/clients", { method: "POST", body: JSON.stringify(payload) })
      }
      router.push("/dashboard/clients")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input id="name" required value={formData.name} onChange={(e) => set("name", e.target.value)} placeholder="Company Name or Individual" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91-1234567890" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address with city, state, and pincode" rows={3} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" value={formData.gstin} onChange={(e) => handleGstinChange(e.target.value)} placeholder="27AAGCC1503R1ZH" maxLength={15} />
                <p className="text-xs text-muted-foreground">State code auto-filled from GSTIN</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_no">PAN</Label>
                <Input id="pan_no" value={formData.pan_no} onChange={(e) => set("pan_no", e.target.value.toUpperCase())} placeholder="AAGCC1503R" maxLength={10} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state_code">State (for GST)</Label>
              <Select value={formData.state_code} onValueChange={(v) => set("state_code", v)}>
                <SelectTrigger id="state_code">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to determine IGST (inter-state) vs CGST+SGST (intra-state) on invoices
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : client ? "Update Client" : "Create Client"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </form>
  )
}
