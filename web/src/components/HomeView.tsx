import { useMemorialCall } from '../context/MemorialCallContext'

export function HomeView() {
  const { profile, beginIncomingCall, resetOnboarding, speechSupported } =
    useMemorialCall()

  return (
    <div className="screen home-screen">
      <div className="home-content">
        <div className="home-hero">
          <span className="paw-icon large">🐾</span>
          <h1>{profile.dogName}</h1>
          {profile.memorialNote && (
            <p className="memorial-note">{profile.memorialNote}</p>
          )}
        </div>

        {!speechSupported && (
          <p className="speech-hint">
            Speech recognition isn&apos;t available in this browser. Use the
            debug panel during a call to trigger reactions, or type phrases
            below.
          </p>
        )}

        <button
          type="button"
          className="btn-call"
          onClick={beginIncomingCall}
        >
          <span className="btn-icon">📹</span>
          Start Memorial Call
        </button>

        <button type="button" className="btn-text" onClick={resetOnboarding}>
          Edit Memorial
        </button>
      </div>
    </div>
  )
}
