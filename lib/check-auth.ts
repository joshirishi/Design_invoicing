import { redirect } from "next/navigation"

const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com"

// Only enforce Stack Auth when the project ID env var is present.
// Without it the app runs in open mode (matching the existing Vercel deployment).
export async function checkAuth() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID

  if (!projectId) {
    // Stack Auth not configured — skip auth check
    return null
  }

  try {
    const { StackServerApp } = await import("@stackframe/stack")
    const stackServerApp = new StackServerApp({
      projectId,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    })

    const user = await stackServerApp.getUser()

    if (!user || user.email !== ALLOWED_EMAIL) {
      redirect("/auth/login")
    }

    return user
  } catch {
    redirect("/auth/login")
  }
}
