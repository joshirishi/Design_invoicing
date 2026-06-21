import { NextResponse } from "next/server"

const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com"

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID

  // Stack Auth not configured — treat as authenticated in open mode
  if (!projectId) {
    return NextResponse.json({
      authenticated: true,
      user: { id: "local", email: ALLOWED_EMAIL, displayName: "Rishikesh Joshi" },
    })
  }

  try {
    const { StackServerApp } = await import("@stackframe/stack")
    const stackServerApp = new StackServerApp({
      projectId,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    })

    const user = await stackServerApp.getUser()

    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })

    if (user.email !== ALLOWED_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
