// ── IMPORTS ────────────────────────────────────────────────────────────────────
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
import ResetPassword from './pages/ResetPassword'
import LeagueHome from './pages/LeagueHome'
import StripeConnect from './pages/StripeConnect'
import Onboarding from './pages/Onboarding'
import CreateLeague from './pages/CreateLeague'
import JoinLeague from './pages/JoinLeague'
import Support from './pages/Support'
import Privacy from './pages/Privacy'
import Landing from './pages/Landing'
import Terms from './pages/Terms'
import AgeSuitability from './pages/Age'



// ── HELPERS ────────────────────────────────────────────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      {/* ── Sidebar ── */}
      <Sidebar />
      {/* ── Page Content ── */}
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

// ── JSX / RENDER ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      {/* ── Context Providers ── */}
      <AuthProvider>
        <ThemeProvider>
          <LeagueProvider>
            <Routes>
              {/* ── Public Routes ── */}
              <Route path="/" element={<Landing />} />
              <Route path="/support" element={<Support />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/age" element={<AgeSuitability />} />


              {/* ── Onboarding Routes (protected, no sidebar) ── */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-league"
                element={
                  <ProtectedRoute>
                    <CreateLeague />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join-league"
                element={
                  <ProtectedRoute>
                    <JoinLeague />
                  </ProtectedRoute>
                }
              />

              {/* ── Protected Routes ── */}
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
                path="/leagues/:leagueId/league-home"
                element={
                  <ProtectedRoute>
                    <AppLayout><LeagueHome /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/connect"
                element={
                  <ProtectedRoute>
                    <AppLayout><StripeConnect /></AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LeagueProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
