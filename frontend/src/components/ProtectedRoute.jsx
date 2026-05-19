import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute wraps routes that require authentication.
 * Shows a loading state while the initial session check runs.
 * Redirects to /signin if no authenticated session exists.
 *
 * Usage in main.jsx:
 *   <Route path="/app" element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Still checking for existing session — show nothing to avoid flash
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  // No authenticated user — redirect to sign in
  if (!user) {
    return <Navigate to="/signin" replace />
  }

  // Authenticated — render the protected page
  return children
}
