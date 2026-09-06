import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { editUrl, shareUrl } from '../lib/urls'
import { listMyMemorials } from '../services/memorialService'
import type { MemorialSummary } from '../types/memorial'
import { AppHeader } from './AppHeader'
import { CopyLinkButton } from './CopyLinkButton'
import { DemoModeBanner } from './DemoModeBanner'
import { SignInPanel } from './SignInPanel'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function MyMemorialsView() {
  const navigate = useNavigate()
  const { user, session, loading: authLoading, authAvailable } = useAuth()
  const [memorials, setMemorials] = useState<MemorialSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMemorials = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const list = await listMyMemorials()
      setMemorials(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memorials')
      setMemorials([])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!authLoading && session) loadMemorials()
  }, [authLoading, session, loadMemorials])

  return (
    <div className="screen form-screen">
      <DemoModeBanner />
      <AppHeader />
      <div className="form-content scrollable">
        <header className="form-header">
          <button type="button" className="btn-text back-btn" onClick={() => navigate('/')}>
            ← Home
          </button>
          <h1>My memorials</h1>
        </header>

        {!authAvailable && (
          <div className="empty-state">
            <span className="paw-icon large">🐾</span>
            <p>Sign-in is available when Supabase is connected.</p>
            <Link to="/" className="btn-secondary">Back to home</Link>
          </div>
        )}

        {authAvailable && authLoading && (
          <p className="loading-hint">Loading…</p>
        )}

        {authAvailable && !authLoading && !user && (
          <div className="my-sign-in">
            <SignInPanel />
            <p className="auth-hint">
              Family can still open share links without signing in.
            </p>
          </div>
        )}

        {user && loading && <p className="loading-hint">Loading your memorials…</p>}

        {user && !loading && error && (
          <div className="empty-state">
            <span className="paw-icon large">🐾</span>
            <h2>Could not load memorials</h2>
            <p className="form-error">{error}</p>
            <Link to="/create" className="btn-call">Create a memorial</Link>
          </div>
        )}

        {user && !loading && !error && memorials.length === 0 && (
          <div className="empty-state">
            <span className="paw-icon large">🐾</span>
            <h2>No memorials yet — create one</h2>
            <p>
              Memorials you create while signed in appear here. You can also sign in after
              creating one to claim it from this browser.
            </p>
            <Link to="/create" className="btn-call">Create a memorial</Link>
          </div>
        )}

        {user && !loading && memorials.length > 0 && (
          <ul className="memorial-list">
            {memorials.map((m) => (
              <li key={m.id} className="memorial-card">
                <div className="memorial-card-header">
                  <h2>{m.title}</h2>
                  <time className="memorial-date" dateTime={m.createdAt}>
                    {formatDate(m.createdAt)}
                  </time>
                </div>
                {m.note && <p className="memorial-note-preview">{m.note}</p>}
                <div className="memorial-card-actions">
                  <CopyLinkButton label="Copy share link" url={shareUrl(m.shareId)} />
                  <CopyLinkButton
                    label="Copy edit link"
                    url={editUrl(m.editToken)}
                    className="btn-text link-btn"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(`/edit/${m.editToken}`)}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
