import { createClient } from '@supabase/supabase-js'

// Пересчёт материализованного представления leaderboard.
// Вызывается при заходе на страницу лидерборда (service key, как у крона),
// чтобы не грузить матвью на каждом синке.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    return res.status(500).json({ error: 'Missing Supabase credentials' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { error } = await supabase.rpc('refresh_leaderboard')
    if (error) throw error

    return res.status(200).json({
      status: 'ok',
      ts: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Refresh leaderboard error:', error)
    return res.status(500).json({
      status: 'error',
      message: error.message,
    })
  }
}