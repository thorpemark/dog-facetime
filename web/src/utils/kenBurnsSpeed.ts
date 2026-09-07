export type KenBurnsSpeed = 'slow' | 'normal' | 'fast'

export const KEN_BURNS_SPEED_STORAGE_KEY = 'memorial-call-ken-burns-speed'

export interface KenBurnsSpeedPreset {
  label: string
  idleAnimationMs: number
  crossfadeIntervalMs: number
}

export const KEN_BURNS_SPEED_PRESETS: Record<KenBurnsSpeed, KenBurnsSpeedPreset> = {
  slow: {
    label: 'Slow',
    idleAnimationMs: 18_000,
    crossfadeIntervalMs: 8_000,
  },
  normal: {
    label: 'Normal',
    idleAnimationMs: 12_000,
    crossfadeIntervalMs: 5_000,
  },
  fast: {
    label: 'Fast',
    idleAnimationMs: 7_000,
    crossfadeIntervalMs: 3_000,
  },
}

/** Pause auto-advance after a manual photo change before resuming the idle cycle. */
export const MANUAL_NAV_PAUSE_MS = 10_000

export function isKenBurnsSpeed(value: string): value is KenBurnsSpeed {
  return value === 'slow' || value === 'normal' || value === 'fast'
}

export function loadKenBurnsSpeed(): KenBurnsSpeed {
  try {
    const stored = localStorage.getItem(KEN_BURNS_SPEED_STORAGE_KEY)
    if (stored && isKenBurnsSpeed(stored)) return stored
  } catch {
    // localStorage may be unavailable (private mode, etc.)
  }
  return 'normal'
}

export function saveKenBurnsSpeed(speed: KenBurnsSpeed): void {
  try {
    localStorage.setItem(KEN_BURNS_SPEED_STORAGE_KEY, speed)
  } catch {
    // ignore write failures
  }
}
