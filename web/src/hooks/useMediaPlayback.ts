import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeywordRulesConfig } from '../types'
import type { MotionPreset } from '../types/memorial'
import { clipUrl } from '../utils/keywordRules'
import { MANUAL_NAV_PAUSE_MS } from '../utils/kenBurnsSpeed'
import {
  REACTION_CROSSFADE_MS,
  REACTION_DURATION_MS,
  photoIndexForReaction,
  presetForRule,
} from '../utils/reactionPresets'

const CROSSFADE_MS = 400

interface UseMediaPlaybackOptions {
  crossfadeIntervalMs: number
  idleAnimationMs: number
}

export function useMediaPlayback(
  photoUrls: string[],
  rulesConfig: KeywordRulesConfig | null,
  options: UseMediaPlaybackOptions = {
    crossfadeIntervalMs: 5_000,
    idleAnimationMs: 12_000,
  },
) {
  const { crossfadeIntervalMs, idleAnimationMs } = options
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
  const [primaryMotionKey, setPrimaryMotionKey] = useState(0)
  const [secondaryMotionKey, setSecondaryMotionKey] = useState(0)
  const [isReactionPlaying, setIsReactionPlaying] = useState(false)

  const activeSlotRef = useRef<'primary' | 'secondary'>('primary')
  const photoIndexRef = useRef(0)
  const activePhotoSlotRef = useRef<'primary' | 'secondary'>('primary')
  const isPlayingReactionRef = useRef(false)
  const onCompleteRef = useRef<(() => void) | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const reactionTimerRef = useRef<number | null>(null)
  const photoUrlsRef = useRef(photoUrls)
  const crossfadeIntervalRef = useRef(crossfadeIntervalMs)
  const prevCrossfadeIntervalRef = useRef(crossfadeIntervalMs)

  photoUrlsRef.current = photoUrls
  crossfadeIntervalRef.current = crossfadeIntervalMs
  photoIndexRef.current = photoIndex
  activePhotoSlotRef.current = activePhotoSlot

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
    activePhotoSlotRef.current = slot
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

  const bumpMotionKey = useCallback((slot: 'primary' | 'secondary') => {
    if (slot === 'primary') {
      setPrimaryMotionKey((key) => key + 1)
    } else {
      setSecondaryMotionKey((key) => key + 1)
    }
  }, [])

  const showPhotoAtIndex = useCallback(
    (
      nextIndex: number,
      motion: MotionPreset = 'idle',
      options?: { restartMotion?: boolean },
    ) => {
      const urls = photoUrlsRef.current
      if (urls.length === 0) return

      const normalized =
        ((nextIndex % urls.length) + urls.length) % urls.length
      const incoming =
        activePhotoSlotRef.current === 'primary' ? 'secondary' : 'primary'

      if (incoming === 'secondary') {
        setSecondaryPhotoUrl(urls[normalized])
        setSecondaryMotion(motion)
        if (options?.restartMotion) bumpMotionKey('secondary')
        crossfadePhotosTo('secondary')
      } else {
        setPrimaryPhotoUrl(urls[normalized])
        setPrimaryMotion(motion)
        if (options?.restartMotion) bumpMotionKey('primary')
        crossfadePhotosTo('primary')
      }

      photoIndexRef.current = normalized
      setPhotoIndex(normalized)
    },
    [bumpMotionKey, crossfadePhotosTo],
  )

  const scheduleIdleCycle = useCallback(
    (delayMs = crossfadeIntervalRef.current) => {
      const urls = photoUrlsRef.current
      if (!usePhotos || urls.length <= 1 || isPlayingReactionRef.current) return
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)

      idleTimerRef.current = window.setTimeout(() => {
        if (isPlayingReactionRef.current) return
        const nextIndex = (photoIndexRef.current + 1) % urls.length
        showPhotoAtIndex(nextIndex, 'idle', { restartMotion: true })
        scheduleIdleCycleRef.current()
      }, delayMs)
    },
    [showPhotoAtIndex, usePhotos],
  )

  const scheduleIdleCycleRef = useRef(scheduleIdleCycle)
  scheduleIdleCycleRef.current = scheduleIdleCycle

  const goToPhoto = useCallback(
    (nextIndex: number) => {
      if (!usePhotos || photoUrlsRef.current.length === 0) return
      if (isPlayingReactionRef.current) return

      clearTimers()
      showPhotoAtIndex(nextIndex, 'idle', { restartMotion: true })
      if (photoUrlsRef.current.length > 1) {
        scheduleIdleCycle(MANUAL_NAV_PAUSE_MS)
      }
    },
    [clearTimers, scheduleIdleCycle, showPhotoAtIndex, usePhotos],
  )

  const goToNextPhoto = useCallback(() => {
    goToPhoto(photoIndexRef.current + 1)
  }, [goToPhoto])

  const goToPrevPhoto = useCallback(() => {
    goToPhoto(photoIndexRef.current - 1)
  }, [goToPhoto])

  const loadIdle = useCallback(() => {
    clearTimers()
    isPlayingReactionRef.current = false
    setIsReactionPlaying(false)
    setCurrentClipId('idle')

    if (usePhotos) {
      photoIndexRef.current = 0
      activePhotoSlotRef.current = 'primary'
      setPhotoIndex(0)
      setPrimaryPhotoUrl(photoUrls[0] ?? null)
      setSecondaryPhotoUrl(null)
      setPrimaryMotion('idle')
      setSecondaryMotion('idle')
      setPrimaryMotionKey(0)
      setSecondaryMotionKey(0)
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
      if (isPlayingReactionRef.current || photoUrlsRef.current.length === 0) return

      clearTimers()
      isPlayingReactionRef.current = true
      setIsReactionPlaying(true)
      onCompleteRef.current = onComplete
      setCurrentClipId(clipId)

      const preset = presetForRule(clipId)
      const nextIndex = photoIndexForReaction(
        photoIndexRef.current,
        clipId,
        photoUrlsRef.current.length,
      )
      const returnIndex = photoIndexRef.current

      showPhotoAtIndex(nextIndex, preset, { restartMotion: true })

      reactionTimerRef.current = window.setTimeout(() => {
        showPhotoAtIndex(returnIndex, 'idle', { restartMotion: true })
        setCurrentClipId('idle')
        isPlayingReactionRef.current = false
        setIsReactionPlaying(false)
        onCompleteRef.current?.()
        onCompleteRef.current = null
        scheduleIdleCycle()
      }, REACTION_DURATION_MS)
    },
    [clearTimers, scheduleIdleCycle, showPhotoAtIndex],
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
      setIsReactionPlaying(true)
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
          setIsReactionPlaying(false)
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
    setIsReactionPlaying(false)
    onCompleteRef.current = null
  }, [clearTimers])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  useEffect(() => {
    if (usePhotos && photoUrls.length > 0) {
      setPrimaryPhotoUrl(photoUrls[0])
      photoIndexRef.current = 0
      setPhotoIndex(0)
    }
  }, [photoUrls, usePhotos])

  useEffect(() => {
    if (prevCrossfadeIntervalRef.current === crossfadeIntervalMs) return
    prevCrossfadeIntervalRef.current = crossfadeIntervalMs

    if (!usePhotos || photoUrls.length <= 1 || isPlayingReactionRef.current) return
    if (!idleTimerRef.current) return

    scheduleIdleCycle()
  }, [crossfadeIntervalMs, photoUrls.length, scheduleIdleCycle, usePhotos])

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
    primaryMotionKey,
    secondaryMotionKey,
    currentClipId,
    photoIndex,
    photoCount: photoUrls.length,
    canNavigatePhotos: usePhotos && photoUrls.length > 1 && !isReactionPlaying,
    isReactionPlaying,
    idleAnimationMs,
    crossfadeMs: usePhotos ? REACTION_CROSSFADE_MS : CROSSFADE_MS,
    loadIdle,
    playReaction,
    stop,
    goToNextPhoto,
    goToPrevPhoto,
  }
}
