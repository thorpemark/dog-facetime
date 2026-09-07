import type { CSSProperties } from 'react'
import { useMemorialCall } from '../context/MemorialCallContext'
import { FocalPhotoLayer } from './FocalPhotoLayer'

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
          <FocalPhotoLayer
            imageUrl={primaryPhoto.url}
            focal={primaryPhoto}
            motionClassName={`photo-layer-media motion-${primaryMotion}`}
          />
        </div>
        {secondaryPhoto?.url && (
          <div
            key={`secondary-${secondaryPhoto.url}-${secondaryMotionKey}`}
            className="photo-layer"
            style={photoLayerWrapperStyle(secondaryOpacity, transition)}
          >
            <FocalPhotoLayer
              imageUrl={secondaryPhoto.url}
              focal={secondaryPhoto}
              motionClassName={`photo-layer-media motion-${secondaryMotion}`}
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
