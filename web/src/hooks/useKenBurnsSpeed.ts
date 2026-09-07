import { useCallback, useState } from 'react'
import {
  type KenBurnsSpeed,
  KEN_BURNS_SPEED_PRESETS,
  loadKenBurnsSpeed,
  saveKenBurnsSpeed,
} from '../utils/kenBurnsSpeed'

export function useKenBurnsSpeed() {
  const [speed, setSpeedState] = useState<KenBurnsSpeed>(loadKenBurnsSpeed)

  const setSpeed = useCallback((next: KenBurnsSpeed) => {
    setSpeedState(next)
    saveKenBurnsSpeed(next)
  }, [])

  const preset = KEN_BURNS_SPEED_PRESETS[speed]

  return {
    speed,
    setSpeed,
    idleAnimationMs: preset.idleAnimationMs,
    crossfadeIntervalMs: preset.crossfadeIntervalMs,
    speedPresets: KEN_BURNS_SPEED_PRESETS,
  }
}
