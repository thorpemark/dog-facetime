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
    crossfadeMs,
  } = mediaPlayback

  const transition = `opacity ${crossfadeMs}ms ease-in-out`

  if (mode === 'photos') {
    return (
      <div className="dual-video dual-media">
        <div
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
