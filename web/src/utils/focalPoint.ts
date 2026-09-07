import type { CSSProperties } from 'react'

export const DEFAULT_FOCAL_X = 0.5
export const DEFAULT_FOCAL_Y = 0.5
export const DEFAULT_FOCAL_ZOOM = 1

/** Portrait call viewport aspect (width / height). */
export const PORTRAIT_CALL_ASPECT = 9 / 16

export const MIN_FOCAL_ZOOM = 1
export const MAX_FOCAL_ZOOM = 4

/** Minimum normalized crop dimension (fraction of image width/height). */
export const MIN_CROP_DIMENSION = 0.08

/** Normalized step for arrow nudge controls in the focal editor. */
export const FOCAL_NUDGE_STEP = 0.025

export interface FocalPoint {
  focalX: number
  focalY: number
}

export interface FocalFrame extends FocalPoint {
  /** 1 = default portrait cover; >1 zooms out toward landscape letterbox (legacy / derived). */
  focalZoom: number
  /** Normalized crop width as a fraction of image width (optional; overrides zoom-derived size). */
  cropWidth?: number
  /** Normalized crop height as a fraction of image height (optional; overrides zoom-derived size). */
  cropHeight?: number
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

export type CropResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'

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

export function normalizeCropDimension(value: unknown, fallback = MIN_CROP_DIMENSION): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(MIN_CROP_DIMENSION, num))
}

export function hasExplicitCropSize(focal: FocalFrame): boolean {
  return focal.cropWidth != null && focal.cropHeight != null
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
  cropWidth?: unknown,
  cropHeight?: unknown,
): FocalFrame {
  const hasCrop =
    cropWidth != null &&
    cropHeight != null &&
    Number.isFinite(Number(cropWidth)) &&
    Number.isFinite(Number(cropHeight))

  return {
    ...focalPointFromValues(focalX, focalY),
    focalZoom: normalizeFocalZoom(focalZoom, DEFAULT_FOCAL_ZOOM),
    ...(hasCrop
      ? {
          cropWidth: normalizeCropDimension(cropWidth),
          cropHeight: normalizeCropDimension(cropHeight),
        }
      : {}),
  }
}

export function photoSourceFromUrl(
  url: string,
  focalX?: unknown,
  focalY?: unknown,
  focalZoom?: unknown,
  cropWidth?: unknown,
  cropHeight?: unknown,
): PhotoSource {
  const focal = focalFrameFromValues(
    focalX,
    focalY,
    focalZoom,
    cropWidth,
    cropHeight,
  )
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

export function frameSizeFromZoom(
  focalZoom: number,
  imageAspect: number,
): { width: number; height: number } {
  const aspect = imageAspect > 0 ? imageAspect : 1
  const base = coverCropSize(aspect)
  const t = focalZoomProgress(focalZoom, aspect)
  const target = maxFrameForVisibleAspect(
    visibleAspectAtZoom(focalZoom, aspect),
    aspect,
  )
  return {
    width: Math.min(1, base.width + t * (target.width - base.width)),
    height: Math.min(1, base.height + t * (target.height - base.height)),
  }
}

export function frameSizeFromFocal(
  focal: FocalFrame,
  imageAspect: number,
): { width: number; height: number } {
  if (hasExplicitCropSize(focal)) {
    return {
      width: normalizeCropDimension(focal.cropWidth),
      height: normalizeCropDimension(focal.cropHeight),
    }
  }
  return frameSizeFromZoom(focal.focalZoom, imageAspect)
}

export function focalZoomFromCropSize(
  cropWidth: number,
  cropHeight: number,
  imageAspect: number,
): number {
  const aspect = imageAspect > 0 ? imageAspect : 1
  const width = normalizeCropDimension(cropWidth)
  const height = normalizeCropDimension(cropHeight)
  const displayAspect = height > 0 ? (width / height) * aspect : PORTRAIT_CALL_ASPECT
  const ratio = displayAspect / PORTRAIT_CALL_ASPECT
  if (ratio <= 1) return MIN_FOCAL_ZOOM

  const maxRatio = aspect / PORTRAIT_CALL_ASPECT
  if (maxRatio <= 1) return MIN_FOCAL_ZOOM

  const t = Math.log(ratio) / Math.log(maxRatio)
  return normalizeFocalZoom(
    MIN_FOCAL_ZOOM + t * (MAX_FOCAL_ZOOM - MIN_FOCAL_ZOOM),
  )
}

export function defaultFocalFrameForImage(
  imageAspect: number,
  preferWideFrame = false,
): FocalFrame {
  if (!preferWideFrame || !isLandscapeImage(imageAspect)) {
    const cover = coverCropSize(imageAspect)
    return focalFrameFromCenter(
      DEFAULT_FOCAL_X,
      DEFAULT_FOCAL_Y,
      cover.width,
      cover.height,
      imageAspect,
    )
  }

  const maxZoom = maxFocalZoom(imageAspect)
  const suggestedZoom = Math.min(maxZoom, 1.5)
  const size = frameSizeFromZoom(Math.max(DEFAULT_FOCAL_ZOOM, suggestedZoom), imageAspect)
  return focalFrameFromCenter(
    DEFAULT_FOCAL_X,
    DEFAULT_FOCAL_Y,
    size.width,
    size.height,
    imageAspect,
  )
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

export function clampCropRect(
  left: number,
  top: number,
  width: number,
  height: number,
): FrameRect {
  let w = normalizeCropDimension(width)
  let h = normalizeCropDimension(height)
  let l = left
  let t = top

  if (l < 0) l = 0
  if (t < 0) t = 0
  if (l + w > 1) l = Math.max(0, 1 - w)
  if (t + h > 1) t = Math.max(0, 1 - h)

  if (l + w > 1) w = Math.max(MIN_CROP_DIMENSION, 1 - l)
  if (t + h > 1) h = Math.max(MIN_CROP_DIMENSION, 1 - t)

  return { left: l, top: t, width: w, height: h }
}

export function focalFrameFromCenter(
  focalX: number,
  focalY: number,
  cropWidth: number,
  cropHeight: number,
  imageAspect: number,
): FocalFrame {
  const width = normalizeCropDimension(cropWidth)
  const height = normalizeCropDimension(cropHeight)
  const center = clampFocalCenter(focalX, focalY, width, height)
  return {
    ...center,
    cropWidth: width,
    cropHeight: height,
    focalZoom: focalZoomFromCropSize(width, height, imageAspect),
  }
}

export function nudgeFocalCenter(
  focal: FocalFrame,
  deltaX: number,
  deltaY: number,
  imageAspect: number,
  step = FOCAL_NUDGE_STEP,
): FocalFrame {
  const size = frameSizeFromFocal(focal, imageAspect)
  return focalFrameFromCenter(
    focal.focalX + deltaX * step,
    focal.focalY + deltaY * step,
    size.width,
    size.height,
    imageAspect,
  )
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
  const frame = frameSizeFromZoom(clampedZoom, imageAspect)
  return focalFrameFromCenter(
    focalX,
    focalY,
    frame.width,
    frame.height,
    imageAspect,
  )
}

export function resizeCropRect(
  startRect: FrameRect,
  handle: CropResizeHandle,
  pointerX: number,
  pointerY: number,
): FrameRect {
  const min = MIN_CROP_DIMENSION
  let left = startRect.left
  let top = startRect.top
  let right = startRect.left + startRect.width
  let bottom = startRect.top + startRect.height

  switch (handle) {
    case 'nw':
      left = Math.min(pointerX, right - min)
      top = Math.min(pointerY, bottom - min)
      break
    case 'n':
      top = Math.min(pointerY, bottom - min)
      break
    case 'ne':
      right = Math.max(pointerX, left + min)
      top = Math.min(pointerY, bottom - min)
      break
    case 'e':
      right = Math.max(pointerX, left + min)
      break
    case 'se':
      right = Math.max(pointerX, left + min)
      bottom = Math.max(pointerY, top + min)
      break
    case 's':
      bottom = Math.max(pointerY, top + min)
      break
    case 'sw':
      left = Math.min(pointerX, right - min)
      bottom = Math.max(pointerY, top + min)
      break
    case 'w':
      left = Math.min(pointerX, right - min)
      break
  }

  return clampCropRect(left, top, right - left, bottom - top)
}

export function focalFrameFromNormalizedRect(
  rect: FrameRect,
  imageAspect: number,
): FocalFrame {
  const clamped = clampCropRect(rect.left, rect.top, rect.width, rect.height)
  return focalFrameFromCenter(
    clamped.left + clamped.width / 2,
    clamped.top + clamped.height / 2,
    clamped.width,
    clamped.height,
    imageAspect,
  )
}

export function normalizedFrameRectFromFocal(
  focal: FocalFrame,
  imageAspect: number,
): FrameRect {
  const frame = frameSizeFromFocal(focal, imageAspect)
  return {
    left: focal.focalX - frame.width / 2,
    top: focal.focalY - frame.height / 2,
    width: frame.width,
    height: frame.height,
  }
}

export function frameRectFromFocal(
  focal: FocalFrame,
  bounds: ImageBounds,
  imageAspect: number,
): FrameRect {
  const frame = normalizedFrameRectFromFocal(focal, imageAspect)
  return {
    left: bounds.left + frame.left * bounds.width,
    top: bounds.top + frame.top * bounds.height,
    width: frame.width * bounds.width,
    height: frame.height * bounds.height,
  }
}

export function focalFrameFromFrameRect(
  rect: FrameRect,
  bounds: ImageBounds,
  imageAspect: number,
): FocalFrame {
  const normalized = {
    left: (rect.left - bounds.left) / bounds.width,
    top: (rect.top - bounds.top) / bounds.height,
    width: rect.width / bounds.width,
    height: rect.height / bounds.height,
  }
  return focalFrameFromNormalizedRect(normalized, imageAspect)
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
    focal.focalZoom !== DEFAULT_FOCAL_ZOOM ||
    hasExplicitCropSize(focal)
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
