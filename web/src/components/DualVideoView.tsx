import { useMemorialCall } from '../context/MemorialCallContext'

export function DualVideoView() {
  const { videoMixer } = useMemorialCall()
  const { primaryRef, secondaryRef, primaryOpacity, secondaryOpacity, crossfadeMs } =
    videoMixer

  const transition = `opacity ${crossfadeMs}ms ease-in-out`

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
