import { useMemorialCall } from '../context/MemorialCallContext'
import { ActiveCallView } from './ActiveCallView'
import { CallEndedView } from './CallEndedView'
import { IncomingCallView } from './IncomingCallView'
import { MemorialHomeView } from './MemorialHomeView'

interface MemorialCallFlowProps {
  showBack?: boolean
  onBack?: () => void
}

export function MemorialCallFlow({ showBack, onBack }: MemorialCallFlowProps) {
  const { callPhase } = useMemorialCall()

  switch (callPhase) {
    case 'home':
      return <MemorialHomeView showBack={showBack} onBack={onBack} />
    case 'incoming':
      return <IncomingCallView />
    case 'active':
      return <ActiveCallView />
    case 'ended':
      return <CallEndedView />
    default:
      return <MemorialHomeView showBack={showBack} onBack={onBack} />
  }
}
