import type { CSSProperties } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import {
  backgroundPositionStyle,
  transformOriginStyle,
} from '../utils/focalPoint'

function photoLayerStyle(
  photoUrl: string | undefined,
  focalX: number,
  focalY: number,
  opacity: number,
  transition: string,
): CSSProperties {
  return {
    opacity,
    transition,
    backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
    backgroundPosition: backgroundPositionStyle({ focalX, focalY }),
    transformOrigin: transformOriginStyle({ focalX, focalY }),
    '--focal-x': `${focalX * 100}%`,
    '--focal-y': `${focalY * 100}%`,
  } as CSSProperties
}

export function DualMediaView() {
  const { mediaPlayback } = useMemorialCall()
  const {
    mode,
    primaryRef,
    secondaryRef,
    primaryOpacity,
    secondaryOpacity,
    primaryPhoto,
    secondaryPhoto,
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
          key={`primary-${primaryPhoto.url}-${primaryMotionKey}`}
          className={`photo-layer motion-${primaryMotion}`}
          style={photoLayerStyle(
            primaryPhoto.url,
            primaryPhoto.focalX,
            primaryPhoto.focalY,
            primaryOpacity,
            transition,
          )}
        />
        {secondaryPhoto?.url && (
          <div
            key={`secondary-${secondaryPhoto.url}-${secondaryMotionKey}`}
            className={`photo-layer motion-${secondaryMotion}`}
            style={photoLayerStyle(
              secondaryPhoto.url,
              secondaryPhoto.focalX,
              secondaryPhoto.focalY,
              secondaryOpacity,
              transition,
            )}
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
