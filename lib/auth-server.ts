const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com"

export async function validateUserEmail() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID

  if (!projectId) {
    return { authenticated: true, user: { id: "local", email: ALLOWED_EMAIL, displayName: "Rishikesh Joshi" } }
  }

  try {
    const { StackServerApp } = await import("@stackframe/stack")
    const stackServerApp = new StackServerApp({
      projectId,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    })
    const user = await stackServerApp.getUser()

    if (!user) return { authenticated: false, error: "No user session found" }
    if (user.email !== ALLOWED_EMAIL) {
      return { authenticated: false, error: `Access denied. Only ${ALLOWED_EMAIL} can access this application.` }
    }

    return { authenticated: true, user: { id: user.id, email: user.email, displayName: user.displayName } }
  } catch (error) {
    return { authenticated: false, error: error instanceof Error ? error.message : "Authentication failed" }
  }
}
