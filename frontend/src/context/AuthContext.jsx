import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

// Create the context
const AuthContext = createContext(null)

/**
 * AuthProvider wraps the entire app and provides:
 *   user    - The current Supabase user object (null if not signed in)
 *   session - The current session with access_token (null if not signed in)
 *   loading - True while the initial session check is running
 *   signUp  - Function to register a new account
 *   signIn  - Function to sign in with email + password
 *   signOut - Function to sign out and clear session
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for an existing session on app load (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = { user, session, loading, signUp, signIn, signOut }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth — custom hook to access auth context in any component.
 * Usage: const { user, session, signIn, signOut } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
