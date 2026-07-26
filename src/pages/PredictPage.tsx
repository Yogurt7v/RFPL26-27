import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PredictionForm, type PredictionFormData } from '../components/PredictionForm'
import { Spinner } from '../components/Spinner'
import { savePrediction, getPredictionForMatch } from '../api/predictions'
import { schedule } from '../lib/schedule'
import { useAuth } from '../hooks/useAuth'

export function PredictPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const match = schedule.find(m => m.id === matchId)
  const [initialValues, setInitialValues] = useState<PredictionFormData | null>(null)
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(true)

  useEffect(() => {
    if (!user || !match) {
      setIsLoadingPrediction(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const existing = await getPredictionForMatch(user!.id, match!.homeTeam, match!.awayTeam, match!.round)
        if (!cancelled && existing) {
          setInitialValues({
            predictedHomeScore: existing.predictedHomeScore,
            predictedAwayScore: existing.predictedAwayScore,
            outcome: (existing.outcome as '1' | 'X' | '2') || null,
            goalsTeam: (existing.goalsTeam as 'home' | 'away') || null,
            goalsThreshold: existing.goalsThreshold,
          })
        }
      } catch (err) {
        console.error('Error loading prediction:', err)
      } finally {
        if (!cancelled) setIsLoadingPrediction(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user, match])

  if (!match) {
    return (
      <div className="page">
        <p>Матч не найден</p>
        <button onClick={() => navigate('/')}>Назад к матчам</button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <p>Войдите, чтобы сделать прогноз</p>
        <button onClick={() => navigate('/login')}>Войти</button>
      </div>
    )
  }

  const handleSubmit = async (prediction: PredictionFormData): Promise<boolean> => {
    return await savePrediction(
      user.id,
      match.homeTeam,
      match.awayTeam,
      match.round,
      {
        predictedHomeScore: prediction.predictedHomeScore,
        predictedAwayScore: prediction.predictedAwayScore,
        outcome: prediction.outcome,
        goalsTeam: prediction.goalsTeam,
        goalsThreshold: prediction.goalsThreshold,
      }
    )
  }

  if (isLoadingPrediction) {
    return <div className="page"><Spinner /></div>
  }

  return (
    <div className="page">
      <PredictionForm
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onSaved={() => navigate('/')}
      />
      <button
        className="btn btn--secondary"
        onClick={() => navigate('/')}
        style={{ marginTop: '16px', width: '100%' }}
      >
        Назад к матчам
      </button>
    </div>
  )
}

export default PredictPage
