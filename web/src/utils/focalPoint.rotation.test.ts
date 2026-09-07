import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FOCAL_X,
  DEFAULT_FOCAL_Y,
  DEFAULT_FOCAL_ZOOM,
  photoLayerMediaStyle,
  type FocalFrame,
} from './focalPoint'

describe('photoLayerMediaStyle rotation', () => {
  it('sets --focal-rotation for preview and call layers', () => {
    const focal: FocalFrame = {
      focalX: DEFAULT_FOCAL_X,
      focalY: DEFAULT_FOCAL_Y,
      focalZoom: DEFAULT_FOCAL_ZOOM,
      focalRotationDeg: -8.5,
    }

    const style = photoLayerMediaStyle(focal, 4 / 3)

    expect(style['--focal-rotation' as keyof typeof style]).toBe('-8.5deg')
    expect(style.transformOrigin).toBe('50% 50%')
  })
})
