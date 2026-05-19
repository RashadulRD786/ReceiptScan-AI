import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      toast.success('Signed out successfully')
    } catch (err) {
      toast.error('Failed to sign out')
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={user ? '/app' : '/'} className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <span className="font-bold text-gray-900 text-lg">
              ReceiptScan <span className="text-indigo-600">AI</span>
            </span>
          </Link>

          {/* Navigation */}
          {user ? (
            /* Authenticated navigation */
            <div className="flex items-center gap-6">
              <Link
                to="/app"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Scanner
              </Link>
              <Link
                to="/app/dashboard"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-400 hidden sm:block truncate max-w-[160px]">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Public navigation */
            <div className="flex items-center gap-3">
              <Link
                to="/signin"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  )
}
