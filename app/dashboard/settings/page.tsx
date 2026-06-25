import { sql } from "@/lib/db"
import { ProfileForm } from "@/components/profile-form"
import { GSTCredentialsForm } from "@/components/gst-credentials-form"
import { TeamSettings } from "@/components/team-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, CreditCard, Shield, Users } from "lucide-react"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  let profile = null
  let members: any[] = []
  try {
    const orgId = await getCurrentOrgId()
    const [profileRows, membersRows] = await Promise.all([
      sql`SELECT * FROM profiles WHERE org_id = ${orgId} LIMIT 1`,
      sql`SELECT * FROM org_members WHERE org_id = ${orgId} ORDER BY created_at ASC`,
    ])
    profile = profileRows[0] || null
    members = membersRows
  } catch {
    // DB not initialised yet — show empty forms
  }

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your profile, bank details, and GST configuration</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="gst" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">GST</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileForm profile={profile} section="profile" />
          </TabsContent>

          <TabsContent value="bank" className="mt-6">
            <ProfileForm profile={profile} section="bank" />
          </TabsContent>

          <TabsContent value="gst" className="mt-6">
            <div className="space-y-6 max-w-2xl">
              <ProfileForm profile={profile} section="tax" />
              <GSTCredentialsForm />
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamSettings members={members} />
          </TabsContent>
        </Tabs>
      </div>
    
  )
}
