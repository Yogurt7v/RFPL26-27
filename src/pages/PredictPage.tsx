import { useParams, useNavigate } from 'react-router-dom'
import { PredictionForm, type PredictionData } from '../components/PredictionForm'
import { schedule } from '../lib/schedule'

export function PredictPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()

  const match = schedule.find(m => m.id === matchId)

  if (!match) {
    return (
      <div className="page">
        <p>Матч не найден</p>
        <button onClick={() => navigate('/')}>Назад к матчам</button>
      </div>
    )
  }

  const handleSubmit = async (prediction: PredictionData) => {
    console.log('Prediction submitted:', prediction)
    // TODO: Сохранить прогноз в Supabase
    await new Promise(resolve => setTimeout(resolve, 100))
    alert('Прогноз сохранён!')
    navigate('/')
  }

  return (
    <div className="page">
      <h1>Прогноз на матч</h1>
      <PredictionForm
        matchId={match.id}
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        onSubmit={handleSubmit}
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
