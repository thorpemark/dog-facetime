import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FOCAL_X,
  DEFAULT_FOCAL_Y,
  DEFAULT_FOCAL_ZOOM,
  DEFAULT_FOCAL_ROTATION_DEG,
  FOCAL_ROTATION_STEP,
  MAX_FOCAL_ROTATION_DEG,
  MIN_FOCAL_ROTATION_DEG,
  computeContainBounds,
  canFitFullImage,
  defaultDualFramingForImage,
  defaultFocalFrameForImage,
  editorImageRotationStyle,
  fitFullImageFraming,
  focalFrameFromCenter,
  frameRectFromFocal,
  frameSizeFromFocal,
  hasCustomDualFraming,
  isLandscapeImage,
  normalizeFocalRotationDeg,
  nudgeFocalCenter,
  normalizedFrameRectFromFocal,
  resizeCropRect,
  focalFrameFromNormalizedRect,
  viewportAspectForOrientation,
  type CropResizeHandle,
  type DisplayOrientation,
  type DualFraming,
  type FocalFrame,
  type FrameRect,
  type ImageBounds,
} from '../utils/focalPoint'
import { FocalCallPreview } from './FocalCallPreview'

const TAP_THRESHOLD_PX = 8

const ORIENTATION_TABS: Array<{
  id: DisplayOrientation
  label: string
}> = [
  { id: 'portrait', label: 'Phone portrait' },
  { id: 'landscape', label: 'Landscape / PC' },
]

const CROP_HANDLES: Array<{ handle: CropResizeHandle; className: string; label: string }> = [
  { handle: 'nw', className: 'focal-crop-handle--nw', label: 'Resize top-left' },
  { handle: 'n', className: 'focal-crop-handle--n', label: 'Resize top edge' },
  { handle: 'ne', className: 'focal-crop-handle--ne', label: 'Resize top-right' },
  { handle: 'e', className: 'focal-crop-handle--e', label: 'Resize right edge' },
  { handle: 'se', className: 'focal-crop-handle--se', label: 'Resize bottom-right' },
  { handle: 's', className: 'focal-crop-handle--s', label: 'Resize bottom edge' },
  { handle: 'sw', className: 'focal-crop-handle--sw', label: 'Resize bottom-left' },
  { handle: 'w', className: 'focal-crop-handle--w', label: 'Resize left edge' },
]

interface PhotoFocalEditorProps {
  imageUrl: string
  initialFraming?: DualFraming
  onSave: (framing: DualFraming) => void | Promise<void>
  onClose: () => void
  saving?: boolean
  /** Hint wider default framing for together / group shots. */
  preferWideFrame?: boolean
}

function clientToNormalized(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  imageBounds: ImageBounds,
): { x: number; y: number } | null {
  const localX = clientX - canvasRect.left
  const localY = clientY - canvasRect.top
  if (
    localX < imageBounds.left ||
    localX > imageBounds.left + imageBounds.width ||
    localY < imageBounds.top ||
    localY > imageBounds.top + imageBounds.height
  ) {
    return null
  }

  return {
    x: (localX - imageBounds.left) / imageBounds.width,
    y: (localY - imageBounds.top) / imageBounds.height,
  }
}

function emptyFraming(): DualFraming {
  const frame = {
    focalX: DEFAULT_FOCAL_X,
    focalY: DEFAULT_FOCAL_Y,
    focalZoom: DEFAULT_FOCAL_ZOOM,
  }
  return { portrait: frame, landscape: frame }
}

export function PhotoFocalEditor({
  imageUrl,
  initialFraming,
  onSave,
  onClose,
  saving = false,
  preferWideFrame = false,
}: PhotoFocalEditorProps) {
  const [framing, setFraming] = useState<DualFraming>(initialFraming ?? emptyFraming())
  const [activeOrientation, setActiveOrientation] =
    useState<DisplayOrientation>('portrait')
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const [imageAspect, setImageAspect] = useState(1)
  const [moveFrameMode, setMoveFrameMode] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const didDragRef = useRef(false)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const resizeHandleRef = useRef<CropResizeHandle | null>(null)
  const resizeStartRectRef = useRef<FrameRect | null>(null)

  const viewportAspect = viewportAspectForOrientation(activeOrientation)
  const focal = framing[activeOrientation]

  useEffect(() => {
    setFraming(initialFraming ?? emptyFraming())
    setActiveOrientation('portrait')
  }, [imageUrl, initialFraming])

  const setActiveFocal = useCallback(
    (updater: FocalFrame | ((current: FocalFrame) => FocalFrame)) => {
      setFraming((current) => {
        const orientationFrame = current[activeOrientation]
        const next =
          typeof updater === 'function' ? updater(orientationFrame) : updater
        return {
          ...current,
          [activeOrientation]: next,
        }
      })
    },
    [activeOrientation],
  )

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

      if (!initialFraming || !hasCustomDualFraming(initialFraming, aspect, preferWideFrame)) {
        setFraming(defaultDualFramingForImage(aspect, preferWideFrame))
      }
    },
    [initialFraming, preferWideFrame, refreshImageBounds],
  )

  useEffect(() => {
    refreshImageBounds()
    window.addEventListener('resize', refreshImageBounds)
    return () => window.removeEventListener('resize', refreshImageBounds)
  }, [imageUrl, refreshImageBounds])

  const setFocalFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageBounds) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const point = clientToNormalized(clientX, clientY, rect, imageBounds)
      if (!point) return

      setActiveFocal((current) => {
        const size = frameSizeFromFocal(current, imageAspect, viewportAspect)
        return focalFrameFromCenter(
          point.x,
          point.y,
          size.width,
          size.height,
          imageAspect,
          viewportAspect,
          current.focalRotationDeg ?? DEFAULT_FOCAL_ROTATION_DEG,
        )
      })
    },
    [imageAspect, imageBounds, setActiveFocal, viewportAspect],
  )

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

      setActiveFocal((current) => {
        const size = frameSizeFromFocal(current, imageAspect, viewportAspect)
        return focalFrameFromCenter(
          centerX,
          centerY,
          size.width,
          size.height,
          imageAspect,
          viewportAspect,
          current.focalRotationDeg ?? DEFAULT_FOCAL_ROTATION_DEG,
        )
      })
    },
    [imageAspect, imageBounds, setActiveFocal, viewportAspect],
  )

  const updateFromResize = useCallback(
    (clientX: number, clientY: number) => {
      const handle = resizeHandleRef.current
      const startRect = resizeStartRectRef.current
      if (!handle || !startRect || !imageBounds) return

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const point = clientToNormalized(clientX, clientY, rect, imageBounds)
      if (!point) return

      const nextRect = resizeCropRect(startRect, handle, point.x, point.y)
      setActiveFocal((current) =>
        focalFrameFromNormalizedRect(
          nextRect,
          imageAspect,
          viewportAspect,
          current.focalRotationDeg ?? DEFAULT_FOCAL_ROTATION_DEG,
        ),
      )
    },
    [imageAspect, imageBounds, setActiveFocal, viewportAspect],
  )

  const isInsideImage = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageBounds) return false
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return false
      return clientToNormalized(clientX, clientY, rect, imageBounds) != null
    },
    [imageBounds],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!imageBounds || event.button !== 0) return
      if (!isInsideImage(event.clientX, event.clientY)) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      pointerStartRef.current = { x: event.clientX, y: event.clientY }
      didDragRef.current = false
      isDraggingRef.current = false
      resizeHandleRef.current = null
      resizeStartRectRef.current = null

      if (moveFrameMode) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const frameRect = frameRectFromFocal(
          focal,
          imageBounds,
          imageAspect,
          viewportAspect,
        )
        const frameCenterX = rect.left + frameRect.left + frameRect.width / 2
        const frameCenterY = rect.top + frameRect.top + frameRect.height / 2
        panOffsetRef.current = {
          x: event.clientX - frameCenterX,
          y: event.clientY - frameCenterY,
        }
      }
    },
    [focal, imageAspect, imageBounds, isInsideImage, moveFrameMode, viewportAspect],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!pointerStartRef.current) return

      const dx = event.clientX - pointerStartRef.current.x
      const dy = event.clientY - pointerStartRef.current.y
      const distance = Math.hypot(dx, dy)

      if (resizeHandleRef.current) {
        if (distance < TAP_THRESHOLD_PX) return
        event.preventDefault()
        didDragRef.current = true
        isDraggingRef.current = true
        updateFromResize(event.clientX, event.clientY)
        return
      }

      if (!moveFrameMode) return
      if (!didDragRef.current && distance < TAP_THRESHOLD_PX) return

      event.preventDefault()
      didDragRef.current = true
      isDraggingRef.current = true
      updateFromPan(event.clientX, event.clientY)
    },
    [moveFrameMode, updateFromPan, updateFromResize],
  )

  const endPointerInteraction = useCallback(
    (event: React.PointerEvent) => {
      if (!pointerStartRef.current) return

      if (
        !didDragRef.current &&
        !resizeHandleRef.current &&
        moveFrameMode &&
        isInsideImage(event.clientX, event.clientY)
      ) {
        setFocalFromClient(event.clientX, event.clientY)
      }

      pointerStartRef.current = null
      isDraggingRef.current = false
      didDragRef.current = false
      resizeHandleRef.current = null
      resizeStartRectRef.current = null

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [isInsideImage, moveFrameMode, setFocalFromClient],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      endPointerInteraction(event)
    },
    [endPointerInteraction],
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent) => {
      endPointerInteraction(event)
    },
    [endPointerInteraction],
  )

  const handleHandlePointerDown = useCallback(
    (event: React.PointerEvent, handle: CropResizeHandle) => {
      if (!imageBounds || event.button !== 0) return

      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)

      pointerStartRef.current = { x: event.clientX, y: event.clientY }
      didDragRef.current = false
      isDraggingRef.current = false
      resizeHandleRef.current = handle
      resizeStartRectRef.current = normalizedFrameRectFromFocal(
        focal,
        imageAspect,
        viewportAspect,
      )
    },
    [focal, imageAspect, imageBounds, viewportAspect],
  )

  const handleHandlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!resizeHandleRef.current || !pointerStartRef.current) return

      const dx = event.clientX - pointerStartRef.current.x
      const dy = event.clientY - pointerStartRef.current.y
      if (!didDragRef.current && Math.hypot(dx, dy) < TAP_THRESHOLD_PX) return

      event.preventDefault()
      didDragRef.current = true
      isDraggingRef.current = true
      updateFromResize(event.clientX, event.clientY)
    },
    [updateFromResize],
  )

  const handleHandlePointerUp = useCallback((event: React.PointerEvent) => {
    pointerStartRef.current = null
    isDraggingRef.current = false
    didDragRef.current = false
    resizeHandleRef.current = null
    resizeStartRectRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handleNudge = useCallback(
    (deltaX: number, deltaY: number) => {
      setActiveFocal((current) =>
        nudgeFocalCenter(
          current,
          deltaX,
          deltaY,
          imageAspect,
          viewportAspect,
        ),
      )
    },
    [imageAspect, setActiveFocal, viewportAspect],
  )

  const handleReset = useCallback(() => {
    setFraming((current) => ({
      ...current,
      [activeOrientation]: defaultFocalFrameForImage(
        imageAspect,
        viewportAspect,
        preferWideFrame,
      ),
    }))
  }, [activeOrientation, imageAspect, preferWideFrame, viewportAspect])

  const handleFitFullImage = useCallback(() => {
    setActiveFocal((current) => ({
      ...fitFullImageFraming(imageAspect, viewportAspect),
      focalRotationDeg: current.focalRotationDeg,
    }))
  }, [imageAspect, setActiveFocal, viewportAspect])

  const handleRotationChange = useCallback(
    (value: number) => {
      const rotation = normalizeFocalRotationDeg(value)
      setActiveFocal((current) => ({
        ...current,
        focalRotationDeg:
          rotation === DEFAULT_FOCAL_ROTATION_DEG ? undefined : rotation,
      }))
    },
    [setActiveFocal],
  )

  const handleResetRotation = useCallback(() => {
    setActiveFocal((current) => ({
      ...current,
      focalRotationDeg: undefined,
    }))
  }, [setActiveFocal])

  const rotationDeg = normalizeFocalRotationDeg(
    focal.focalRotationDeg ?? DEFAULT_FOCAL_ROTATION_DEG,
  )
  const showResetRotation = rotationDeg !== DEFAULT_FOCAL_ROTATION_DEG

  const frameRect =
    imageBounds
      ? frameRectFromFocal(focal, imageBounds, imageAspect, viewportAspect)
      : null
  const showWideHint = preferWideFrame || isLandscapeImage(imageAspect)
  const showFitFullImage = canFitFullImage(focal, imageAspect, viewportAspect)
  const crosshairLeft = frameRect
    ? frameRect.left + frameRect.width / 2
    : 0
  const crosshairTop = frameRect
    ? frameRect.top + frameRect.height / 2
    : 0

  return (
    <div className="focal-editor-backdrop" onClick={onClose}>
      <div
        className="focal-editor"
        role="dialog"
        aria-labelledby="focal-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="focal-editor-header">
          <h2 id="focal-editor-title">Frame call crop</h2>
          <button type="button" className="focal-editor-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="focal-editor-lead">
          {showWideHint
            ? 'Set separate crops for phone portrait and landscape/PC. Drag handles to resize, use Move frame to pan or tap to focus, and nudge for fine adjustments.'
            : 'Set separate crops for phone portrait and landscape/PC. Drag handles to resize both axes, pan with Move frame, tap to focus, and nudge for fine adjustments.'}
        </p>

        <div
          className="focal-orientation-tabs"
          role="tablist"
          aria-label="Call viewport orientation"
        >
          {ORIENTATION_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeOrientation === id}
              className={`focal-orientation-tab${activeOrientation === id ? ' focal-orientation-tab--active' : ''}`}
              onClick={() => setActiveOrientation(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="focal-editor-toolbar">
          <button
            type="button"
            className={`focal-move-toggle${moveFrameMode ? ' focal-move-toggle--active' : ''}`}
            aria-pressed={moveFrameMode}
            onClick={() => setMoveFrameMode((active) => !active)}
          >
            Move frame
          </button>
          {showFitFullImage && (
            <button
              type="button"
              className="btn-secondary focal-fit-full-btn"
              onClick={handleFitFullImage}
              disabled={saving}
            >
              Fit full image
            </button>
          )}
        </div>

        <div className="focal-editor-layout">
          <div
            ref={canvasRef}
            className={`focal-editor-canvas${moveFrameMode ? ' focal-editor-canvas--move' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onDragStart={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onLoad={handleImageLoad}
              style={editorImageRotationStyle(focal)}
            />
            {frameRect && (
              <>
                <div
                  className="focal-crop-frame"
                  style={{
                    left: `${frameRect.left}px`,
                    top: `${frameRect.top}px`,
                    width: `${frameRect.width}px`,
                    height: `${frameRect.height}px`,
                  }}
                  aria-hidden="true"
                >
                  {CROP_HANDLES.map(({ handle, className, label }) => (
                    <button
                      key={handle}
                      type="button"
                      className={`focal-crop-handle ${className}`}
                      aria-label={label}
                      onPointerDown={(event) => handleHandlePointerDown(event, handle)}
                      onPointerMove={handleHandlePointerMove}
                      onPointerUp={handleHandlePointerUp}
                      onPointerCancel={handleHandlePointerUp}
                    />
                  ))}
                </div>
                <div
                  className="focal-crosshair"
                  style={{
                    left: `${crosshairLeft}px`,
                    top: `${crosshairTop}px`,
                  }}
                  aria-hidden="true"
                />
              </>
            )}
          </div>

          <div className="focal-preview-panel">
            <p className="focal-preview-label">
              {activeOrientation === 'portrait'
                ? 'Phone portrait preview'
                : 'Landscape / PC preview'}
            </p>
            <FocalCallPreview
              imageUrl={imageUrl}
              focal={focal}
              imageAspect={imageAspect}
              displayOrientation={activeOrientation}
            />
          </div>
        </div>

        <div
          className="focal-nudge-controls"
          role="group"
          aria-label="Nudge frame position"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="focal-nudge-label">Nudge</span>
          <div className="focal-nudge-pad">
            <button
              type="button"
              className="focal-nudge-btn focal-nudge-btn--up"
              aria-label="Nudge frame up"
              onClick={() => handleNudge(0, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="focal-nudge-btn focal-nudge-btn--left"
              aria-label="Nudge frame left"
              onClick={() => handleNudge(-1, 0)}
            >
              ←
            </button>
            <button
              type="button"
              className="focal-nudge-btn focal-nudge-btn--right"
              aria-label="Nudge frame right"
              onClick={() => handleNudge(1, 0)}
            >
              →
            </button>
            <button
              type="button"
              className="focal-nudge-btn focal-nudge-btn--down"
              aria-label="Nudge frame down"
              onClick={() => handleNudge(0, 1)}
            >
              ↓
            </button>
          </div>
        </div>

        <div
          className="focal-rotation-controls"
          role="group"
          aria-label="Rotate photo"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="focal-rotation-header">
            <span className="focal-rotation-label">Rotate</span>
            <span className="focal-rotation-value" aria-live="polite">
              {rotationDeg > 0 ? '+' : ''}
              {rotationDeg.toFixed(1)}°
            </span>
            {showResetRotation && (
              <button
                type="button"
                className="btn-text focal-rotation-reset"
                onClick={handleResetRotation}
                disabled={saving}
              >
                Reset rotation
              </button>
            )}
          </div>
          <input
            type="range"
            className="focal-rotation-slider"
            min={MIN_FOCAL_ROTATION_DEG}
            max={MAX_FOCAL_ROTATION_DEG}
            step={FOCAL_ROTATION_STEP}
            value={rotationDeg}
            aria-valuemin={MIN_FOCAL_ROTATION_DEG}
            aria-valuemax={MAX_FOCAL_ROTATION_DEG}
            aria-valuenow={rotationDeg}
            aria-valuetext={`${rotationDeg > 0 ? '+' : ''}${rotationDeg.toFixed(1)} degrees`}
            onChange={(event) => handleRotationChange(Number(event.target.value))}
          />
        </div>

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
            Reset {activeOrientation === 'portrait' ? 'portrait' : 'landscape'}
          </button>
          <button
            type="button"
            className="btn-call focal-save-btn"
            disabled={saving}
            onClick={() => void onSave(framing)}
          >
            {saving ? 'Saving…' : 'Save both frames'}
          </button>
        </div>
      </div>
    </div>
  )
}
