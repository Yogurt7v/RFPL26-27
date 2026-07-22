import { LeaderboardTable } from '../components/LeaderboardTable'
import { useAuth } from '../hooks/useAuth'

export function LeaderboardPage() {
  const { user } = useAuth()

  return (
    <div className="page">
      <LeaderboardTable currentUserId={user?.id} />
    </div>
  )
}
