import type { FocalFrame } from '../utils/focalPoint'
import { photoLayerCoverStyle, photoLayerMediaStyle } from '../utils/focalPoint'

interface FocalCallPreviewProps {
  imageUrl: string
  focal: FocalFrame
}

/** Live portrait preview using the same framed cover layout as the call screen. */
export function FocalCallPreview({ imageUrl, focal }: FocalCallPreviewProps) {
  return (
    <div className="focal-preview-frame" aria-hidden="true">
      <div className="focal-preview-cover" style={photoLayerCoverStyle(focal)}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={photoLayerMediaStyle(focal)}
        />
      </div>
    </div>
  )
}
