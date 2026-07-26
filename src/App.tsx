import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Spinner } from './components/Spinner'
import './App.css'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const MatchesPage = lazy(() => import('./pages/MatchesPage'))
const StandingsPage = lazy(() => import('./pages/StandingsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const PredictPage = lazy(() => import('./pages/PredictPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <Spinner />
            </div>
          }>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<MatchesPage />} />
                <Route path="/predict/:matchId" element={<PredictPage />} />
                <Route path="/standings" element={<StandingsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
