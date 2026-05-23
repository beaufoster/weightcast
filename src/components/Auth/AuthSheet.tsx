import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useUI } from '@/store/ui'
import { ph } from '@/lib/analytics'
import { queryClient } from '@/lib/queryClient'

interface Props { user: User | null }

export function AuthSheet({ user }: Props) {
  const { syncSheetOpen, closeSyncSheet, authMode, setAuthMode, showToast } = useUI()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Password recovery — detect recovery URL
  const [isRecovery, setIsRecovery] = useState(false)
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryError, setRecoveryError]       = useState('')
  const [recoveryLoading, setRecoveryLoading]   = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    if (params.get('type') === 'recovery' || hashParams.get('type') === 'recovery') {
      setIsRecovery(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!syncSheetOpen && !isRecovery) return null

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(''); setLoading(true)

    if (authMode === 'forgot') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email)
      setLoading(false)
      if (err) { setError(err.message); return }
      setForgotSent(true)
      ph.capture('password_reset_requested')
      return
    }

    if (authMode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (err) { setError(err.message); return }
      ph.capture('signed_up')
      closeSyncSheet()
      showToast('Account created! Check your email to confirm.')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(err.message); return }
      ph.capture('signed_in_password')
      closeSyncSheet()
      showToast(`Welcome back! Your data is synced.`)
      queryClient.invalidateQueries()
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (recoveryPassword.length < 6) { setRecoveryError('Password must be at least 6 characters.'); return }
    setRecoveryLoading(true); setRecoveryError('')
    const { error: err } = await supabase.auth.updateUser({ password: recoveryPassword })
    setRecoveryLoading(false)
    if (err) { setRecoveryError(err.message); return }
    setIsRecovery(false)
    // Clean recovery params from URL without reload
    const url = new URL(window.location.href)
    url.searchParams.delete('type'); url.searchParams.delete('token_hash')
    window.history.replaceState({}, '', url.toString())
    showToast("Password set! You're now signed in.")
    ph.capture('password_set')
    queryClient.invalidateQueries()
  }

  if (isRecovery) {
    return (
      <div className="sync-overlay show">
        <div className="sync-sheet">
          <button className="sync-close-btn" onClick={() => setIsRecovery(false)}>✕</button>
          <div className="sync-header">
            <div className="sync-lock-ico">🔐</div>
            <h2 className="sync-auth-title">Set Your Password</h2>
            <p className="sync-auth-desc">Choose a new password for your Trimly account.</p>
          </div>
          <form onSubmit={handleSetPassword} className="sync-form">
            <input
              type="password" className="sync-input" placeholder="New password (6+ characters)"
              value={recoveryPassword} onChange={e => setRecoveryPassword(e.target.value)}
              minLength={6} autoFocus
            />
            {recoveryError && <p className="sync-error">{recoveryError}</p>}
            <button type="submit" className="sync-submit-btn" disabled={recoveryLoading}>
              {recoveryLoading ? 'Saving…' : 'Save Password →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const isSignedIn = !!user
  const title = authMode === 'forgot' ? 'Reset Password' : authMode === 'signup' ? 'Create Account' : 'Sign In'
  const btnLabel = authMode === 'forgot' ? 'Send Reset Email →' : authMode === 'signup' ? 'Create Account →' : 'Sign In →'

  return (
    <div className="sync-overlay show" onClick={e => { if (e.target === e.currentTarget) closeSyncSheet() }}>
      <div className="sync-sheet">
        <button className="sync-close-btn" onClick={closeSyncSheet}>✕</button>

        {isSignedIn ? (
          <div className="sync-signed-in">
            <div className="sync-lock-ico">✅</div>
            <h2>You're signed in</h2>
            <p>Your data is backed up to your account.</p>
            <button className="sync-submit-btn sync-outline-btn" onClick={async () => {
              if (!supabase) return
              await supabase.auth.signOut()
              ph.reset()
              closeSyncSheet()
              showToast('Signed out. Your data is saved to your account.')
            }}>Sign Out</button>
          </div>
        ) : (
          <>
            <div className="sync-header">
              <div className="sync-lock-ico">🔐</div>
              <h2 className="sync-auth-title">{title}</h2>
              <p className="sync-auth-desc">
                {authMode === 'forgot'
                  ? "Enter your email and we'll send a reset link."
                  : authMode === 'signup'
                    ? 'Back up your plan and check-ins across all your devices.'
                    : 'Welcome back — your data is waiting.'}
              </p>
            </div>

            {forgotSent ? (
              <div className="sync-forgot-sent">
                <p>✅ Reset link sent! Check your email.</p>
                <button className="sync-mode-toggle" onClick={() => { setForgotSent(false); setAuthMode('signin') }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="sync-form">
                <input
                  id="sync-email" type="email" className="sync-input" placeholder="Email"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required
                />
                {authMode !== 'forgot' && (
                  <input
                    id="sync-password" type="password" className="sync-input"
                    placeholder={authMode === 'signup' ? 'Password (6+ characters)' : 'Password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    required minLength={6}
                  />
                )}
                {error && <p className="sync-error">{error}</p>}
                <button type="submit" className="sync-submit-btn" disabled={loading}>
                  {loading ? (authMode === 'forgot' ? 'Sending…' : authMode === 'signup' ? 'Creating…' : 'Signing in…') : btnLabel}
                </button>
                {authMode === 'signin' && (
                  <button type="button" className="sync-forgot-link" onClick={() => { setAuthMode('forgot'); setError('') }}>
                    Forgot password?
                  </button>
                )}
                <button type="button" className="sync-mode-toggle" onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError(''); setForgotSent(false)
                }}>
                  {authMode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
