const SHARE_CHARS = 'abcdefghijklmnopqrstuvwxyz23456789'

export function generateShareId(length = 8): string {
  let result = ''
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += SHARE_CHARS[array[i] % SHARE_CHARS.length]
  }
  return result
}

export function generateEditToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateId(): string {
  return crypto.randomUUID()
}
