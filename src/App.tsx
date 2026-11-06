import { MotionConfig } from 'framer-motion'
import { useData } from './data/store'
import { DeniedScreen, ErrorScreen, LoadingScreen, LoginScreen } from './ui/AuthScreens'
import { Dashboard } from './ui/Dashboard'
import { Toasts } from './ui/Toasts'
import { UiProvider } from './ui/ui'

function Screen() {
  const { status, error } = useData()
  switch (status) {
    case 'loading':
      return <LoadingScreen />
    case 'signedOut':
      return <LoginScreen />
    case 'denied':
      return <DeniedScreen />
    case 'error':
      return <ErrorScreen message={error} />
    case 'ready':
      return <Dashboard />
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <UiProvider>
        <Screen />
        <Toasts />
      </UiProvider>
    </MotionConfig>
  )
}
