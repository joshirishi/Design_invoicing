import { StackServerApp } from "@stackframe/stack"
import { redirect } from "next/navigation"

const stackServerApp = new StackServerApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
})

const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com"

export async function checkAuth() {
  try {
    const user = await stackServerApp.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    if (user.email !== ALLOWED_EMAIL) {
      // User authenticated but not authorized
      redirect("/auth/login")
    }

    return user
  } catch (error) {
    redirect("/auth/login")
  }
}
