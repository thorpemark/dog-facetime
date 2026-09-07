export type CallTargetKind = 'dog_a' | 'dog_b' | 'together'

export interface MediaAsset {
  id: string
  publicUrl: string
  storagePath: string
  reactionTag: string | null
  sortOrder: number
  /** Normalized horizontal focal point for portrait cover crop (0–1). */
  focalX: number
  /** Normalized vertical focal point for portrait cover crop (0–1). */
  focalY: number
}

export interface CallTarget {
  id: string
  kind: CallTargetKind
  displayName: string
  sortOrder: number
  media: MediaAsset[]
}

export interface Memorial {
  id: string
  title: string
  note: string
  shareId: string
  editToken?: string
  createdAt: string
  targets: CallTarget[]
}

export interface CreateMemorialInput {
  title: string
  note?: string
}

export interface MemorialSummary {
  id: string
  title: string
  note: string
  shareId: string
  editToken: string
  createdAt: string
}

export interface CallSessionProfile {
  dogName: string
  ownerName: string
  memorialNote: string
  memorialTitle: string
  targetKind: CallTargetKind
  photoUrls: string[]
  /** Per-photo focal points aligned with photoUrls. */
  photoFocalPoints?: Array<{ focalX: number; focalY: number }>
  /** Future: per-reaction video clip URLs keyed by rule id */
  reactionMedia?: Record<string, string>
}

export type MotionPreset = 'idle' | 'perk' | 'excited' | 'calm'

export interface MediaPlaybackSource {
  type: 'photo' | 'video'
  url: string
}
