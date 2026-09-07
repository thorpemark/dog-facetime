import type { CSSProperties } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import {
  photoLayerCoverStyle,
  photoLayerMediaStyle,
} from '../utils/focalPoint'

function photoLayerWrapperStyle(
  opacity: number,
  transition: string,
): CSSProperties {
  return { opacity, transition }
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
          <div
            className="photo-layer-cover"
            style={photoLayerCoverStyle(primaryPhoto)}
          >
            <img
              className={`photo-layer-media motion-${primaryMotion}`}
              src={primaryPhoto.url}
              alt=""
              draggable={false}
              style={photoLayerMediaStyle(primaryPhoto)}
            />
          </div>
        </div>
        {secondaryPhoto?.url && (
          <div
            key={`secondary-${secondaryPhoto.url}-${secondaryMotionKey}`}
            className="photo-layer"
            style={photoLayerWrapperStyle(secondaryOpacity, transition)}
          >
            <div
              className="photo-layer-cover"
              style={photoLayerCoverStyle(secondaryPhoto)}
            >
              <img
                className={`photo-layer-media motion-${secondaryMotion}`}
                src={secondaryPhoto.url}
                alt=""
                draggable={false}
                style={photoLayerMediaStyle(secondaryPhoto)}
              />
            </div>
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
