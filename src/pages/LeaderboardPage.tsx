import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { useAuth } from '../hooks/useAuth'
import { cacheGet, cacheSet } from '../api/cache'

const REFRESH_COOLDOWN_MS = 15 * 60_000

export function LeaderboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (cacheGet('leaderboard_refresh')) return
    cacheSet('leaderboard_refresh', true, REFRESH_COOLDOWN_MS)

    let cancelled = false
    fetch('/api/refresh-leaderboard')
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (cancelled || body?.status !== 'ok') return
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [queryClient])

  return (
    <div className="page">
      <LeaderboardTable currentUserId={user?.id} />
    </div>
  )
}

export default LeaderboardPage
