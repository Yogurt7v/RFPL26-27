import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

const originalFetch = window.fetch

window.fetch = async function (input, init) {
  const maxRetries = 2
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await originalFetch(input, init)
    } catch (err) {
      if (i === maxRetries) throw err
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  throw new Error('unreachable')
}

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
