import { MemorialCallProvider } from './context/MemorialCallContext'
import { RootView } from './components/RootView'

function App() {
  return (
    <MemorialCallProvider>
      <RootView />
    </MemorialCallProvider>
  )
}

export default App
