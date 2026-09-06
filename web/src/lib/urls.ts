/** Full URL path including Vite base — for share/edit links and `<a href>`, not React Router. */
export function appPath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export function shareUrl(shareId: string): string {
  const origin = window.location.origin
  return `${origin}${appPath(`/m/${shareId}`)}`
}

export function editUrl(editToken: string): string {
  const origin = window.location.origin
  return `${origin}${appPath(`/edit/${editToken}`)}`
}
