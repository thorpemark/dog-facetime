import type { CSSProperties } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import {
  objectPositionStyle,
  transformOriginStyle,
} from '../utils/focalPoint'

function photoLayerWrapperStyle(
  opacity: number,
  transition: string,
): CSSProperties {
  return { opacity, transition }
}

function photoLayerMediaStyle(
  focalX: number,
  focalY: number,
): CSSProperties {
  const focal = { focalX, focalY }
  return {
    objectPosition: objectPositionStyle(focal),
    transformOrigin: transformOriginStyle(focal),
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
          className="photo-layer"
          style={photoLayerWrapperStyle(primaryOpacity, transition)}
        >
          <img
            className={`photo-layer-media motion-${primaryMotion}`}
            src={primaryPhoto.url}
            alt=""
            draggable={false}
            style={photoLayerMediaStyle(
              primaryPhoto.focalX,
              primaryPhoto.focalY,
            )}
          />
        </div>
        {secondaryPhoto?.url && (
          <div
            key={`secondary-${secondaryPhoto.url}-${secondaryMotionKey}`}
            className="photo-layer"
            style={photoLayerWrapperStyle(secondaryOpacity, transition)}
          >
            <img
              className={`photo-layer-media motion-${secondaryMotion}`}
              src={secondaryPhoto.url}
              alt=""
              draggable={false}
              style={photoLayerMediaStyle(
                secondaryPhoto.focalX,
                secondaryPhoto.focalY,
              )}
            />
          </div>
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
