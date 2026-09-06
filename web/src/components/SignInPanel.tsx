import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface SignInPanelProps {
  onSuccess?: () => void
  compact?: boolean
}

export function SignInPanel({ onSuccess, compact = false }: SignInPanelProps) {
  const { signInWithEmail, signInWithGoogle, authAvailable } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (!authAvailable) {
    return (
      <p className="auth-hint">
        Sign-in requires Supabase. Connect your project to save memorials to your account.
      </p>
    )
  }

  const sendMagicLink = async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus('sending')
    setMessage(null)
    const { error } = await signInWithEmail(trimmed)
    if (error) {
      setStatus('error')
      setMessage(error)
      return
    }
    setStatus('sent')
    setMessage('Check your email for a sign-in link. It works great on iPhone.')
    onSuccess?.()
  }

  const signInGoogle = async () => {
    setStatus('sending')
    setMessage(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setStatus('error')
      setMessage(error)
    }
  }

  return (
    <div className={`sign-in-panel${compact ? ' compact' : ''}`}>
      <p className="sign-in-lead">
        {compact
          ? 'Sign in to save memorials to your account and recover links anytime.'
          : 'We’ll email you a magic link — no password needed.'}
      </p>

      {status === 'sent' ? (
        <div className="sign-in-sent">
          <span className="sign-in-sent-icon">✉️</span>
          <p>{message}</p>
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              setStatus('idle')
              setMessage(null)
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <label className="sign-in-email-label">
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()}
              disabled={status === 'sending'}
            />
          </label>
          <button
            type="button"
            className="btn-call"
            disabled={!email.trim() || status === 'sending'}
            onClick={sendMagicLink}
          >
            {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <div className="sign-in-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            className="btn-secondary sign-in-google"
            disabled={status === 'sending'}
            onClick={signInGoogle}
          >
            Continue with Google
          </button>
        </>
      )}

      {status === 'error' && message && <p className="form-error">{message}</p>}
    </div>
  )
}
