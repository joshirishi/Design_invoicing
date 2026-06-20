// Stack Auth client — only initialised when env vars are present.
// Returns null when Stack Auth is not configured (local dev without keys).
export async function getStackApp() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  if (!projectId) return null

  const { StackServerApp } = await import("@stackframe/stack")
  return new StackServerApp({
    projectId,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  })
}
