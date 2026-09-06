import { useCallback, useRef, useState } from 'react'
import type { KeywordRulesConfig } from '../types'
import { clipUrl } from '../utils/keywordRules'

const CROSSFADE_MS = 400

export function useVideoMixer(config: KeywordRulesConfig | null) {
  const primaryRef = useRef<HTMLVideoElement>(null)
  const secondaryRef = useRef<HTMLVideoElement>(null)

  const [primaryOpacity, setPrimaryOpacity] = useState(1)
  const [secondaryOpacity, setSecondaryOpacity] = useState(0)
  const [currentClipId, setCurrentClipId] = useState('idle')

  const activeSlotRef = useRef<'primary' | 'secondary'>('primary')
  const onCompleteRef = useRef<(() => void) | null>(null)
  const isPlayingReactionRef = useRef(false)

  const getActiveVideo = useCallback(() => {
    return activeSlotRef.current === 'primary'
      ? primaryRef.current
      : secondaryRef.current
  }, [])

  const getInactiveVideo = useCallback(() => {
    return activeSlotRef.current === 'primary'
      ? secondaryRef.current
      : primaryRef.current
  }, [])

  const crossfadeTo = useCallback((slot: 'primary' | 'secondary') => {
    if (slot === 'primary') {
      setPrimaryOpacity(1)
      setSecondaryOpacity(0)
    } else {
      setPrimaryOpacity(0)
      setSecondaryOpacity(1)
    }
    activeSlotRef.current = slot
  }, [])

  const setupLoop = useCallback((video: HTMLVideoElement) => {
    const onEnded = () => {
      video.currentTime = 0
      void video.play()
    }
    video.addEventListener('ended', onEnded)
    return () => video.removeEventListener('ended', onEnded)
  }, [])

  const loadIdle = useCallback(() => {
    if (!config) return
    const video = primaryRef.current
    if (!video) return

    isPlayingReactionRef.current = false
    setCurrentClipId('idle')
    video.src = clipUrl(config.idleClip)
    video.loop = true
    void video.play()
    activeSlotRef.current = 'primary'
    setPrimaryOpacity(1)
    setSecondaryOpacity(0)

    const secondary = secondaryRef.current
    if (secondary) {
      secondary.pause()
      secondary.removeAttribute('src')
    }
  }, [config])

  const playReaction = useCallback(
    (clipId: string, onComplete: () => void) => {
      if (!config || isPlayingReactionRef.current) return
      const rule = config.rules.find((r) => r.id === clipId)
      if (!rule) return

      const incomingSlot =
        activeSlotRef.current === 'primary' ? 'secondary' : 'primary'
      const incomingVideo =
        incomingSlot === 'primary' ? primaryRef.current : secondaryRef.current
      if (!incomingVideo) return

      isPlayingReactionRef.current = true
      onCompleteRef.current = onComplete
      setCurrentClipId(clipId)

      incomingVideo.loop = false
      incomingVideo.src = clipUrl(rule.clipFileName)

      const onEnded = () => {
        incomingVideo.removeEventListener('ended', onEnded)
        if (!config) return

        const idleSlot =
          activeSlotRef.current === 'primary' ? 'secondary' : 'primary'
        const idleVideo =
          idleSlot === 'primary' ? primaryRef.current : secondaryRef.current
        if (!idleVideo) return

        idleVideo.loop = true
        idleVideo.src = clipUrl(config.idleClip)

        const onIdleReady = () => {
          idleVideo.removeEventListener('canplay', onIdleReady)
          void idleVideo.play()
          crossfadeTo(idleSlot)
          setCurrentClipId('idle')
          isPlayingReactionRef.current = false
          onCompleteRef.current?.()
          onCompleteRef.current = null
        }
        idleVideo.addEventListener('canplay', onIdleReady)
        idleVideo.load()
      }

      const onCanPlay = () => {
        incomingVideo.removeEventListener('canplay', onCanPlay)
        void incomingVideo.play()
        crossfadeTo(incomingSlot)
        incomingVideo.addEventListener('ended', onEnded)
      }

      incomingVideo.addEventListener('canplay', onCanPlay)
      incomingVideo.load()
    },
    [config, crossfadeTo],
  )

  const stop = useCallback(() => {
    primaryRef.current?.pause()
    secondaryRef.current?.pause()
    isPlayingReactionRef.current = false
    onCompleteRef.current = null
  }, [])

  return {
    primaryRef,
    secondaryRef,
    primaryOpacity,
    secondaryOpacity,
    currentClipId,
    crossfadeMs: CROSSFADE_MS,
    loadIdle,
    playReaction,
    stop,
    setupLoop,
    getActiveVideo,
    getInactiveVideo,
  }
}
