import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import LoadingSpinner from '../common/LoadingSpinner.jsx'

// Route guard for signed-in-only pages. Remembers where the user was headed so
// the login page can send them back there afterwards.
export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner label="Checking your session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
