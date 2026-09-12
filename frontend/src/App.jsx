import { Routes, Route } from 'react-router-dom'
import SiteLayout from './components/layout/SiteLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import OpportunityFeedPage from './pages/OpportunityFeedPage.jsx'
import ContractDetailPage from './pages/ContractDetailPage.jsx'
import PortfolioPage from './pages/PortfolioPage.jsx'
import AboutMethodologyPage from './pages/AboutMethodologyPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'

export default function App() {
  return (
    <Routes>
      {/* Full-bleed screens that manage their own chrome (no navbar/footer). */}
      <Route path="/login" element={<LoginPage />} />

      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutMethodologyPage />} />

        {/* Signed-in only. NOTE: this is UI gating, not security — the API must
            enforce the same rules server-side once auth is wired up. */}
        <Route
          path="/ev-finder"
          element={
            <RequireAuth>
              <OpportunityFeedPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ev-finder/:id"
          element={
            <RequireAuth>
              <ContractDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/portfolio"
          element={
            <RequireAuth>
              <PortfolioPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
