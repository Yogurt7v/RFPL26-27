import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PredictionForm, type PredictionFormData } from '../components/PredictionForm'
import { savePrediction, deletePrediction, getPredictionForMatch, getMatchInfo, getMatchOtherPredictions, type OtherPrediction } from '../api/predictions'
import { schedule, isMatchOpen } from '../lib/schedule'
import { useAuth } from '../hooks/useAuth'

function isMatchFinished(matchDate: string, matchTime: string): boolean {
  const start = new Date(`${matchDate}T${matchTime}:00+03:00`)
  return Date.now() > start.getTime() + 2 * 60 * 60 * 1000
}

export function PredictPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const match = schedule.find(m => m.id === matchId)

  const { data: existingPrediction, isLoading: isLoadingPrediction } = useQuery({
    queryKey: ['predictions', 'detail', user?.id, match?.homeTeam, match?.awayTeam, match?.round],
    queryFn: () => getPredictionForMatch(user!.id, match!.homeTeam, match!.awayTeam, match!.round),
    enabled: !!user && !!match,
    staleTime: 30_000,
  })

  const { data: matchScores } = useQuery({
    queryKey: ['matches', 'info', match?.homeTeam, match?.awayTeam, match?.round],
    queryFn: () => getMatchInfo(match!.homeTeam, match!.awayTeam, match!.round),
    enabled: !!match,
    staleTime: 30_000,
    select: data => data?.homeScore != null || data?.awayScore != null
      ? { home: data.homeScore, away: data.awayScore }
      : undefined,
  })

  const { data: othersData } = useQuery({
    queryKey: ['predictions', 'others', matchScores?.id, user?.id],
    queryFn: () => getMatchOtherPredictions(matchScores!.id, user!.id),
    enabled: !!matchScores?.id && !!user,
    staleTime: 30_000,
  })

  const initialValues: PredictionFormData | null = existingPrediction
    ? {
        predictedHomeScore: existingPrediction.predictedHomeScore,
        predictedAwayScore: existingPrediction.predictedAwayScore,
        outcome: (existingPrediction.outcome as '1' | 'X' | '2') || null,
        homeGoalsThreshold: existingPrediction.homeGoalsThreshold,
        awayGoalsThreshold: existingPrediction.awayGoalsThreshold,
      }
    : null

  const saveMutation = useMutation({
    mutationFn: (prediction: PredictionFormData) =>
      savePrediction(user!.id, match!.homeTeam, match!.awayTeam, match!.round, prediction),
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () =>
      deletePrediction(user!.id, match!.homeTeam, match!.awayTeam, match!.round),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
      goBack()
    },
  })

  const handleSubmit = async (prediction: PredictionFormData): Promise<boolean> => {
    const ok = await saveMutation.mutateAsync(prediction)
    return ok
  }

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
        <div className="check check--skeleton">
          <div className="check__header">
            <div className="skeleton" />
          </div>
          <div className="check__match">
            <div className="check__teams">
              <div className="check__team">
                <div className="skeleton check__skeleton-logo" />
                <div className="skeleton check__skeleton-team-name" />
              </div>
              <span className="check__vs">vs</span>
              <div className="check__team check__team--right">
                <div className="skeleton check__skeleton-team-name" />
                <div className="skeleton check__skeleton-logo" />
              </div>
            </div>
          </div>
          <div className="check__sections">
            <div className="check__section">
              <div className="check__section-label"><div className="skeleton" /></div>
              <div className="check__skeleton-outcome">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            </div>
            <div className="check__section">
              <div className="check__section-label"><div className="skeleton" /></div>
              <div className="check__skeleton-score">
                <div className="skeleton" />
                <span className="check__skeleton-score-sep">:</span>
                <div className="skeleton" />
              </div>
            </div>
            <div className="check__section">
              <div className="check__section-label"><div className="skeleton" /></div>
              <div className="check__skeleton-goals-row">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
              <div className="check__skeleton-goals-row">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            </div>
          </div>
          <div className="check__footer">
            <div className="skeleton check__skeleton-submit" />
          </div>
        </div>
      </div>
    )
  }

  const matchClosed = !isMatchOpen(match)
  const finished = isMatchFinished(match.date, match.time)
  const otherPredictions: OtherPrediction[] = othersData?.predictions ?? []
  const otherCount = othersData?.count ?? 0
  const otherNames = othersData?.usernames ?? []
  const scores = matchScores ?? undefined

  if (matchClosed) {
    return (
      <div className="page">
        {initialValues ? (
          <>
            <PredictionForm
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onSaved={goBack}
              isFinished={finished}
              actualHomeScore={scores?.home ?? null}
              actualAwayScore={scores?.away ?? null}
              onDelete={deleteMutation.mutate}
            />
          </>
        ) : (
          <div className="predict-missed">
            <div className="predict-missed__score">
              <span>{match.homeTeam}</span>
              {scores?.home != null && scores?.away != null && (
                <span className="predict-missed__score-value">{scores.home}:{scores.away}</span>
              )}
              <span className="predict-missed__vs">vs</span>
              <span>{match.awayTeam}</span>
            </div>
            <p className="predict-missed__text">Вы не сделали прогноз на этот матч.</p>
          </div>
        )}

         {otherCount > 0 && !finished && (
           <div className="predict-others">
             <span className="predict-others__dot" />
             <span>{otherNames.join(', ')} {otherCount === 1 ? 'сделал' : 'сделали'} прогноз</span>
           </div>
         )}
 
          {otherCount > 0 && finished && (
            <div className="predict-others-table">
              <h3 className="predict-others-table__title">Прогнозы других игроков</h3>
              <div className="predict-others-table__header">
                <span>Игрок</span>
                <span>Исход</span>
                <span>Счёт</span>
                <span>Порог</span>
                <span>Очки</span>
              </div>
              {otherPredictions.map((p, i) => (
                <div key={i} className="predict-others-table__row">
                  <span className="predict-others-table__cell">{p.username}</span>
                  <span className="predict-others-table__cell">
                    {p.outcome ? (p.outcome === '1' ? 'П1' : p.outcome === 'X' ? 'Ничья' : 'П2') : '—'}
                  </span>
                  <span className="predict-others-table__cell">
                    {p.predictedHomeScore != null && p.predictedAwayScore != null
                      ? `${p.predictedHomeScore}:${p.predictedAwayScore}`
                      : '—'}
                  </span>
                  <span className="predict-others-table__cell">
                    {formatGoalsThreshold(p, match.homeTeam, match.awayTeam)}
                  </span>
                  <span className="predict-others-table__cell">{p.pointsEarned}</span>
                </div>
              ))}
            </div>
          )}
 
          <button
            className="btn btn--secondary predict-page__back"
            onClick={goBack}
          >
           Назад к матчам
         </button>
      </div>
    )
  }

  return (
    <div className="page">
      <PredictionForm
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onSaved={goBack}
        canEdit
        actualHomeScore={scores?.home ?? null}
        actualAwayScore={scores?.away ?? null}
        onDelete={deleteMutation.mutate}
      />
      {otherCount > 0 && (
        <div className="predict-others">
          <span className="predict-others__dot" />
          <span>{otherNames.join(', ')} {otherCount === 1 ? 'сделал' : 'сделали'} прогноз</span>
        </div>
      )}
      <button
        className="btn btn--secondary predict-page__back"
        onClick={goBack}
      >
        Назад к матчам
      </button>
    </div>
  )
}

function formatGoalsThreshold(
  p: OtherPrediction,
  homeTeam: string,
  awayTeam: string
): string {
  const parts: string[] = []
  if (p.homeGoalsThreshold != null) parts.push(`${homeTeam} ≥ ${p.homeGoalsThreshold}`)
  if (p.awayGoalsThreshold != null) parts.push(`${awayTeam} ≥ ${p.awayGoalsThreshold}`)
  return parts.length > 0 ? parts.join(', ') : '—'
}

export default PredictPage
