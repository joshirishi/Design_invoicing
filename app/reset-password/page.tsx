"use client"
import { useState, useEffect, Suspense } from "react"
import { createBrowserClient } from "@/lib/supabase-auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, FileText, Loader2, CheckCircle } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPw]     = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState(searchParams.get("error") ? "Authentication failed. Please request a new reset link." : "")

  const supabase = createBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match"); return }
    setError(""); setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push("/dashboard"), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">InvoiceFlow</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-white text-xl font-bold">Password updated!</h2>
              <p className="text-slate-400 text-sm mt-2">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
              <p className="text-slate-400 text-sm mb-6">Choose a strong password for your account.</p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      required minLength={6}
                      className="w-full px-4 py-2.5 pr-11 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required minLength={6}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/25 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
