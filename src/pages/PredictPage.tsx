import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PredictionForm, type PredictionFormData } from '../components/PredictionForm'
import { savePrediction, deletePrediction, getPredictionForMatch, getMatchOtherPredictions, type PredictionData } from '../api/predictions'
import { getResults, getCachedResults, getSchedule, type ScheduleEntry } from '../api/matches'
import { useAuth } from '../hooks/useAuth'
import type { SaveResult } from '../api/predictions'

// Вспомогательная функция для проверки, не начался ли матч
function isMatchOpen(match: ScheduleEntry): boolean {
  const matchStart = new Date(`${match.date}T${match.time}:00+03:00`)
  return Date.now() < matchStart.getTime()
}

export function PredictPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const { data: matches = [] } = useQuery({
    queryKey: ['schedule'],
    queryFn: getSchedule,
    staleTime: 5 * 60 * 1000,
  })

  const match = matches.find(m => m.id === matchId)

  const { data: existingPrediction, isLoading: isLoadingPrediction } = useQuery({
    queryKey: ['predictions', 'detail', user?.id, match?.homeTeam, match?.awayTeam, match?.round],
    queryFn: () => getPredictionForMatch(user!.id, match!.homeTeam, match!.awayTeam, match!.round),
    enabled: !!user && !!match,
    staleTime: 30_000,
  })

  const { data: allResults = [] } = useQuery({
    queryKey: ['matches', 'results'],
    queryFn: getResults,
    staleTime: 15 * 60 * 1000,
    initialData: getCachedResults,
  })

  // Загружаем ставки других игроков для завершённых матчей
  const matchIdNum = match ? parseInt(match.id) : null
  const { data: otherPredictions } = useQuery({
    queryKey: ['predictions', 'other', matchIdNum, user?.id],
    queryFn: () => getMatchOtherPredictions(matchIdNum!, user!.id),
    enabled: !!matchIdNum && !!user?.id && !isMatchOpen(match!),
    staleTime: 5 * 60 * 1000,
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (prediction: PredictionFormData) =>
      savePrediction(user!.id, match!.homeTeam, match!.awayTeam, match!.round, prediction as PredictionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      deletePrediction(user!.id, match!.homeTeam, match!.awayTeam, match!.round),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
      goBack()
    },
  })

  const handleSubmit = async (prediction: PredictionFormData): Promise<SaveResult> =>
    saveMutation.mutateAsync(prediction)

  if (!match) {
    return (
      <div className="page">
        <p>Матч не найден</p>
        <button onClick={goBack}>Назад к матчам</button>
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

  if (isLoadingPrediction) {
    return (
      <div className="page">
        <div className="check">
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  const initialValues: PredictionFormData | null = existingPrediction
    ? {
        predictedHomeScore: existingPrediction.predictedHomeScore,
        predictedAwayScore: existingPrediction.predictedAwayScore,
        outcome: (existingPrediction.outcome as '1' | 'X' | '2') || null,
        homeGoalsThreshold: existingPrediction.homeGoalsThreshold,
        awayGoalsThreshold: existingPrediction.awayGoalsThreshold,
      }
    : null

  const matchClosed = !isMatchOpen(match)

  // Находим результат матча
  const matchResult = allResults.find(
    r => r.homeTeam === match.homeTeam && r.awayTeam === match.awayTeam && r.round === match.round
  )
  const isFinished = matchResult?.status === 'FINISHED'

  return (
    <div className="page">
      <PredictionForm
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onSaved={goBack}
        canEdit={!matchClosed}
        isFinished={isFinished}
        actualHomeScore={matchResult?.homeScore ?? null}
        actualAwayScore={matchResult?.awayScore ?? null}
        points={existingPrediction?.pointsEarned ?? null}
        onDelete={deleteMutation.mutate}
      />
      <button className="btn btn--secondary predict-page__back" onClick={goBack}>
        Назад к матчам
      </button>
    </div>
  )
}

export default PredictPage
