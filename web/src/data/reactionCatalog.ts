/**
 * Reaction clip catalog for the dog-facetime-clips product line.
 *
 * Each bucket groups synonymous phrases and several prerendered clip variants.
 * Playback should pick randomly among `clipPaths` on match (see pickRandomClipForBucket).
 *
 * TODO: Wire into useMediaPlayback.playVideoReaction and loadKeywordRules merge.
 * TODO: Sync with MemorialCall iOS bundle layout under Resources/Clips/reactions/.
 *
 * Still-image Ken Burns mode remains in dog-facetime / useMediaPlayback photos branch.
 */

export type ReactionBucketId =
  | 'name'
  | 'come'
  | 'here'
  | 'good'
  | 'treat'
  | 'walk'
  | 'no'
  | 'owner'
  | 'play'
  | 'quiet'

export interface ReactionBucket {
  id: ReactionBucketId
  /** Substrings matched against lowercased transcript; {dogName} / {ownerName} expanded at runtime. */
  phrases: string[]
  /** Public URL paths under BASE_URL (multiple variants for random pick). */
  clipPaths: string[]
  priority: number
  description?: string
}

/** Placeholder portrait clips — replace with Murphy/Riley AI renders. */
const CLIPS_BASE = 'clips/reactions'

function bucketClips(bucket: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return `${CLIPS_BASE}/${bucket}/${bucket}_${n}.mp4`
  })
}

/** v1 global catalog (Murphy/Riley demo). Per-memorial overrides planned via Supabase manifest. */
export const REACTION_CATALOG: ReactionBucket[] = [
  {
    id: 'name',
    phrases: ['{dogName}', 'murphy', 'riley', 'biscuit'],
    clipPaths: [
      ...bucketClips('name', 3),
      'clips/react_biscuit.mp4',
    ],
    priority: 10,
    description: 'Dog name',
  },
  {
    id: 'come',
    phrases: ['come here', 'come on', "c'mere", 'come'],
    clipPaths: [...bucketClips('come', 3), 'clips/react_come.mp4'],
    priority: 7,
    description: 'Come here',
  },
  {
    id: 'here',
    phrases: ['here boy', 'here girl', 'over here', 'this way', 'here'],
    clipPaths: bucketClips('here', 2),
    priority: 6,
    description: 'Here / this way',
  },
  {
    id: 'good',
    phrases: ['good boy', 'good girl', 'good dog', "who's a good", 'good pup'],
    clipPaths: [...bucketClips('good', 3), 'clips/react_good.mp4'],
    priority: 7,
    description: 'Good dog',
  },
  {
    id: 'treat',
    phrases: [
      'treat',
      'cookie',
      'snack',
      'chicken',
      'want some chicken',
      'want a treat',
    ],
    clipPaths: [...bucketClips('treat', 3), 'clips/react_treat.mp4'],
    priority: 8,
    description: 'Treat / chicken',
  },
  {
    id: 'walk',
    phrases: ['walk', 'go for a walk', 'wanna walk', 'outside', 'go out'],
    clipPaths: [...bucketClips('walk', 3), 'clips/react_walk.mp4'],
    priority: 8,
    description: 'Walk',
  },
  {
    id: 'no',
    phrases: ['no', 'no no', 'stop that', 'uh uh'],
    clipPaths: [...bucketClips('no', 2), 'clips/react_no.mp4'],
    priority: 6,
    description: 'No',
  },
  {
    id: 'owner',
    phrases: ['{ownerName}', 'mark'],
    clipPaths: [...bucketClips('owner', 2), 'clips/react_owner.mp4'],
    priority: 9,
    description: 'Owner name',
  },
  {
    id: 'play',
    phrases: ['play', 'ball', 'fetch', 'want to play'],
    clipPaths: bucketClips('play', 2),
    priority: 5,
    description: 'Play (future)',
  },
  {
    id: 'quiet',
    phrases: ['quiet', 'shh', 'settle', 'calm down'],
    clipPaths: bucketClips('quiet', 2),
    priority: 4,
    description: 'Quiet (future)',
  },
]

export const IDLE_CLIP_PATHS = [
  'clips/idle/idle_01.mp4',
  'clips/idle/idle_02.mp4',
  'clips/idle.mp4',
]

const lastPickByBucket = new Map<string, string>()

/** Random clip for bucket; optionally avoids repeating the previous pick in that bucket. */
export function pickRandomClipForBucket(
  bucketId: string,
  options: { excludeLast?: boolean } = { excludeLast: true },
): string | undefined {
  const bucket = REACTION_CATALOG.find((b) => b.id === bucketId)
  if (!bucket || bucket.clipPaths.length === 0) return undefined

  const pool =
    options.excludeLast && bucket.clipPaths.length > 1
      ? bucket.clipPaths.filter((p) => p !== lastPickByBucket.get(bucketId))
      : bucket.clipPaths

  const pick = pool[Math.floor(Math.random() * pool.length)]
  lastPickByBucket.set(bucketId, pick)
  return pick
}

export function bucketById(id: string): ReactionBucket | undefined {
  return REACTION_CATALOG.find((b) => b.id === id)
}

/** Sorted for priority matching (highest first). */
export function catalogSortedByPriority(): ReactionBucket[] {
  return [...REACTION_CATALOG].sort((a, b) => b.priority - a.priority)
}
