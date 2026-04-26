import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import BigScreen from './routes/BigScreen'
import DemoHostWorkspace from './routes/DemoHostWorkspace'
import HostAuthGate from './routes/HostAuthGate'
import HostConsole from './routes/HostConsole'
import HostDashboard from './routes/HostDashboard'
import JoinPage from './routes/JoinPage'
import VotePage from './routes/VotePage'
import { ThemeProvider } from './lib/themeContext'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<JoinPage />} />
          <Route path="/vote/:sessionCode" element={<VotePage />} />
          <Route path="/host/demo" element={<DemoHostWorkspace />} />
          <Route path="/host" element={<HostAuthGate />}>
            <Route index element={<HostDashboard />} />
            <Route path="new" element={<Navigate replace to="/host" />} />
            <Route path=":sessionId" element={<HostConsole />} />
          </Route>
          <Route path="/present/:sessionId" element={<BigScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
