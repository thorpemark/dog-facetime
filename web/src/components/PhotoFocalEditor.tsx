import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FOCAL_X,
  DEFAULT_FOCAL_Y,
  type FocalPoint,
  normalizeFocal,
} from '../utils/focalPoint'

interface PhotoFocalEditorProps {
  imageUrl: string
  initialFocal?: FocalPoint
  onSave: (focal: FocalPoint) => void | Promise<void>
  onClose: () => void
  saving?: boolean
}

interface ImageBounds {
  left: number
  top: number
  width: number
  height: number
}

function computeContainBounds(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): ImageBounds {
  const containerRatio = containerWidth / containerHeight
  const imageRatio = imageWidth / imageHeight

  if (imageRatio > containerRatio) {
    const width = containerWidth
    const height = containerWidth / imageRatio
    return {
      left: 0,
      top: (containerHeight - height) / 2,
      width,
      height,
    }
  }

  const height = containerHeight
  const width = containerHeight * imageRatio
  return {
    left: (containerWidth - width) / 2,
    top: 0,
    width,
    height,
  }
}

function pointerToFocal(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  bounds: ImageBounds,
): FocalPoint {
  const localX = clientX - rect.left - bounds.left
  const localY = clientY - rect.top - bounds.top
  const x = localX / bounds.width
  const y = localY / bounds.height
  return {
    focalX: normalizeFocal(x),
    focalY: normalizeFocal(y),
  }
}

export function PhotoFocalEditor({
  imageUrl,
  initialFocal,
  onSave,
  onClose,
  saving = false,
}: PhotoFocalEditorProps) {
  const [focal, setFocal] = useState<FocalPoint>(
    initialFocal ?? { focalX: DEFAULT_FOCAL_X, focalY: DEFAULT_FOCAL_Y },
  )
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    setFocal(initialFocal ?? { focalX: DEFAULT_FOCAL_X, focalY: DEFAULT_FOCAL_Y })
  }, [imageUrl, initialFocal])

  const refreshImageBounds = useCallback(() => {
    const canvas = canvasRef.current
    const image = canvas?.querySelector('img')
    if (!canvas || !image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    setImageBounds(
      computeContainBounds(
        rect.width,
        rect.height,
        image.naturalWidth,
        image.naturalHeight,
      ),
    )
  }, [])

  useEffect(() => {
    refreshImageBounds()
    window.addEventListener('resize', refreshImageBounds)
    return () => window.removeEventListener('resize', refreshImageBounds)
  }, [imageUrl, refreshImageBounds])

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect || !imageBounds || imageBounds.width === 0 || imageBounds.height === 0) {
        return
      }
      setFocal(pointerToFocal(clientX, clientY, rect, imageBounds))
    },
    [imageBounds],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      updateFromPointer(event.clientX, event.clientY)
    },
    [updateFromPointer],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingRef.current) return
      updateFromPointer(event.clientX, event.clientY)
    },
    [updateFromPointer],
  )

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const positionStyle = `${focal.focalX * 100}% ${focal.focalY * 100}%`

  return (
    <div className="focal-editor-backdrop" onClick={onClose}>
      <div
        className="focal-editor"
        role="dialog"
        aria-labelledby="focal-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="focal-editor-header">
          <h2 id="focal-editor-title">Set focus point</h2>
          <button type="button" className="focal-editor-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="focal-editor-lead">
          Tap or drag on the photo to choose what stays centered in portrait calls.
        </p>

        <div className="focal-editor-layout">
          <div
            ref={canvasRef}
            className="focal-editor-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              onLoad={refreshImageBounds}
            />
            {imageBounds && (
              <div
                className="focal-image-frame"
                style={{
                  left: `${imageBounds.left}px`,
                  top: `${imageBounds.top}px`,
                  width: `${imageBounds.width}px`,
                  height: `${imageBounds.height}px`,
                }}
              >
                <div
                  className="focal-crosshair"
                  style={{
                    left: `${focal.focalX * 100}%`,
                    top: `${focal.focalY * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          <div className="focal-preview-panel">
            <p className="focal-preview-label">Call preview</p>
            <div
              className="focal-preview-frame"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: positionStyle,
              }}
            />
          </div>
        </div>

        <div className="focal-editor-actions">
          <button type="button" className="btn-text" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setFocal({ focalX: DEFAULT_FOCAL_X, focalY: DEFAULT_FOCAL_Y })
            }
            disabled={saving}
          >
            Reset center
          </button>
          <button
            type="button"
            className="btn-call focal-save-btn"
            disabled={saving}
            onClick={() => void onSave(focal)}
          >
            {saving ? 'Saving…' : 'Save focus'}
          </button>
        </div>
      </div>
    </div>
  )
}
