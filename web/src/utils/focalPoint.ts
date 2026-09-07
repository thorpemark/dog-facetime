export const DEFAULT_FOCAL_X = 0.5
export const DEFAULT_FOCAL_Y = 0.5

export interface FocalPoint {
  focalX: number
  focalY: number
}

export interface PhotoSource extends FocalPoint {
  url: string
}

export function normalizeFocal(value: unknown, fallback = 0.5): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, num))
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

export function photoSourceFromUrl(
  url: string,
  focalX?: unknown,
  focalY?: unknown,
): PhotoSource {
  const focal = focalPointFromValues(focalX, focalY)
  return { url, ...focal }
}

export function photoSourcesFromUrls(urls: string[]): PhotoSource[] {
  return urls.map((url) => photoSourceFromUrl(url))
}

export function focalPositionStyle(focal: FocalPoint): string {
  return `${focal.focalX * 100}% ${focal.focalY * 100}%`
}

/** Background-position for cover-cropped photo layers. */
export function backgroundPositionStyle(focal: FocalPoint): string {
  return focalPositionStyle(focal)
}

/** Object-position for cover-cropped <img> photo layers. */
export function objectPositionStyle(focal: FocalPoint): string {
  return focalPositionStyle(focal)
}

export function transformOriginStyle(focal: FocalPoint): string {
  return `${focal.focalX * 100}% ${focal.focalY * 100}%`
}
