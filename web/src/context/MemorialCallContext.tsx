import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useKeywordSpotter } from '../hooks/useKeywordSpotter'
import { useProfile } from '../hooks/useProfile'
import { useVideoMixer } from '../hooks/useVideoMixer'
import type {
  BehaviorState,
  CallPhase,
  DogProfile,
  KeywordRulesConfig,
} from '../types'
import { loadKeywordRules } from '../utils/keywordRules'

interface MemorialCallContextValue {
  profile: DogProfile
  setProfile: (profile: DogProfile) => void
  hasCompletedOnboarding: boolean
  completeOnboarding: () => void
  resetOnboarding: () => void
  callPhase: CallPhase
  behaviorState: BehaviorState
  isMuted: boolean
  showDebugPanel: boolean
  setShowDebugPanel: (show: boolean) => void
  rulesConfig: KeywordRulesConfig | null
  lastTranscript: string
  speechSupported: boolean
  speechError: string | null
  videoMixer: ReturnType<typeof useVideoMixer>
  beginIncomingCall: () => void
  acceptCall: () => void
  endCall: () => void
  returnToIdleAfterEnd: () => void
  toggleMute: () => void
  triggerReaction: (clipId: string) => void
  triggerPhrase: (phrase: string) => void
}

const MemorialCallContext = createContext<MemorialCallContextValue | null>(null)

export function MemorialCallProvider({ children }: { children: ReactNode }) {
  const profileState = useProfile()
  const [callPhase, setCallPhase] = useState<CallPhase>('onboarding')
  const [behaviorState, setBehaviorState] = useState<BehaviorState>({
    type: 'idle',
  })
  const [isMuted, setIsMuted] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [rulesConfig, setRulesConfig] = useState<KeywordRulesConfig | null>(
    null,
  )

  const cooldownRef = useRef<number | null>(null)
  const callPhaseRef = useRef(callPhase)
  const behaviorStateRef = useRef(behaviorState)
  const isMutedRef = useRef(isMuted)

  callPhaseRef.current = callPhase
  behaviorStateRef.current = behaviorState
  isMutedRef.current = isMuted

  const enterCooldown = useCallback(() => {
    setBehaviorState({ type: 'cooldown' })
    if (cooldownRef.current) window.clearTimeout(cooldownRef.current)
    cooldownRef.current = window.setTimeout(() => {
      if (callPhaseRef.current !== 'active') return
      setBehaviorState({ type: 'listen' })
    }, 800)
  }, [])

  const triggerReactionRef = useRef<(clipId: string) => void>(() => {})

  const keywordSpotter = useKeywordSpotter((ruleId) => {
    triggerReactionRef.current(ruleId)
  })

  const videoMixer = useVideoMixer(rulesConfig)

  const startListening = useCallback(() => {
    if (
      !rulesConfig ||
      isMutedRef.current ||
      callPhaseRef.current !== 'active'
    ) {
      return
    }
    keywordSpotter.startListening(
      rulesConfig.rules,
      profileState.profile.dogName,
      profileState.profile.ownerName,
    )
    setBehaviorState({ type: 'listen' })
  }, [keywordSpotter, profileState.profile, rulesConfig])

  const triggerReaction = useCallback(
    (clipId: string) => {
      if (callPhaseRef.current !== 'active') return
      const state = behaviorStateRef.current
      if (state.type === 'react' || state.type === 'cooldown') return

      setBehaviorState({ type: 'react', clipId })
      keywordSpotter.stopListening()
      if ('vibrate' in navigator) navigator.vibrate(30)

      videoMixer.playReaction(clipId, enterCooldown)
    },
    [enterCooldown, keywordSpotter, videoMixer],
  )

  triggerReactionRef.current = triggerReaction

  useEffect(() => {
    loadKeywordRules()
      .then(setRulesConfig)
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    if (behaviorState.type === 'listen' && callPhase === 'active' && !isMuted) {
      startListening()
    }
  }, [behaviorState.type, callPhase, isMuted, startListening])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current)
    }
  }, [])

  const beginIncomingCall = useCallback(() => {
    setCallPhase('incoming')
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100])
  }, [])

  const acceptCall = useCallback(() => {
    setCallPhase('active')
    setBehaviorState({ type: 'idle' })
    videoMixer.loadIdle()
    startListening()
  }, [startListening, videoMixer])

  const endCall = useCallback(() => {
    setCallPhase('ended')
    setBehaviorState({ type: 'idle' })
    keywordSpotter.stopListening()
    videoMixer.stop()
    setShowDebugPanel(false)
    if (cooldownRef.current) window.clearTimeout(cooldownRef.current)
  }, [keywordSpotter, videoMixer])

  const returnToIdleAfterEnd = useCallback(() => {
    setCallPhase('onboarding')
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (next) {
        keywordSpotter.stopListening()
      } else if (callPhaseRef.current === 'active') {
        startListening()
      }
      return next
    })
  }, [keywordSpotter, startListening])

  const value = useMemo<MemorialCallContextValue>(
    () => ({
      ...profileState,
      callPhase,
      behaviorState,
      isMuted,
      showDebugPanel,
      setShowDebugPanel,
      rulesConfig,
      lastTranscript: keywordSpotter.lastTranscript,
      speechSupported: keywordSpotter.speechSupported,
      speechError: keywordSpotter.speechError,
      videoMixer,
      beginIncomingCall,
      acceptCall,
      endCall,
      returnToIdleAfterEnd,
      toggleMute,
      triggerReaction,
      triggerPhrase: keywordSpotter.triggerPhrase,
    }),
    [
      profileState,
      callPhase,
      behaviorState,
      isMuted,
      showDebugPanel,
      rulesConfig,
      keywordSpotter.lastTranscript,
      keywordSpotter.speechSupported,
      keywordSpotter.speechError,
      keywordSpotter.triggerPhrase,
      videoMixer,
      beginIncomingCall,
      acceptCall,
      endCall,
      returnToIdleAfterEnd,
      toggleMute,
      triggerReaction,
    ],
  )

  return (
    <MemorialCallContext.Provider value={value}>
      {children}
    </MemorialCallContext.Provider>
  )
}

export function useMemorialCall() {
  const ctx = useContext(MemorialCallContext)
  if (!ctx) {
    throw new Error('useMemorialCall must be used within MemorialCallProvider')
  }
  return ctx
}
