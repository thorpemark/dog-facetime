import { useCallback, useRef, useState } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import {
  KEN_BURNS_SPEED_PRESETS,
  type KenBurnsSpeed,
} from '../utils/kenBurnsSpeed'

const SWIPE_THRESHOLD_PX = 48

export function PhotoPlaybackControls() {
  const {
    mediaPlayback,
    kenBurnsSpeed,
    setKenBurnsSpeed,
  } = useMemorialCall()
  const {
    mode,
    photoCount,
    canNavigatePhotos,
    goToNextPhoto,
    goToPrevPhoto,
  } = mediaPlayback

  const [navVisible, setNavVisible] = useState(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressTapRef = useRef(false)

  const showNavBriefly = useCallback(() => {
    setNavVisible(true)
    window.setTimeout(() => setNavVisible(false), 4_000)
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (mode !== 'photos') return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    suppressTapRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [mode])

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (mode !== 'photos' || !pointerStartRef.current) return

      const deltaX = event.clientX - pointerStartRef.current.x
      const deltaY = event.clientY - pointerStartRef.current.y
      pointerStartRef.current = null

      if (
        canNavigatePhotos &&
        Math.abs(deltaX) > SWIPE_THRESHOLD_PX &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        suppressTapRef.current = true
        if (deltaX < 0) {
          goToNextPhoto()
        } else {
          goToPrevPhoto()
        }
        showNavBriefly()
        return
      }

      if (!suppressTapRef.current && photoCount > 1) {
        setNavVisible((visible) => !visible)
      }
    },
    [
      canNavigatePhotos,
      goToNextPhoto,
      goToPrevPhoto,
      mode,
      photoCount,
      showNavBriefly,
    ],
  )

  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = null
  }, [])

  if (mode !== 'photos' || photoCount === 0) return null

  const speedOptions = Object.entries(KEN_BURNS_SPEED_PRESETS) as Array<
    [KenBurnsSpeed, { label: string }]
  >

  return (
    <>
      <div
        className="photo-touch-layer"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {photoCount > 1 && (
        <div
          className={`photo-nav-row ${navVisible ? 'visible' : ''}`}
          aria-label="Photo navigation"
        >
          <button
            type="button"
            className="photo-nav-btn"
            onClick={goToPrevPhoto}
            disabled={!canNavigatePhotos}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="photo-nav-btn"
            onClick={goToNextPhoto}
            disabled={!canNavigatePhotos}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}

      <div
        className="ken-burns-speed-control"
        role="group"
        aria-label="Ken Burns speed"
      >
        {speedOptions.map(([value, preset]) => (
          <button
            key={value}
            type="button"
            className={`speed-btn ${kenBurnsSpeed === value ? 'active' : ''}`}
            onClick={() => setKenBurnsSpeed(value)}
            aria-pressed={kenBurnsSpeed === value}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </>
  )
}
