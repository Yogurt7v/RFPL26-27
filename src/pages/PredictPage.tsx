import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PredictionForm, type PredictionFormData } from '../components/PredictionForm'
import { savePrediction, getPredictionForMatch, getMatchInfo, getMatchOtherPredictions, type OtherPrediction } from '../api/predictions'
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
            />
          </>
        ) : (
          <div className="check">
            <div className="check__header">
              <span className="check__title">Прогноз не сделан</span>
            </div>
            <div className="check__match">
              <div className="check__teams">
                <span>{match.homeTeam}</span>
                {scores?.home != null && scores?.away != null && (
                  <span className="check__score">{scores.home}:{scores.away}</span>
                )}
                <span className="check__vs">vs</span>
                <span>{match.awayTeam}</span>
              </div>
            </div>
            <div className="check__divider" />
            <p style={{ padding: '12px 16px', color: 'var(--color-secondary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
              Вы не сделали прогноз на этот матч.
            </p>
          </div>
        )}

         {otherCount > 0 && !finished && (
           <div className="check" style={{ marginTop: '12px' }}>
             <div className="check__header">
               <span className="check__title">Другие игроки</span>
             </div>
             <p style={{ padding: '12px 16px', color: 'var(--color-secondary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
               {otherNames.join(', ')} {otherCount === 1 ? 'сделал' : 'сделали'} прогноз
             </p>
           </div>
         )}

         {otherCount > 0 && finished && (
           <div className="check" style={{ marginTop: '12px' }}>
             <div className="check__header">
               <span className="check__title">Прогнозы других игроков</span>
             </div>
             <div className="check__others">
               <div className="check__others-header">
                 <span className="check__others-cell">Игрок</span>
                 <span className="check__others-cell">Исход</span>
                 <span className="check__others-cell">Счёт</span>
                 <span className="check__others-cell">Порог</span>
                 <span className="check__others-cell">Очки</span>
               </div>
               {otherPredictions.map((p, i) => (
                 <div key={i} className="check__others-row">
                   <span className="check__others-cell">{p.username}</span>
                   <span className="check__others-cell">
                     {p.outcome ? (p.outcome === '1' ? 'П1' : p.outcome === 'X' ? 'Ничья' : 'П2') : '—'}
                   </span>
                   <span className="check__others-cell">
                     {p.predictedHomeScore != null && p.predictedAwayScore != null
                       ? `${p.predictedHomeScore}:${p.predictedAwayScore}`
                       : '—'}
                   </span>
                   <span className="check__others-cell">
                     {formatGoalsThreshold(p, match.homeTeam, match.awayTeam)}
                   </span>
                   <span className="check__others-cell">{p.pointsEarned}</span>
                 </div>
               ))}
             </div>
           </div>
         )}

         <button
           className="btn btn--secondary"
           onClick={goBack}
           style={{ marginTop: '12px', width: '100%' }}
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
      />
      {otherCount > 0 && (
        <div className="check" style={{ marginTop: '12px' }}>
          <div className="check__header">
            <span className="check__title">Другие игроки</span>
          </div>
          <p style={{ padding: '12px 16px', color: 'var(--color-secondary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            {otherNames.join(', ')} {otherCount === 1 ? 'сделал' : 'сделали'} прогноз
          </p>
        </div>
      )}
      <button
        className="btn btn--secondary"
        onClick={goBack}
        style={{ marginTop: '16px', width: '100%' }}
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
