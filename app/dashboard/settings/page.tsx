import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileForm } from "@/components/profile-form"
import { GSTCredentialsForm } from "@/components/gst-credentials-form"

export default async function SettingsPage() {
  const profile = await sql`SELECT * FROM profiles LIMIT 1`.then((rows) => rows[0] || null)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and business information</p>
        </div>

        <GSTCredentialsForm />

        <ProfileForm profile={profile} />
      </div>
    </DashboardLayout>
  )
}
