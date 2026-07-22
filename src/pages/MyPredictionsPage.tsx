import { PredictionResults } from '../components/PredictionResults'
import { useAuth } from '../hooks/useAuth'

export function MyPredictionsPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="page">
      <PredictionResults userId={user.id} />
    </div>
  )
}
