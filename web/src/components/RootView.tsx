import { useMemorialCall } from '../context/MemorialCallContext'
import { ActiveCallView } from './ActiveCallView'
import { CallEndedView } from './CallEndedView'
import { HomeView } from './HomeView'
import { IncomingCallView } from './IncomingCallView'
import { OnboardingView } from './OnboardingView'

export function RootView() {
  const { callPhase, hasCompletedOnboarding } = useMemorialCall()

  switch (callPhase) {
    case 'onboarding':
      return hasCompletedOnboarding ? <HomeView /> : <OnboardingView />
    case 'incoming':
      return <IncomingCallView />
    case 'active':
      return <ActiveCallView />
    case 'ended':
      return <CallEndedView />
  }
}
