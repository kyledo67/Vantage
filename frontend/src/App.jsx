import { Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom'
import SiteLayout from './components/layout/SiteLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import EvFinderPage from './pages/EvFinderPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'
import ParlayBuilderPage from './pages/ParlayBuilderPage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import MethodologyPage from './pages/MethodologyPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import VerificationGuard from './components/auth/VerificationGuard.jsx'
import VerificationOnboardingPage from './pages/verification/VerificationOnboardingPage.jsx'
import VerificationPendingPage from './pages/verification/VerificationPendingPage.jsx'
import VerificationDeclinedPage from './pages/verification/VerificationDeclinedPage.jsx'
import VerificationUnavailablePage from './pages/verification/VerificationUnavailablePage.jsx'
import { ParlayProvider } from './context/ParlayContext.jsx'
import { EvWatchlistProvider } from './context/EvWatchlistContext.jsx'
import { VerificationProvider } from './context/VerificationContext.jsx'

/**
 * VerificationGuard renders its own `<Outlet />` for the routes it guards.
 * A nested `<Outlet>` with no `context` prop shadows whatever context the
 * outer one (DashboardLayout's `<Outlet context={{ search }} />`) carried —
 * without forwarding it here, every guarded page's `useOutletContext()`
 * (e.g. EvFinderPage reading `search`) silently gets `undefined` instead.
 */
function GuardedOutlet() {
  const context = useOutletContext()
  return (
    <VerificationGuard>
      <Outlet context={context} />
    </VerificationGuard>
  )
}

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

      {/* Everything below requires a signed-in user. VerificationProvider lives
          here (not deeper) so both the onboarding flow and the guarded
          dashboard routes read the same verification state.
          NOTE: RequireAuth/VerificationGuard are UI gating only — the API
          must enforce the same rules server-side. */}
      <Route
        element={
          <RequireAuth>
            <VerificationProvider>
              <Outlet />
            </VerificationProvider>
          </RequireAuth>
        }
      >
        {/* Full-bleed, Vantage-branded — required before any product route
            is reachable. Not nested under DashboardLayout: there is no
            sidebar/header to show someone who isn't verified yet. */}
        <Route path="/verify" element={<VerificationOnboardingPage />} />
        <Route path="/verify/pending" element={<VerificationPendingPage />} />
        <Route path="/verify/declined" element={<VerificationDeclinedPage />} />
        <Route path="/verify/unavailable" element={<VerificationUnavailablePage />} />

        {/* Authenticated product shell (72px header + 288px sidebar). Mounted
            once for both Methodology (reachable pre-verification — it's not
            in the blocked list) and the verification-gated routes below. */}
        <Route
          element={
            <ParlayProvider>
              <EvWatchlistProvider>
                <DashboardLayout />
              </EvWatchlistProvider>
            </ParlayProvider>
          }
        >
          <Route path="/methodology" element={<MethodologyPage />} />

          <Route element={<GuardedOutlet />}>
            {/* Default landing experience post-login/verification (see
                AuthContext, LoginPage, and the verification pages' redirect
                fallbacks — all point here now instead of straight to
                /ev-finder). */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/ev-finder" element={<EvFinderPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/parlay" element={<ParlayBuilderPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Old route kept working for anyone holding the link. */}
            <Route path="/portfolio" element={<Navigate to="/parlay" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
