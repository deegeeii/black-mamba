
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LeagueProvider } from './contexts/LeagueContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Leagues from './pages/Leagues'
import DraftRoom from './pages/DraftRoom'
import MyTeam from './pages/MyTeam'
import Matchups from './pages/Matchups'
import Bets from './pages/Bets'
import Tournament from './pages/Tournament'
import Ledger from './pages/Ledger'
import Chat from './pages/Chat'
import { ThemeProvider } from './contexts/ThemeContext'
import Playoffs from './pages/Playoffs'




function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{
        marginLeft: '220px',
        flex: 1,
        padding: '32px 40px',
        backgroundColor: 'var(--bg)',
        minHeight: '100vh',
        color: 'var(--text)'
      }}>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LeagueProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout><Profile /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues"
                element={
                  <ProtectedRoute>
                    <AppLayout><Leagues /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/draft"
                element={
                  <ProtectedRoute>
                    <AppLayout><DraftRoom /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/team"
                element={
                  <ProtectedRoute>
                    <AppLayout><MyTeam /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/matchups"
                element={
                  <ProtectedRoute>
                    <AppLayout><Matchups /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/bets"
                element={
                  <ProtectedRoute>
                    <AppLayout><Bets /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/tournaments"
                element={
                  <ProtectedRoute>
                    <AppLayout><Tournament /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger"
                element={
                    <ProtectedRoute>
                        <AppLayout><Ledger /></AppLayout>
                    </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/chat"
                element={
                  <ProtectedRoute>
                    <AppLayout><Chat /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leagues/:leagueId/playoffs"
                element={
                  <ProtectedRoute>
                    <AppLayout><Playoffs /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </LeagueProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
