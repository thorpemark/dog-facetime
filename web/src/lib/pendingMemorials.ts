const STORAGE_KEY = 'memorial-call-pending-claims'

export interface PendingClaim {
  memorialId: string
  editToken: string
  createdAt: string
}

function readClaims(): PendingClaim[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PendingClaim[]
  } catch {
    /* ignore */
  }
  return []
}

function writeClaims(claims: PendingClaim[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
}

export function addPendingClaim(memorialId: string, editToken: string): void {
  const claims = readClaims()
  if (claims.some((c) => c.editToken === editToken)) return
  claims.push({
    memorialId,
    editToken,
    createdAt: new Date().toISOString(),
  })
  writeClaims(claims)
}

export function getPendingClaims(): PendingClaim[] {
  return readClaims()
}

export function removePendingClaim(editToken: string): void {
  writeClaims(readClaims().filter((c) => c.editToken !== editToken))
}

export function clearPendingClaims(): void {
  localStorage.removeItem(STORAGE_KEY)
}
