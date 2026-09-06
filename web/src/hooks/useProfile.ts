import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PROFILE, type DogProfile } from '../types'

const PROFILE_KEY = 'memorial-call-profile'
const ONBOARDING_KEY = 'memorial-call-onboarding-complete'

function readProfile(): DogProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_PROFILE
}

function readOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true'
}

export function useProfile() {
  const [profile, setProfileState] = useState<DogProfile>(readProfile)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(
    readOnboardingComplete,
  )

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }, [profile])

  const setProfile = useCallback((next: DogProfile) => {
    setProfileState(next)
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setHasCompletedOnboarding(true)
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY)
    setHasCompletedOnboarding(false)
  }, [])

  return {
    profile,
    setProfile,
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
  }
}
