import { Routes, Route, Navigate } from 'react-router-dom'
import SiteLayout from './components/layout/SiteLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import EvFinderPage from './pages/EvFinderPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'
import ParlayBuilderPage from './pages/ParlayBuilderPage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import MarketsPage from './pages/MarketsPage.jsx'
import MarketDetailPage from './pages/MarketDetailPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import MethodologyPage from './pages/MethodologyPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import { ParlayProvider } from './context/ParlayContext.jsx'

export default function App() {
  return (
    <Routes>
      {/* Full-bleed screens that manage their own chrome (no navbar/footer). */}
      <Route path="/login" element={<LoginPage />} />

      {/* Marketing site */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingPage />} />
        {/* Old plain-text methodology page is gone — the Learning Center now
            lives in the dashboard shell. */}
        <Route path="/about" element={<Navigate to="/methodology" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Authenticated product shell (72px header + 220px sidebar).
          NOTE: RequireAuth is UI gating only — the API must enforce the same
          rules server-side once auth is wired up. */}
      <Route
        element={
          <RequireAuth>
            <ParlayProvider>
              <DashboardLayout />
            </ParlayProvider>
          </RequireAuth>
        }
      >
        <Route path="/ev-finder" element={<EvFinderPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/parlay" element={<ParlayBuilderPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/markets/:id" element={<MarketDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        {/* Old route kept working for anyone holding the link. */}
        <Route path="/portfolio" element={<Navigate to="/parlay" replace />} />
      </Route>
    </Routes>
  )
}
