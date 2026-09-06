import { useMemorialCall } from '../context/MemorialCallContext'
import { useState } from 'react'

export function OnboardingView() {
  const { profile, setProfile, completeOnboarding } = useMemorialCall()
  const [dogName, setDogName] = useState(profile.dogName)
  const [ownerName, setOwnerName] = useState(profile.ownerName)
  const [memorialNote, setMemorialNote] = useState(profile.memorialNote)

  const handleContinue = () => {
    setProfile({ dogName: dogName.trim() || 'Biscuit', ownerName: ownerName.trim() || 'Alex', memorialNote: memorialNote.trim() })
    completeOnboarding()
  }

  return (
    <div className="screen onboarding-screen">
      <header className="onboarding-header">
        <span className="paw-icon">🐾</span>
        <h1>Memorial Call</h1>
      </header>

      <p className="onboarding-intro">
        Create a gentle space to remember your companion. Their video will loop
        quietly, responding when you speak familiar words.
      </p>

      <form
        className="onboarding-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleContinue()
        }}
      >
        <fieldset>
          <legend>Your Companion</legend>
          <label>
            Dog&apos;s name
            <input
              type="text"
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Biscuit"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>About You</legend>
          <label>
            Your name
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Alex"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Memorial Note</legend>
          <label>
            A short note (optional)
            <textarea
              value={memorialNote}
              onChange={(e) => setMemorialNote(e.target.value)}
              rows={3}
              placeholder="Forever in our hearts…"
            />
          </label>
        </fieldset>

        <button type="submit" className="btn-primary">
          Continue
        </button>
      </form>
    </div>
  )
}
