"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, UserPlus, Trash2, Link2, Loader2, CheckCircle2 } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"

interface Member {
  id: string
  user_id: string | null
  role: string
  invited_email: string | null
  status: string
  created_at: string
}

interface TeamSettingsProps {
  members: Member[]
}

export function TeamSettings({ members: initialMembers }: TeamSettingsProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    try {
      const result = await fetchFromAPI("/api/org/invite", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      })
      setInviteLink(result.invite_link)
      setEmail("")
      router.refresh()
    } catch (err) {
      console.error("Invite failed:", err)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId)
    try {
      await fetchFromAPI(`/api/org/invite?id=${memberId}`, { method: "DELETE" })
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error("Remove failed:", err)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Team Member</CardTitle>
          <CardDescription>
            They&apos;ll receive a link to join your organization and access all invoices and clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-32 space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
            {inviting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : "Send Invite"}
          </Button>

          {inviteLink && (
            <div className="rounded-md bg-muted p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Invite created! Share this link:
              </p>
              <div className="flex gap-2">
                <Input readOnly value={inviteLink} className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No team members yet. Invite someone above.</p>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{m.invited_email || m.user_id || "—"}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                      <Badge variant={m.status === "active" ? "default" : "outline"} className="text-xs capitalize">{m.status}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(m.id)}
                    disabled={removing === m.id}
                  >
                    {removing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
