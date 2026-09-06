import { useMemorialCall } from '../context/MemorialCallContext'

export function CallControlsView() {
  const { isMuted, toggleMute, endCall, showDebugPanel, setShowDebugPanel } =
    useMemorialCall()

  return (
    <div className="call-controls">
      <button
        type="button"
        className={`control-btn ${isMuted ? 'active' : ''}`}
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        <span>{isMuted ? '🔇' : '🎤'}</span>
        <small>{isMuted ? 'Unmute' : 'Mute'}</small>
      </button>

      <button
        type="button"
        className="control-btn destructive"
        onClick={endCall}
        aria-label="End call"
      >
        <span>📞</span>
        <small>End</small>
      </button>

      <button
        type="button"
        className={`control-btn ${showDebugPanel ? 'active' : ''}`}
        onClick={() => setShowDebugPanel(!showDebugPanel)}
        aria-label="Debug panel"
      >
        <span>🐞</span>
        <small>Debug</small>
      </button>
    </div>
  )
}
