import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow GET (for cron trigger)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    return res.status(500).json({ error: 'Missing Supabase credentials' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store',
      },
    },
  })

  try {
    // Lightweight non-cached ping to keep the database awake.
    // .lt('last_update', now) is always true but makes the SQL unique per call,
    // so the request always hits Postgres instead of any cache layer.
    const { count, error } = await supabase
      .from('matches')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
      .lt('last_update', new Date().toISOString())

    if (error) {
      throw error
    }

    return res.status(200).json({
      status: 'ok',
      rows: count,
      ts: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Keepalive error:', error)
    return res.status(500).json({
      status: 'error',
      message: error.message,
    })
  }
}
