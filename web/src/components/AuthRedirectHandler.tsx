import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  consumePostAuthPath,
  hasAuthCallbackInUrl,
  peekPostAuthPath,
} from '../lib/authRedirect'
import { appPath } from '../lib/urls'

/**
 * After magic link / OAuth lands on site root, establish session then go to /my.
 * Cleans auth tokens from the URL to avoid re-processing on refresh.
 */
export function AuthRedirectHandler() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const authCallbackOnLoad = useRef(hasAuthCallbackInUrl())
  const handled = useRef(false)

  useEffect(() => {
    if (loading || handled.current) return

    const cleanAuthUrl = () => {
      const base = appPath('/')
      window.history.replaceState(null, '', base)
    }

    if (authCallbackOnLoad.current) {
      if (user) {
        handled.current = true
        const next = consumePostAuthPath() ?? '/my'
        cleanAuthUrl()
        navigate(next, { replace: true })
      }
      return
    }

    const pending = peekPostAuthPath()
    if (user && pending) {
      handled.current = true
      const next = consumePostAuthPath() ?? '/my'
      navigate(next, { replace: true })
    }
  }, [user, loading, navigate])

  return null
}
