import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FOCAL_X,
  DEFAULT_FOCAL_Y,
  DEFAULT_FOCAL_ZOOM,
  computeContainBounds,
  defaultFocalFrameForImage,
  focalFrameFromCenterAndZoom,
  focalFrameFromValues,
  frameRectFromFocal,
  hasCustomFocalFrame,
  isLandscapeImage,
  maxFocalZoom,
  type FocalFrame,
  type ImageBounds,
} from '../utils/focalPoint'
import { FocalCallPreview } from './FocalCallPreview'

interface PhotoFocalEditorProps {
  imageUrl: string
  initialFocal?: FocalFrame
  onSave: (focal: FocalFrame) => void | Promise<void>
  onClose: () => void
  saving?: boolean
  /** Hint wider default framing for together / group shots. */
  preferWideFrame?: boolean
}

export function PhotoFocalEditor({
  imageUrl,
  initialFocal,
  onSave,
  onClose,
  saving = false,
  preferWideFrame = false,
}: PhotoFocalEditorProps) {
  const [focal, setFocal] = useState<FocalFrame>(
    initialFocal ?? {
      focalX: DEFAULT_FOCAL_X,
      focalY: DEFAULT_FOCAL_Y,
      focalZoom: DEFAULT_FOCAL_ZOOM,
    },
  )
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const [imageAspect, setImageAspect] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const panOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setFocal(
      initialFocal ?? {
        focalX: DEFAULT_FOCAL_X,
        focalY: DEFAULT_FOCAL_Y,
        focalZoom: DEFAULT_FOCAL_ZOOM,
      },
    )
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

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget
      const aspect = image.naturalWidth / image.naturalHeight
      setImageAspect(aspect)
      refreshImageBounds()

      if (!initialFocal || !hasCustomFocalFrame(initialFocal)) {
        setFocal(defaultFocalFrameForImage(aspect, preferWideFrame))
      }
    },
    [initialFocal, preferWideFrame, refreshImageBounds],
  )

  useEffect(() => {
    refreshImageBounds()
    window.addEventListener('resize', refreshImageBounds)
    return () => window.removeEventListener('resize', refreshImageBounds)
  }, [imageUrl, refreshImageBounds])

  const updateFromPan = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageBounds) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const centerX =
        (clientX - rect.left - imageBounds.left - panOffsetRef.current.x) /
        imageBounds.width
      const centerY =
        (clientY - rect.top - imageBounds.top - panOffsetRef.current.y) /
        imageBounds.height

      setFocal((current) =>
        focalFrameFromCenterAndZoom(
          centerX,
          centerY,
          current.focalZoom,
          imageAspect,
        ),
      )
    },
    [imageAspect, imageBounds],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!imageBounds) return
      const frameRect = frameRectFromFocal(focal, imageBounds, imageAspect)
      const insideFrame =
        event.clientX >= frameRect.left &&
        event.clientX <= frameRect.left + frameRect.width &&
        event.clientY >= frameRect.top &&
        event.clientY <= frameRect.top + frameRect.height

      if (!insideFrame) return

      event.currentTarget.setPointerCapture(event.pointerId)
      isDraggingRef.current = true
      panOffsetRef.current = {
        x: event.clientX - (frameRect.left + frameRect.width / 2),
        y: event.clientY - (frameRect.top + frameRect.height / 2),
      }
      updateFromPan(event.clientX, event.clientY)
    },
    [focal, imageAspect, imageBounds, updateFromPan],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDraggingRef.current) return
      updateFromPan(event.clientX, event.clientY)
    },
    [updateFromPan],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleZoomChange = useCallback(
    (value: number) => {
      setFocal((current) =>
        focalFrameFromCenterAndZoom(
          current.focalX,
          current.focalY,
          value,
          imageAspect,
        ),
      )
    },
    [imageAspect],
  )

  const handleReset = useCallback(() => {
    setFocal(defaultFocalFrameForImage(imageAspect, false))
  }, [imageAspect])

  const frameRect =
    imageBounds ? frameRectFromFocal(focal, imageBounds, imageAspect) : null
  const maxZoom = maxFocalZoom(imageAspect)
  const showWideHint = preferWideFrame || isLandscapeImage(imageAspect)

  return (
    <div className="focal-editor-backdrop" onClick={onClose}>
      <div
        className="focal-editor"
        role="dialog"
        aria-labelledby="focal-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="focal-editor-header">
          <h2 id="focal-editor-title">Frame portrait crop</h2>
          <button type="button" className="focal-editor-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="focal-editor-lead">
          {showWideHint
            ? 'Drag the frame to pan. Zoom out to widen the crop and letterbox for two-shots.'
            : 'Drag the portrait frame to choose what fills the call screen. Zoom out to reveal more.'}
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
              onLoad={handleImageLoad}
            />
            {frameRect && (
              <div
                className="focal-crop-frame"
                style={{
                  left: `${frameRect.left}px`,
                  top: `${frameRect.top}px`,
                  width: `${frameRect.width}px`,
                  height: `${frameRect.height}px`,
                }}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="focal-preview-panel">
            <p className="focal-preview-label">Call preview</p>
            <FocalCallPreview
              imageUrl={imageUrl}
              focal={focal}
              imageAspect={imageAspect}
            />
          </div>
        </div>

        <label
          className="focal-zoom-control"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>Zoom out</span>
          <input
            type="range"
            min={DEFAULT_FOCAL_ZOOM}
            max={maxZoom}
            step={0.01}
            value={focal.focalZoom}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
            onInput={(event) =>
              handleZoomChange(Number((event.target as HTMLInputElement).value))
            }
            aria-label="Zoom out to include more of the photo"
          />
          <span className="focal-zoom-value">{focal.focalZoom.toFixed(2)}×</span>
        </label>

        <div className="focal-editor-actions">
          <button type="button" className="btn-text" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            Reset frame
          </button>
          <button
            type="button"
            className="btn-call focal-save-btn"
            disabled={saving}
            onClick={() =>
              void onSave(
                focalFrameFromValues(focal.focalX, focal.focalY, focal.focalZoom),
              )
            }
          >
            {saving ? 'Saving…' : 'Save frame'}
          </button>
        </div>
      </div>
    </div>
  )
}
