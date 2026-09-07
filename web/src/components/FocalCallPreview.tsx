import type { FocalFrame } from '../utils/focalPoint'
import { FocalPhotoLayer } from './FocalPhotoLayer'

interface FocalCallPreviewProps {
  imageUrl: string
  focal: FocalFrame
  /** Pass when known so preview matches before image load. */
  imageAspect?: number
}

/** Live portrait preview using the same framed layout as the call screen. */
export function FocalCallPreview({
  imageUrl,
  focal,
  imageAspect,
}: FocalCallPreviewProps) {
  return (
    <div className="focal-preview-frame" aria-hidden="true">
      <FocalPhotoLayer
        imageUrl={imageUrl}
        focal={focal}
        imageAspect={imageAspect}
        motionClassName="focal-preview-media"
      />
    </div>
  )
}
