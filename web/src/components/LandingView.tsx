import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoModeBanner } from './DemoModeBanner'
import { appPath } from '../lib/urls'

export function LandingView() {
  const navigate = useNavigate()
  const [linkInput, setLinkInput] = useState('')

  const openLink = () => {
    const trimmed = linkInput.trim()
    if (!trimmed) return

    try {
      const url = new URL(trimmed, window.location.origin)
      const path = url.pathname
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const relative = path.startsWith(base) ? path.slice(base.length) : path
      if (relative.startsWith('/m/')) {
        navigate(relative)
        return
      }
    } catch {
      /* not a full URL */
    }

    const shareId = trimmed.replace(/^\/m\//, '').split('/')[0]
    if (shareId) {
      navigate(appPath(`/m/${shareId}`))
    }
  }

  return (
    <div className="screen landing-screen">
      <DemoModeBanner />
      <div className="landing-content">
        <div className="landing-hero">
          <span className="paw-icon large">🐾</span>
          <h1>Memorial Call</h1>
          <p className="landing-subtitle">
            Create a gentle FaceTime-style memorial for a beloved dog. Share a
            link with family — no account needed.
          </p>
        </div>

        <button
          type="button"
          className="btn-call"
          onClick={() => navigate(appPath('/create'))}
        >
          <span className="btn-icon">✨</span>
          Create a Memorial
        </button>

        <div className="open-link-section">
          <p className="section-label">Open a link</p>
          <div className="open-link-row">
            <input
              type="text"
              placeholder="Paste share link or ID"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openLink()}
            />
            <button type="button" className="btn-secondary" onClick={openLink}>
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
