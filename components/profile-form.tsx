"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"
import type { Profile } from "@/lib/types"

interface ProfileFormProps {
  profile: Profile | null
  section?: "profile" | "bank" | "tax"
}

export function ProfileForm({ profile, section = "profile" }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    gstin: profile?.gstin || "",
    pan_no: profile?.pan_no || "",
    bank_name: profile?.bank_name || "",
    account_name: profile?.account_name || "",
    account_number: profile?.account_number || "",
    ifsc_code: profile?.ifsc_code || "",
    swift_code: profile?.swift_code || "",
    branch: profile?.branch || "",
    bank_address: profile?.bank_address || "",
  })

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!profile?.id) {
        await fetchFromAPI("/api/profile", { method: "POST", body: JSON.stringify(formData) })
      } else {
        await fetchFromAPI("/api/profile", {
          method: "PUT",
          body: JSON.stringify({ id: profile.id, ...formData }),
        })
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {section === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Appears on your invoices as the service provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={formData.full_name} onChange={set("full_name")} placeholder="Rishikesh Joshi" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={set("email")} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea id="address" value={formData.address} onChange={set("address")} placeholder="Flat No, Street, City, State, PIN" rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {section === "tax" && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Details</CardTitle>
            <CardDescription>GSTIN and PAN printed on every invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin" value={formData.gstin}
                  onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  placeholder="27AGSPJ2168A1ZF" maxLength={15}
                />
                <p className="text-xs text-muted-foreground">15-character GST Identification Number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_no">PAN Number</Label>
                <Input
                  id="pan_no" value={formData.pan_no}
                  onChange={(e) => setFormData((p) => ({ ...p, pan_no: e.target.value.toUpperCase() }))}
                  placeholder="AGSPJ2168A" maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {section === "bank" && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>Printed at the bottom of every invoice for client payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input id="bank_name" value={formData.bank_name} onChange={set("bank_name")} placeholder="ICICI Bank" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input id="account_name" value={formData.account_name} onChange={set("account_name")} placeholder="Rishikesh Joshi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input id="account_number" value={formData.account_number} onChange={set("account_number")} placeholder="056901504485" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code" value={formData.ifsc_code}
                  onChange={(e) => setFormData((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="ICIC0000570"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" value={formData.branch} onChange={set("branch")} placeholder="Hinjewadi Phase 1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swift_code">Swift Code</Label>
                <Input id="swift_code" value={formData.swift_code} onChange={set("swift_code")} placeholder="ICICINBB (optional)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_address">Bank Branch Address</Label>
              <Textarea id="bank_address" value={formData.bank_address} onChange={set("bank_address")} placeholder="Full branch address" rows={2} />
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {success && (
        <p className="text-sm text-green-600 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Saved successfully
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
