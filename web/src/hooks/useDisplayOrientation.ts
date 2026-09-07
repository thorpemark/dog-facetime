import { useEffect, useState } from 'react'
import {
  getDisplayOrientation,
  type DisplayOrientation,
} from '../utils/focalPoint'

/** Tracks portrait vs landscape call viewport from window size and orientation. */
export function useDisplayOrientation(): DisplayOrientation {
  const [orientation, setOrientation] = useState<DisplayOrientation>(() =>
    getDisplayOrientation(),
  )

  useEffect(() => {
    const update = () => setOrientation(getDisplayOrientation())

    const portraitQuery = window.matchMedia('(orientation: portrait)')
    portraitQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    return () => {
      portraitQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return orientation
}
