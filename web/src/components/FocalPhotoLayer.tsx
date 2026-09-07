import { useCallback, useState } from 'react'
import type { MotionPreset } from '../types/memorial'
import type { FocalFrame } from '../utils/focalPoint'
import {
  photoLayerCoverStyle,
  photoLayerMediaStyle,
} from '../utils/focalPoint'

interface FocalPhotoLayerProps {
  imageUrl: string
  focal: FocalFrame
  /** Known image aspect (width/height); refined on image load when omitted. */
  imageAspect?: number
  className?: string
  motionClassName?: string
}

/** Renders a focal-framed photo with letterboxed portrait playback. */
export function FocalPhotoLayer({
  imageUrl,
  focal,
  imageAspect: imageAspectProp,
  className,
  motionClassName,
}: FocalPhotoLayerProps) {
  const [loadedAspect, setLoadedAspect] = useState<number | null>(null)

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setLoadedAspect(image.naturalWidth / image.naturalHeight)
      }
    },
    [],
  )

  const aspect = imageAspectProp ?? loadedAspect ?? 1

  return (
    <div className={className}>
      <div
        className="photo-layer-cover"
        style={photoLayerCoverStyle(focal, aspect)}
      >
        <img
          className={motionClassName}
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={handleLoad}
          style={photoLayerMediaStyle(focal, aspect)}
        />
      </div>
    </div>
  )
}

export type { MotionPreset }
