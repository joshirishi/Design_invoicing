"use client"
// Handles the OAuth redirect from Google (and any future OAuth provider).
// Supabase PKCE flow: the code verifier lives in localStorage (browser),
// so the exchange MUST happen client-side.
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase-auth"
import { Loader2, FileText } from "lucide-react"

function CallbackHandler() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const code  = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      setStatus("error")
      setMessage(searchParams.get("error_description") || "Authentication was cancelled or failed.")
      return
    }

    if (!code) {
      router.replace("/dashboard") // already signed in via magic link / implicit
      return
    }

    const supabase = createBrowserClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus("error")
        setMessage(error.message)
      } else {
        router.replace("/dashboard")
      }
    })
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
          <FileText className="w-6 h-6 text-white" />
        </div>

        {status === "loading" ? (
          <>
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-300 text-sm">Signing you in…</p>
          </>
        ) : (
          <>
            <p className="text-red-400 font-medium mb-2">Sign-in failed</p>
            <p className="text-slate-400 text-sm mb-4">{message}</p>
            <a href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm underline">
              Back to login
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
