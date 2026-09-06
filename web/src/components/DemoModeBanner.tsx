import { isDemoMode } from '../services/memorialService'

export function DemoModeBanner() {
  if (!isDemoMode()) return null

  return (
    <div className="demo-banner" role="status">
      Connect Supabase to enable sharing — memorials are saved on this device only.
    </div>
  )
}
