import { createClient } from '@supabase/supabase-js'
import { installPerfFetch } from './perf'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

installPerfFetch(supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    timeout: 60000,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store',
    },
  },
})
