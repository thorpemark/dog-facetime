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
  /** 1 = default cover crop; >1 zooms out to include more of the image. */
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

export function maxFocalZoom(imageAspect: number): number {
  const crop = coverCropSize(imageAspect)
  const widthZoom = crop.width > 0 ? 1 / crop.width : MAX_FOCAL_ZOOM
  const heightZoom = crop.height > 0 ? 1 / crop.height : MAX_FOCAL_ZOOM
  return Math.min(MAX_FOCAL_ZOOM, widthZoom, heightZoom)
}

export function isLandscapeImage(imageAspect: number): boolean {
  return imageAspect > 1.05
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
  const suggestedZoom = Math.min(maxZoom, 1.35)
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
  const crop = coverCropSize(imageAspect)
  const zoom = normalizeFocalZoom(focal.focalZoom)
  return {
    width: Math.min(1, crop.width * zoom),
    height: Math.min(1, crop.height * zoom),
  }
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
  const crop = coverCropSize(imageAspect)
  const zoom = normalizeFocalZoom(frameWidth / crop.width)
  const centerX = (rect.left - bounds.left + rect.width / 2) / bounds.width
  const centerY = (rect.top - bounds.top + rect.height / 2) / bounds.height
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

/** Positions a cover-sized image box for framed portrait playback. */
export function photoLayerCoverStyle(focal: FocalFrame): CSSProperties {
  const zoom = normalizeFocalZoom(focal.focalZoom)
  return {
    position: 'absolute',
    width: `${zoom * 100}%`,
    height: `${zoom * 100}%`,
    left: `${(0.5 - focal.focalX * zoom) * 100}%`,
    top: `${(0.5 - focal.focalY * zoom) * 100}%`,
  }
}

export function photoLayerMediaStyle(focal: FocalFrame): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: objectPositionStyle(focal),
    transformOrigin: transformOriginStyle(focal),
    '--focal-x': `${focal.focalX * 100}%`,
    '--focal-y': `${focal.focalY * 100}%`,
  } as CSSProperties
}
