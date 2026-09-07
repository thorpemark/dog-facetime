import { useCallback, useEffect, useRef, useState } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import {
  KEN_BURNS_SPEED_PRESETS,
  type KenBurnsSpeed,
} from '../utils/kenBurnsSpeed'

const SWIPE_THRESHOLD_PX = 48
const DRAWER_COLLAPSE_MS = 3_000

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
  const [speedDrawerOpen, setSpeedDrawerOpen] = useState(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressTapRef = useRef(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<number | null>(null)

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }, [])

  const closeSpeedDrawer = useCallback(() => {
    clearCollapseTimer()
    setSpeedDrawerOpen(false)
  }, [clearCollapseTimer])

  const scheduleDrawerCollapse = useCallback(() => {
    clearCollapseTimer()
    collapseTimerRef.current = window.setTimeout(() => {
      setSpeedDrawerOpen(false)
      collapseTimerRef.current = null
    }, DRAWER_COLLAPSE_MS)
  }, [clearCollapseTimer])

  const openSpeedDrawer = useCallback(() => {
    setSpeedDrawerOpen(true)
    scheduleDrawerCollapse()
  }, [scheduleDrawerCollapse])

  const handleSpeedSelect = useCallback(
    (value: KenBurnsSpeed) => {
      setKenBurnsSpeed(value)
      scheduleDrawerCollapse()
    },
    [scheduleDrawerCollapse, setKenBurnsSpeed],
  )

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

  useEffect(() => {
    if (!speedDrawerOpen) return

    const handleOutside = (event: PointerEvent) => {
      if (drawerRef.current?.contains(event.target as Node)) return
      closeSpeedDrawer()
    }

    window.addEventListener('pointerdown', handleOutside)
    return () => window.removeEventListener('pointerdown', handleOutside)
  }, [closeSpeedDrawer, speedDrawerOpen])

  useEffect(() => {
    return () => clearCollapseTimer()
  }, [clearCollapseTimer])

  if (mode !== 'photos' || photoCount === 0) return null

  const speedOptions = Object.entries(KEN_BURNS_SPEED_PRESETS) as Array<
    [KenBurnsSpeed, { label: string }]
  >
  const activeLabel = KEN_BURNS_SPEED_PRESETS[kenBurnsSpeed].label

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
        ref={drawerRef}
        className={`ken-burns-speed-drawer ${speedDrawerOpen ? 'open' : ''}`}
      >
        <button
          type="button"
          className="ken-burns-speed-tab"
          aria-expanded={speedDrawerOpen}
          aria-controls="ken-burns-speed-options"
          aria-label={
            speedDrawerOpen
              ? `Ken Burns speed: ${activeLabel}. Collapse speed menu.`
              : `Ken Burns speed: ${activeLabel}. Expand speed menu.`
          }
          onClick={() => {
            if (speedDrawerOpen) {
              closeSpeedDrawer()
            } else {
              openSpeedDrawer()
            }
          }}
        >
          <span className="ken-burns-speed-tab-icon" aria-hidden="true">
            {speedDrawerOpen ? '›' : '‹'}
          </span>
          <span className="ken-burns-speed-tab-label">{activeLabel}</span>
        </button>

        <div
          id="ken-burns-speed-options"
          className="ken-burns-speed-panel"
          role="group"
          aria-label="Ken Burns speed"
          hidden={!speedDrawerOpen}
        >
          {speedOptions.map(([value, preset]) => (
            <button
              key={value}
              type="button"
              className={`speed-btn ${kenBurnsSpeed === value ? 'active' : ''}`}
              onClick={() => handleSpeedSelect(value)}
              aria-pressed={kenBurnsSpeed === value}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
