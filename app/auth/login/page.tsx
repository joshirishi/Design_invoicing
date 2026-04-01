'use client'

import { StackProvider, SignIn } from "@stackframe/stack"

export default function LoginPage() {
  return (
    <StackProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Invoice Management
            </h1>
            <p className="text-muted-foreground">
              Sign in with Google to access your invoicing dashboard
            </p>
          </div>
          <SignIn />
        </div>
      </div>
    </StackProvider>
  )
}
