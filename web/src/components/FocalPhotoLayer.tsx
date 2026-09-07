import { useCallback, useState } from 'react'
import type { MotionPreset } from '../types/memorial'
import type { DisplayOrientation, FocalFrame } from '../utils/focalPoint'
import {
  photoLayerCoverStyle,
  photoLayerMediaStyle,
  viewportAspectForOrientation,
} from '../utils/focalPoint'

interface FocalPhotoLayerProps {
  imageUrl: string
  focal: FocalFrame
  /** Known image aspect (width/height); refined on image load when omitted. */
  imageAspect?: number
  /** Call viewport orientation used for letterbox / pillarbox math. */
  displayOrientation?: DisplayOrientation
  className?: string
  motionClassName?: string
}

/** Renders a focal-framed photo with letterbox or pillarbox playback for the active viewport. */
export function FocalPhotoLayer({
  imageUrl,
  focal,
  imageAspect: imageAspectProp,
  displayOrientation = 'portrait',
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
  const viewportAspect = viewportAspectForOrientation(displayOrientation)

  return (
    <div className={className}>
      <div
        className="photo-layer-cover"
        style={photoLayerCoverStyle(focal, aspect, viewportAspect)}
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
