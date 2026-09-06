import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppHeader() {
  const { user, loading, authAvailable, signOut } = useAuth()

  if (!authAvailable) return null

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {user ? (
          <>
            <Link to="/my" className="app-header-link">My memorials</Link>
            <span className="app-header-email" title={user.email ?? ''}>
              {user.email}
            </span>
            <button type="button" className="btn-text app-header-signout" onClick={() => signOut()}>
              Sign out
            </button>
          </>
        ) : (
          !loading && <Link to="/my" className="app-header-link">Sign in</Link>
        )}
      </div>
    </header>
  )
}
