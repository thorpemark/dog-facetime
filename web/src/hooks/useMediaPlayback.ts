import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeywordRulesConfig } from '../types'
import type { MotionPreset } from '../types/memorial'
import { clipUrl } from '../utils/keywordRules'
import {
  IDLE_CROSSFADE_MS,
  REACTION_CROSSFADE_MS,
  REACTION_DURATION_MS,
  photoIndexForReaction,
  presetForRule,
} from '../utils/reactionPresets'

const CROSSFADE_MS = 400

export function useMediaPlayback(
  photoUrls: string[],
  rulesConfig: KeywordRulesConfig | null,
) {
  const usePhotos = photoUrls.length > 0

  const primaryRef = useRef<HTMLVideoElement>(null)
  const secondaryRef = useRef<HTMLVideoElement>(null)

  const [primaryOpacity, setPrimaryOpacity] = useState(1)
  const [secondaryOpacity, setSecondaryOpacity] = useState(0)
  const [currentClipId, setCurrentClipId] = useState('idle')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [activePhotoSlot, setActivePhotoSlot] = useState<'primary' | 'secondary'>(
    'primary',
  )
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(
    photoUrls[0] ?? null,
  )
  const [secondaryPhotoUrl, setSecondaryPhotoUrl] = useState<string | null>(null)
  const [primaryMotion, setPrimaryMotion] = useState<MotionPreset>('idle')
  const [secondaryMotion, setSecondaryMotion] = useState<MotionPreset>('idle')

  const activeSlotRef = useRef<'primary' | 'secondary'>('primary')
  const isPlayingReactionRef = useRef(false)
  const onCompleteRef = useRef<(() => void) | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const reactionTimerRef = useRef<number | null>(null)

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

  const crossfadePhotosTo = useCallback((slot: 'primary' | 'secondary') => {
    setActivePhotoSlot(slot)
    if (slot === 'primary') {
      setPrimaryOpacity(1)
      setSecondaryOpacity(0)
    } else {
      setPrimaryOpacity(0)
      setSecondaryOpacity(1)
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current)
    idleTimerRef.current = null
    reactionTimerRef.current = null
  }, [])

  const scheduleIdleCycle = useCallback(() => {
    if (!usePhotos || photoUrls.length <= 1 || isPlayingReactionRef.current) return
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)

    idleTimerRef.current = window.setTimeout(() => {
      if (isPlayingReactionRef.current) return
      const nextIndex = (photoIndex + 1) % photoUrls.length
      const incoming = activePhotoSlot === 'primary' ? 'secondary' : 'primary'

      if (incoming === 'secondary') {
        setSecondaryPhotoUrl(photoUrls[nextIndex])
        setSecondaryMotion('idle')
        crossfadePhotosTo('secondary')
      } else {
        setPrimaryPhotoUrl(photoUrls[nextIndex])
        setPrimaryMotion('idle')
        crossfadePhotosTo('primary')
      }
      setPhotoIndex(nextIndex)
      scheduleIdleCycle()
    }, IDLE_CROSSFADE_MS)
  }, [activePhotoSlot, crossfadePhotosTo, photoIndex, photoUrls, usePhotos])

  const loadIdle = useCallback(() => {
    clearTimers()
    isPlayingReactionRef.current = false
    setCurrentClipId('idle')

    if (usePhotos) {
      setPhotoIndex(0)
      setPrimaryPhotoUrl(photoUrls[0] ?? null)
      setSecondaryPhotoUrl(null)
      setPrimaryMotion('idle')
      setSecondaryMotion('idle')
      setActivePhotoSlot('primary')
      setPrimaryOpacity(1)
      setSecondaryOpacity(0)
      scheduleIdleCycle()
      return
    }

    if (!rulesConfig) return
    const video = primaryRef.current
    if (!video) return

    video.src = clipUrl(rulesConfig.idleClip)
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
  }, [clearTimers, photoUrls, rulesConfig, scheduleIdleCycle, usePhotos])

  const playPhotoReaction = useCallback(
    (clipId: string, onComplete: () => void) => {
      if (isPlayingReactionRef.current || photoUrls.length === 0) return

      clearTimers()
      isPlayingReactionRef.current = true
      onCompleteRef.current = onComplete
      setCurrentClipId(clipId)

      const preset = presetForRule(clipId)
      const nextIndex = photoIndexForReaction(photoIndex, clipId, photoUrls.length)
      const incoming = activePhotoSlot === 'primary' ? 'secondary' : 'primary'

      if (incoming === 'secondary') {
        setSecondaryPhotoUrl(photoUrls[nextIndex])
        setSecondaryMotion(preset)
        crossfadePhotosTo('secondary')
      } else {
        setPrimaryPhotoUrl(photoUrls[nextIndex])
        setPrimaryMotion(preset)
        crossfadePhotosTo('primary')
      }
      setPhotoIndex(nextIndex)

      reactionTimerRef.current = window.setTimeout(() => {
        const returnIndex = photoIndex
        const returnSlot = activePhotoSlot === 'primary' ? 'secondary' : 'primary'

        if (returnSlot === 'secondary') {
          setSecondaryPhotoUrl(photoUrls[returnIndex])
          setSecondaryMotion('idle')
          crossfadePhotosTo('secondary')
        } else {
          setPrimaryPhotoUrl(photoUrls[returnIndex])
          setPrimaryMotion('idle')
          crossfadePhotosTo('primary')
        }

        setCurrentClipId('idle')
        isPlayingReactionRef.current = false
        onCompleteRef.current?.()
        onCompleteRef.current = null
        scheduleIdleCycle()
      }, REACTION_DURATION_MS)
    },
    [
      activePhotoSlot,
      clearTimers,
      crossfadePhotosTo,
      photoIndex,
      photoUrls,
      scheduleIdleCycle,
    ],
  )

  const playVideoReaction = useCallback(
    (clipId: string, onComplete: () => void) => {
      if (!rulesConfig || isPlayingReactionRef.current) return
      const rule = rulesConfig.rules.find((r) => r.id === clipId)
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
        if (!rulesConfig) return

        const idleSlot =
          activeSlotRef.current === 'primary' ? 'secondary' : 'primary'
        const idleVideo =
          idleSlot === 'primary' ? primaryRef.current : secondaryRef.current
        if (!idleVideo) return

        idleVideo.loop = true
        idleVideo.src = clipUrl(rulesConfig.idleClip)

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
    [crossfadeTo, rulesConfig],
  )

  const playReaction = useCallback(
    (clipId: string, onComplete: () => void) => {
      if (usePhotos) {
        playPhotoReaction(clipId, onComplete)
      } else {
        playVideoReaction(clipId, onComplete)
      }
    },
    [playPhotoReaction, playVideoReaction, usePhotos],
  )

  const stop = useCallback(() => {
    clearTimers()
    primaryRef.current?.pause()
    secondaryRef.current?.pause()
    isPlayingReactionRef.current = false
    onCompleteRef.current = null
  }, [clearTimers])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  useEffect(() => {
    if (usePhotos && photoUrls.length > 0) {
      setPrimaryPhotoUrl(photoUrls[0])
      setPhotoIndex(0)
    }
  }, [photoUrls, usePhotos])

  return {
    mode: usePhotos ? ('photos' as const) : ('video' as const),
    primaryRef,
    secondaryRef,
    primaryOpacity,
    secondaryOpacity,
    primaryPhotoUrl,
    secondaryPhotoUrl,
    primaryMotion,
    secondaryMotion,
    currentClipId,
    crossfadeMs: usePhotos ? REACTION_CROSSFADE_MS : CROSSFADE_MS,
    loadIdle,
    playReaction,
    stop,
  }
}
