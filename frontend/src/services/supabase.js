import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in frontend/.env'
  )
}

// Single Supabase client instance — used only for Auth on the frontend.
// All database operations go through the Flask backend (never direct from browser).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,       // Automatically refresh JWT before expiry
    persistSession: true,         // Keep session across page refreshes
    detectSessionInUrl: true      // Handle OAuth redirects if added later
  }
})
