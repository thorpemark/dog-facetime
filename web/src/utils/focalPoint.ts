import type { CSSProperties } from 'react'

export const DEFAULT_FOCAL_X = 0.5
export const DEFAULT_FOCAL_Y = 0.5
export const DEFAULT_FOCAL_ZOOM = 1

/** Portrait call viewport aspect (width / height). */
export const PORTRAIT_CALL_ASPECT = 9 / 16

export const MIN_FOCAL_ZOOM = 1
export const MAX_FOCAL_ZOOM = 4

export interface FocalPoint {
  focalX: number
  focalY: number
}

export interface FocalFrame extends FocalPoint {
  /** 1 = default portrait cover; >1 zooms out toward landscape letterbox. */
  focalZoom: number
}

export interface PhotoSource extends FocalFrame {
  url: string
}

export interface ImageBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface FrameRect {
  left: number
  top: number
  width: number
  height: number
}

export function normalizeFocal(value: unknown, fallback = 0.5): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, num))
}

export function normalizeFocalZoom(value: unknown, fallback = DEFAULT_FOCAL_ZOOM): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(MAX_FOCAL_ZOOM, Math.max(MIN_FOCAL_ZOOM, num))
}

export function focalPointFromValues(
  focalX?: unknown,
  focalY?: unknown,
): FocalPoint {
  return {
    focalX: normalizeFocal(focalX, DEFAULT_FOCAL_X),
    focalY: normalizeFocal(focalY, DEFAULT_FOCAL_Y),
  }
}

export function focalFrameFromValues(
  focalX?: unknown,
  focalY?: unknown,
  focalZoom?: unknown,
): FocalFrame {
  return {
    ...focalPointFromValues(focalX, focalY),
    focalZoom: normalizeFocalZoom(focalZoom, DEFAULT_FOCAL_ZOOM),
  }
}

export function photoSourceFromUrl(
  url: string,
  focalX?: unknown,
  focalY?: unknown,
  focalZoom?: unknown,
): PhotoSource {
  const focal = focalFrameFromValues(focalX, focalY, focalZoom)
  return { url, ...focal }
}

export function photoSourcesFromUrls(urls: string[]): PhotoSource[] {
  return urls.map((url) => photoSourceFromUrl(url))
}

/** Normalized width/height of the minimum portrait cover crop at zoom = 1. */
export function coverCropSize(imageAspect: number): { width: number; height: number } {
  const aspect = imageAspect > 0 ? imageAspect : 1
  if (aspect >= PORTRAIT_CALL_ASPECT) {
    return { width: PORTRAIT_CALL_ASPECT / aspect, height: 1 }
  }
  return { width: 1, height: aspect / PORTRAIT_CALL_ASPECT }
}

export function maxFocalZoom(_imageAspect: number): number {
  return MAX_FOCAL_ZOOM
}

export function isLandscapeImage(imageAspect: number): boolean {
  return imageAspect > 1.05
}

/** Progress from portrait cover (0) to full-image framing (1) for a zoom value. */
export function focalZoomProgress(focalZoom: number, imageAspect: number): number {
  const maxZoom = maxFocalZoom(imageAspect)
  if (maxZoom <= MIN_FOCAL_ZOOM) return 0
  const zoom = normalizeFocalZoom(focalZoom)
  return Math.min(1, Math.max(0, (zoom - MIN_FOCAL_ZOOM) / (maxZoom - MIN_FOCAL_ZOOM)))
}

/**
 * Visible aspect (width/height) of the framed crop on the portrait call screen.
 * At zoom = 1 this is PORTRAIT_CALL_ASPECT; at max zoom it reaches the image aspect.
 */
export function visibleAspectAtZoom(focalZoom: number, imageAspect: number): number {
  const aspect = imageAspect > 0 ? imageAspect : 1
  const t = focalZoomProgress(focalZoom, aspect)
  const ratio = aspect / PORTRAIT_CALL_ASPECT
  return PORTRAIT_CALL_ASPECT * Math.pow(ratio, t)
}

/** Largest normalized crop (fractions of image w/h) with the given visible aspect. */
export function maxFrameForVisibleAspect(
  visibleAspect: number,
  imageAspect: number,
): { width: number; height: number } {
  const aspect = imageAspect > 0 ? imageAspect : 1
  const frameAspect = visibleAspect / aspect
  if (frameAspect >= 1) {
    return { width: 1, height: 1 / frameAspect }
  }
  return { width: frameAspect, height: 1 }
}

export function defaultFocalFrameForImage(
  imageAspect: number,
  preferWideFrame = false,
): FocalFrame {
  if (!preferWideFrame || !isLandscapeImage(imageAspect)) {
    return {
      focalX: DEFAULT_FOCAL_X,
      focalY: DEFAULT_FOCAL_Y,
      focalZoom: DEFAULT_FOCAL_ZOOM,
    }
  }

  const maxZoom = maxFocalZoom(imageAspect)
  const suggestedZoom = Math.min(maxZoom, 1.5)
  return {
    focalX: DEFAULT_FOCAL_X,
    focalY: DEFAULT_FOCAL_Y,
    focalZoom: Math.max(DEFAULT_FOCAL_ZOOM, suggestedZoom),
  }
}

export function frameSizeFromFocal(
  focal: FocalFrame,
  imageAspect: number,
): { width: number; height: number } {
  const aspect = imageAspect > 0 ? imageAspect : 1
  const base = coverCropSize(aspect)
  const t = focalZoomProgress(focal.focalZoom, aspect)
  const target = maxFrameForVisibleAspect(
    visibleAspectAtZoom(focal.focalZoom, aspect),
    aspect,
  )
  return {
    width: Math.min(1, base.width + t * (target.width - base.width)),
    height: Math.min(1, base.height + t * (target.height - base.height)),
  }
}

export function displayAspectFromFocal(
  focal: FocalFrame,
  imageAspect: number,
): number {
  const frame = frameSizeFromFocal(focal, imageAspect)
  const aspect = imageAspect > 0 ? imageAspect : 1
  if (frame.height <= 0) return PORTRAIT_CALL_ASPECT
  return (frame.width / frame.height) * aspect
}

export function clampFocalCenter(
  focalX: number,
  focalY: number,
  frameWidth: number,
  frameHeight: number,
): FocalPoint {
  const halfW = frameWidth / 2
  const halfH = frameHeight / 2
  return {
    focalX: normalizeFocal(Math.min(1 - halfW, Math.max(halfW, focalX))),
    focalY: normalizeFocal(Math.min(1 - halfH, Math.max(halfH, focalY))),
  }
}

export function focalFrameFromCenterAndZoom(
  focalX: number,
  focalY: number,
  focalZoom: number,
  imageAspect: number,
): FocalFrame {
  const zoom = normalizeFocalZoom(focalZoom)
  const maxZoom = maxFocalZoom(imageAspect)
  const clampedZoom = Math.min(maxZoom, zoom)
  const frame = frameSizeFromFocal(
    { focalX, focalY, focalZoom: clampedZoom },
    imageAspect,
  )
  const center = clampFocalCenter(focalX, focalY, frame.width, frame.height)
  return {
    ...center,
    focalZoom: clampedZoom,
  }
}

export function frameRectFromFocal(
  focal: FocalFrame,
  bounds: ImageBounds,
  imageAspect: number,
): FrameRect {
  const frame = frameSizeFromFocal(focal, imageAspect)
  return {
    left: bounds.left + (focal.focalX - frame.width / 2) * bounds.width,
    top: bounds.top + (focal.focalY - frame.height / 2) * bounds.height,
    width: frame.width * bounds.width,
    height: frame.height * bounds.height,
  }
}

export function focalFrameFromFrameRect(
  rect: FrameRect,
  bounds: ImageBounds,
  imageAspect: number,
): FocalFrame {
  const frameWidth = rect.width / bounds.width
  const frameHeight = rect.height / bounds.height
  const centerX = (rect.left - bounds.left + rect.width / 2) / bounds.width
  const centerY = (rect.top - bounds.top + rect.height / 2) / bounds.height
  const displayAspect =
    frameHeight > 0 ? (frameWidth / frameHeight) * imageAspect : PORTRAIT_CALL_ASPECT
  const ratio = displayAspect / PORTRAIT_CALL_ASPECT
  const zoom =
    ratio <= 1
      ? MIN_FOCAL_ZOOM
      : MIN_FOCAL_ZOOM +
        (Math.log(ratio) / Math.log(imageAspect / PORTRAIT_CALL_ASPECT)) *
          (maxFocalZoom(imageAspect) - MIN_FOCAL_ZOOM)
  return focalFrameFromCenterAndZoom(centerX, centerY, zoom, imageAspect)
}

export function computeContainBounds(
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

export function focalPositionStyle(focal: FocalPoint): string {
  return `${focal.focalX * 100}% ${focal.focalY * 100}%`
}

export function backgroundPositionStyle(focal: FocalPoint): string {
  return focalPositionStyle(focal)
}

export function objectPositionStyle(focal: FocalPoint): string {
  return focalPositionStyle(focal)
}

export function transformOriginStyle(focal: FocalPoint): string {
  return `${focal.focalX * 100}% ${focal.focalY * 100}%`
}

export function hasCustomFocalFrame(focal: FocalFrame): boolean {
  return (
    focal.focalX !== DEFAULT_FOCAL_X ||
    focal.focalY !== DEFAULT_FOCAL_Y ||
    focal.focalZoom !== DEFAULT_FOCAL_ZOOM
  )
}

/** Letterboxed viewport band on the portrait call screen. */
export function photoViewportBandStyle(
  focal: FocalFrame,
  imageAspect: number,
): CSSProperties {
  const displayAspect = displayAspectFromFocal(focal, imageAspect)
  const bandHeightPct = Math.min(
    100,
    (PORTRAIT_CALL_ASPECT / displayAspect) * 100,
  )
  const bandTopPct = (100 - bandHeightPct) / 2

  return {
    position: 'absolute',
    left: 0,
    width: '100%',
    top: `${bandTopPct}%`,
    height: `${bandHeightPct}%`,
    overflow: 'hidden',
  }
}

/** Positions the image inside the viewport band to show the selected crop. */
export function photoLayerCoverStyle(
  focal: FocalFrame,
  imageAspect: number,
): CSSProperties {
  return photoViewportBandStyle(focal, imageAspect)
}

export function photoLayerMediaStyle(
  focal: FocalFrame,
  imageAspect: number,
): CSSProperties {
  const frame = frameSizeFromFocal(focal, imageAspect)
  const invW = 1 / frame.width
  const invH = 1 / frame.height

  return {
    position: 'absolute',
    width: `${invW * 100}%`,
    height: `${invH * 100}%`,
    left: `${-(focal.focalX - frame.width / 2) * invW * 100}%`,
    top: `${-(focal.focalY - frame.height / 2) * invH * 100}%`,
    objectFit: 'cover',
    transformOrigin: transformOriginStyle(focal),
    '--focal-x': `${focal.focalX * 100}%`,
    '--focal-y': `${focal.focalY * 100}%`,
  } as CSSProperties
}
