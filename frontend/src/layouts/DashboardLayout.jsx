import { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import DashboardSidebar from '../components/dashboard/DashboardSidebar.jsx'
import { getAccount } from '../services/opportunities.js'
import { useAsync } from '../hooks/useAsync.js'
import { usePageVisiblePause } from '../motion/usePageVisible.js'
import { DURATION, EASE } from '../motion/tokens.js'

/**
 * Authenticated shell: fixed 72px header, fixed 220px sidebar below it on
 * desktop, slide-out drawer on mobile. Search state lives here so the header
 * can drive the page's query via Outlet context.
 */
export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()

  // Stops shimmer/live-dot loops while the tab is backgrounded.
  usePageVisiblePause()

  const account = useAsync(getAccount, [])
  const handleSearchChange = useCallback((next) => setSearch(next), [])

  return (
    <div className="min-h-screen bg-vantage-bg">
      <DashboardHeader
        account={account.data}
        accountStatus={account.status}
        search={search}
        onSearchChange={handleSearchChange}
        onOpenSidebar={() => setDrawerOpen(true)}
      />

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-[72px] hidden w-[220px] border-r border-vantage-border lg:block">
        <DashboardSidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.nav }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: DURATION.nav, ease: EASE.out }}
              className="fixed bottom-0 left-0 top-[72px] z-50 w-[220px] border-r border-vantage-border lg:hidden"
            >
              <DashboardSidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="pt-[72px] lg:pl-[220px]">
        <div className="p-4 sm:p-6">
          {/* Nav and background stay mounted outside this — only the page
              content itself fades, so navigating never reads as leaving
              Vantage. Reduced-motion users get opacity only (or none), via
              the root MotionConfig. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: DURATION.expand, ease: EASE.out }}
            >
              <Outlet context={{ search }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
