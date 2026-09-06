import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CreateMemorialView } from './components/CreateMemorialView'
import { EditMemorialView } from './components/EditMemorialView'
import { LandingView } from './components/LandingView'
import { ShareMemorialView } from './components/ShareMemorialView'

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/create" element={<CreateMemorialView />} />
        <Route path="/m/:shareId" element={<ShareMemorialView />} />
        <Route path="/edit/:editToken" element={<EditMemorialView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
