import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  params: { token: string }
}

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = params

  const rows = await sql`
    SELECT om.*, o.name as org_name
    FROM org_members om
    JOIN organizations o ON om.org_id = o.id
    WHERE om.invite_token = ${token} AND om.status = 'pending'
    LIMIT 1
  `

  if (rows.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>This invite link is no longer valid. Please ask the account owner to send a new invite.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard"><Button variant="outline" className="w-full">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invite = rows[0]

  // Accept the invite — mark as active
  await sql`
    UPDATE org_members SET status = 'active', invite_token = NULL
    WHERE id = ${invite.id}
  `

  redirect("/dashboard")
}
