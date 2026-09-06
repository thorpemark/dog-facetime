import { appPath } from './urls'

/** Full URL for Supabase magic-link / OAuth return (includes Vite base path). */
export function authRedirectUrl(path = '/my'): string {
  const origin = window.location.origin
  return `${origin}${appPath(path)}`
}
