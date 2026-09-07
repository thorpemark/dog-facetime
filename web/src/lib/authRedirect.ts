import { appPath } from './urls'

/** Session key for where to navigate after magic link / OAuth completes. */
export const POST_AUTH_PATH_KEY = 'memorial-post-auth-path'

/**
 * Full URL for Supabase magic-link / OAuth return.
 * Always the site root (includes Vite base, e.g. /dog-facetime/) so GitHub Pages
 * serves index.html without a deep-link 404. App navigates to /my after session.
 */
export function authRedirectUrl(): string {
  const origin = window.location.origin
  return `${origin}${appPath('/')}`
}

export function setPostAuthPath(path: string): void {
  sessionStorage.setItem(POST_AUTH_PATH_KEY, path)
}

export function peekPostAuthPath(): string | null {
  return sessionStorage.getItem(POST_AUTH_PATH_KEY)
}

export function consumePostAuthPath(): string | null {
  const path = sessionStorage.getItem(POST_AUTH_PATH_KEY)
  sessionStorage.removeItem(POST_AUTH_PATH_KEY)
  return path
}

/** True when the current URL looks like a Supabase auth callback. */
export function hasAuthCallbackInUrl(): boolean {
  const hash = window.location.hash
  const search = window.location.search
  return (
    hash.includes('access_token=') ||
    hash.includes('error=') ||
    hash.includes('error_description=') ||
    search.includes('code=') ||
    search.includes('token_hash=')
  )
}
