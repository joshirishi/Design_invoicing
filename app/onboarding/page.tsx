"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { fetchFromAPI } from "@/lib/fetch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"

const STEPS = ["Business", "Tax & Bank", "Done"] as const
type Step = (typeof STEPS)[number]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("Business")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", address: "",
    gstin: "", pan_no: "",
    bank_name: "", account_name: "", account_number: "", ifsc_code: "",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleFinish = async () => {
    setSaving(true)
    try {
      // Upsert profile for this org
      await fetchFromAPI("/api/profile", {
        method: "POST",
        body: JSON.stringify(form),
      })
      router.push("/dashboard")
    } catch (err) {
      console.error("Onboarding save failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">InvoiceFlow</span>
          </div>
          <h1 className="text-2xl font-semibold">Welcome! Let&apos;s set up your account</h1>
          <p className="text-muted-foreground text-sm">This takes about 2 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                i < stepIdx ? "bg-primary border-primary text-primary-foreground" :
                i === stepIdx ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
              }`}>
                {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === stepIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {step === "Business" && (
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>This will appear on every invoice you create</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your Full Name *</Label>
                  <Input id="name" value={form.full_name} onChange={set("full_name")} placeholder="Rishikesh Joshi" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-email">Email</Label>
                  <Input id="ob-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-phone">Phone</Label>
                  <Input id="ob-phone" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-address">Business Address</Label>
                <Textarea id="ob-address" value={form.address} onChange={set("address")} placeholder="Street, City, State, PIN" rows={2} />
              </div>
              <Button className="w-full" onClick={() => setStep("Tax & Bank")} disabled={!form.full_name}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "Tax & Bank" && (
          <Card>
            <CardHeader>
              <CardTitle>Tax & Bank Details</CardTitle>
              <CardDescription>For GST invoices and receiving payments. You can update these later in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>GSTIN</Label>
                  <Input value={form.gstin}
                    onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    placeholder="27AGSPJ2168A1ZF" maxLength={15} />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN Number</Label>
                  <Input value={form.pan_no}
                    onChange={(e) => setForm((p) => ({ ...p, pan_no: e.target.value.toUpperCase() }))}
                    placeholder="AGSPJ2168A" maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={set("bank_name")} placeholder="ICICI Bank" />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Holder Name</Label>
                  <Input value={form.account_name} onChange={set("account_name")} placeholder="Rishikesh Joshi" />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Number</Label>
                  <Input value={form.account_number} onChange={set("account_number")} placeholder="056901504485" />
                </div>
                <div className="space-y-1.5">
                  <Label>IFSC Code</Label>
                  <Input value={form.ifsc_code}
                    onChange={(e) => setForm((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                    placeholder="ICIC0000570" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("Business")} className="flex-1">Back</Button>
                <Button onClick={() => setStep("Done")} className="flex-1">
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "Done" && (
          <Card className="text-center">
            <CardHeader>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <CardTitle>You&apos;re all set!</CardTitle>
              <CardDescription>Your business profile is ready. Let&apos;s create your first invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleFinish} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Go to Dashboard"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
