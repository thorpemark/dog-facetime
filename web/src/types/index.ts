export interface DogProfile {
  dogName: string
  ownerName: string
  memorialNote: string
}

export const DEFAULT_PROFILE: DogProfile = {
  dogName: 'Biscuit',
  ownerName: 'Alex',
  memorialNote: '',
}

export type CallPhase = 'onboarding' | 'home' | 'incoming' | 'active' | 'ended'

export type BehaviorState =
  | { type: 'idle' }
  | { type: 'listen' }
  | { type: 'react'; clipId: string }
  | { type: 'cooldown' }

export interface KeywordRule {
  id: string
  phrases: string[]
  clipFileName: string
  priority: number
  description?: string
}

export interface KeywordRulesConfig {
  version: number
  idleClip: string
  rules: KeywordRule[]
}
