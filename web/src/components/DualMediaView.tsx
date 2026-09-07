import type { CSSProperties } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'

export function DualMediaView() {
  const { mediaPlayback } = useMemorialCall()
  const {
    mode,
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
    idleAnimationMs,
    crossfadeMs,
  } = mediaPlayback

  const transition = `opacity ${crossfadeMs}ms ease-in-out`
  const kenBurnsStyle = {
    '--ken-burns-idle-duration': `${idleAnimationMs}ms`,
  } as CSSProperties

  if (mode === 'photos') {
    return (
      <div className="dual-video dual-media" style={kenBurnsStyle}>
        <div
          key={`primary-${primaryPhotoUrl}-${primaryMotionKey}`}
          className={`photo-layer motion-${primaryMotion}`}
          style={{
            opacity: primaryOpacity,
            transition,
            backgroundImage: primaryPhotoUrl
              ? `url(${primaryPhotoUrl})`
              : undefined,
          }}
        />
        {secondaryPhotoUrl && (
          <div
            key={`secondary-${secondaryPhotoUrl}-${secondaryMotionKey}`}
            className={`photo-layer motion-${secondaryMotion}`}
            style={{
              opacity: secondaryOpacity,
              transition,
              backgroundImage: `url(${secondaryPhotoUrl})`,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="dual-video">
      <video
        ref={primaryRef}
        className="video-layer"
        playsInline
        muted
        style={{ opacity: primaryOpacity, transition }}
      />
      <video
        ref={secondaryRef}
        className="video-layer"
        playsInline
        muted
        style={{ opacity: secondaryOpacity, transition }}
      />
    </div>
  )
}
