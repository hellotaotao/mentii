import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BigScreen from './routes/BigScreen'
import HostAuthGate from './routes/HostAuthGate'
import HostConsole from './routes/HostConsole'
import JoinPage from './routes/JoinPage'
import VotePage from './routes/VotePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/vote/:sessionCode" element={<VotePage />} />
        <Route path="/host" element={<HostAuthGate />}>
          <Route path="new" element={<HostConsole mode="new" />} />
          <Route path=":sessionId" element={<HostConsole mode="existing" />} />
        </Route>
        <Route path="/present/:sessionId" element={<BigScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
