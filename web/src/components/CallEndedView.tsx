import { useMemorialCall } from '../context/MemorialCallContext'

export function CallEndedView() {
  const { returnToIdleAfterEnd } = useMemorialCall()

  return (
    <div className="screen ended-screen">
      <span className="ended-icon">📞</span>
      <h2>Call Ended</h2>
      <button type="button" className="btn-primary" onClick={returnToIdleAfterEnd}>
        Done
      </button>
    </div>
  )
}
