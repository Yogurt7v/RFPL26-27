import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Spinner } from './components/Spinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const MatchesPage = lazy(() => import('./pages/MatchesPage'))
const StandingsPage = lazy(() => import('./pages/StandingsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const PredictPage = lazy(() => import('./pages/PredictPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const pageFallback = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spinner />
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={pageFallback}>
              <Routes>
                <Route path="/login" element={
                  <ErrorBoundary>
                    <LoginPage />
                  </ErrorBoundary>
                } />
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={
                    <ErrorBoundary>
                      <MatchesPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/predict/:matchId" element={
                    <ErrorBoundary>
                      <PredictPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/standings" element={
                    <ErrorBoundary>
                      <StandingsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/leaderboard" element={
                    <ErrorBoundary>
                      <LeaderboardPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/settings" element={
                    <ErrorBoundary>
                      <SettingsPage />
                    </ErrorBoundary>
                  } />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
