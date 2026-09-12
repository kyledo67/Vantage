import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx'
import DashboardSidebar from '../components/dashboard/DashboardSidebar.jsx'
import ToastHost from '../components/dashboard/ToastHost.jsx'
import { getAccount } from '../services/opportunities.js'
import { useAsync } from '../hooks/useAsync.js'

/**
 * Authenticated shell: fixed 72px header, fixed 220px sidebar below it on
 * desktop, slide-out drawer on mobile. Search state lives here so the header
 * can drive the page's query via Outlet context.
 */
export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')

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
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 top-[72px] z-50 w-[220px] border-r border-vantage-border lg:hidden"
            >
              <DashboardSidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="pt-[72px] lg:pl-[220px]">
        <div className="p-4 sm:p-6">
          <Outlet context={{ search }} />
        </div>
      </main>

      <ToastHost />
    </div>
  )
}
