import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

// Wraps every page except full-bleed screens (e.g. auth) that manage their own chrome.
export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
