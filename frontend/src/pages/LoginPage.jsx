import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import LiveOpportunitiesPreview from '../components/auth/LiveOpportunitiesPreview.jsx'
import GlowField from '../components/common/GlowField.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-vantage-hero text-xs font-bold text-vantage-ctaText">
        V
      </span>
      <span className="text-lg font-semibold tracking-tight text-vantage-text">Vantage</span>
    </span>
  )
}

// Demo auth: no backend yet, so any credentials are accepted and the "session"
// lives in localStorage. It gates the UI only — see AuthContext for the caveat.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where the guard bounced them from, else straight to the EV Finder.
  const redirectTo = location.state?.from?.pathname || '/ev-finder'

  async function signIn(credentials) {
    await login(credentials)
    navigate(redirectTo, { replace: true })
  }

  function handleSubmit(e) {
    e.preventDefault()
    signIn({ email })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-vantage-bg lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <GlowField variant="wide" />

        <Link to="/" className="relative z-10">
          <Wordmark />
        </Link>

        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <span className="inline-block rounded-full border border-vantage-accent/30 bg-vantage-accent/10 px-4 py-1.5 text-xs font-medium text-vantage-accent">
              Sports markets, decoded
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-vantage-text xl:text-5xl">
              A clearer read
              <br />
              <span className="text-gradient">on every edge.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-vantage-textDim">
              Your markets, picks, and signals — all in one place.
            </p>
          </div>

          <LiveOpportunitiesPreview />
        </div>

        <div className="relative z-10">
          <p className="text-sm font-medium text-vantage-text">Trusted signals. Confident decisions.</p>
          <p className="text-xs text-vantage-textDim">Smarter markets start here.</p>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-vantage-nav px-8 py-16">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(45% 40% at 85% 15%, rgba(206,99,233,0.14) 0%, transparent 60%), radial-gradient(40% 35% at 90% 90%, rgba(99,214,165,0.10) 0%, transparent 60%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-2xl border border-vantage-border bg-vantage-surface/60 p-12 shadow-[0_20px_60px_-20px_rgba(121,75,212,0.35)] backdrop-blur"
        >
          <Wordmark className="mb-10 lg:hidden" />

          <h2 className="text-2xl font-semibold text-vantage-text sm:text-3xl">Welcome back.</h2>
          <p className="mt-2 text-base text-vantage-textDim">Sign in to find your next edge.</p>

          {location.state?.from && (
            <p className="mt-5 rounded-lg border border-vantage-accent/30 bg-vantage-accent/10 px-5 py-4 text-sm text-vantage-text">
              Sign in to open{' '}
              <span className="font-medium">
                {location.state.from.pathname.startsWith('/portfolio')
                  ? 'your portfolio'
                  : 'the EV Finder'}
              </span>
              .
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-vantage-text">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-16 w-full rounded-lg border border-vantage-border bg-vantage-surface px-5 text-base text-vantage-text placeholder:text-vantage-textDim/70 focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent"
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-vantage-text">Password</span>
                <button
                  type="button"
                  className="flex min-h-[56px] items-center text-sm font-medium text-vantage-accent hover:underline"
                  onClick={() => alert('Password reset isn’t wired up in this demo yet.')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-16 w-full rounded-lg border border-vantage-border bg-vantage-surface px-5 pr-20 text-base text-vantage-text placeholder:text-vantage-textDim/70 focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 flex min-h-[46px] -translate-y-1/2 items-center text-sm font-medium text-vantage-accent hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              className="mt-1.5 flex min-h-[62px] w-full items-center justify-center rounded-lg bg-vantage-accent text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90"
            >
              Sign in
            </motion.button>

            <p className="rounded-lg border border-vantage-border bg-vantage-surface px-5 py-4 text-sm leading-relaxed text-vantage-textDim">
              <span className="font-medium text-vantage-text">Demo build:</span> no auth backend
              yet, so any email and password will sign you in.
            </p>

            <div className="flex items-center gap-4 py-1.5">
              <div className="h-px flex-1 bg-vantage-border" />
              <span className="text-sm uppercase tracking-wide text-vantage-textDim">
                or continue with
              </span>
              <div className="h-px flex-1 bg-vantage-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => signIn({ provider: 'google' })}
                className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-lg border border-vantage-border bg-vantage-surface text-base font-medium text-vantage-text hover:border-vantage-borderLight"
              >
                <GoogleMark />
                Google
              </button>
              <button
                type="button"
                onClick={() => signIn({ provider: 'apple' })}
                className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-lg border border-vantage-border bg-vantage-surface text-base font-medium text-vantage-text hover:border-vantage-borderLight"
              >
                <AppleMark />
                Apple
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-base text-vantage-textDim">
            New to Vantage?{' '}
            <button
              type="button"
              onClick={() => alert('Account creation isn’t wired up in this demo yet.')}
              className="font-semibold text-vantage-accent hover:underline"
            >
              Create an account
            </button>
          </p>

          <p className="mt-12 text-center text-xs leading-relaxed text-vantage-textDim">
            By continuing, you agree to our Terms and Privacy Policy. Vantage is a market-analysis
            tool — it does not place trades on your behalf.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h11.9c-.5 2.8-2.1 5.2-4.4 6.8v5.6h7.1c4.2-3.9 6.5-9.6 6.5-16.9z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.3 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-3.9s.2-2.6.7-3.9v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.7z" />
      <path
        fill="#EA4335"
        d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.3 2 7.9 7 4.3 14.4l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}
