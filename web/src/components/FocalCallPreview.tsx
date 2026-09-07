import type { DisplayOrientation, FocalFrame } from '../utils/focalPoint'
import { FocalPhotoLayer } from './FocalPhotoLayer'

interface FocalCallPreviewProps {
  imageUrl: string
  focal: FocalFrame
  /** Pass when known so preview matches before image load. */
  imageAspect?: number
  displayOrientation?: DisplayOrientation
}

/** Live preview using the same framed layout as the call screen. */
export function FocalCallPreview({
  imageUrl,
  focal,
  imageAspect,
  displayOrientation = 'portrait',
}: FocalCallPreviewProps) {
  const previewClass =
    displayOrientation === 'landscape'
      ? 'focal-preview-frame focal-preview-frame--landscape'
      : 'focal-preview-frame'

  return (
    <div className={previewClass} aria-hidden="true">
      <FocalPhotoLayer
        imageUrl={imageUrl}
        focal={focal}
        imageAspect={imageAspect}
        displayOrientation={displayOrientation}
        motionClassName="photo-layer-media focal-preview-media"
      />
    </div>
  )
}
