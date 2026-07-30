import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PredictionForm, type PredictionFormData } from '../components/PredictionForm'
import { Spinner } from '../components/Spinner'
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
  const [initialValues, setInitialValues] = useState<PredictionFormData | null>(null)
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(true)
  const [matchScores, setMatchScores] = useState<{ home: number | null; away: number | null } | null>(null)

  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([])
  const [otherCount, setOtherCount] = useState(0)
  const [otherNames, setOtherNames] = useState<string[]>([])

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
            homeGoalsThreshold: existing.homeGoalsThreshold,
            awayGoalsThreshold: existing.awayGoalsThreshold,
          })
          if (existing.actualHomeScore != null || existing.actualAwayScore != null) {
            setMatchScores({ home: existing.actualHomeScore, away: existing.actualAwayScore })
          }
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

  useEffect(() => {
    if (!user || !match) return

    let cancelled = false

    async function loadOthers() {
      const matchInfo = await getMatchInfo(match!.homeTeam, match!.awayTeam, match!.round)
      if (!matchInfo || cancelled) return

      if (!cancelled && matchInfo.homeScore != null && matchInfo.awayScore != null) {
        setMatchScores({ home: matchInfo.homeScore, away: matchInfo.awayScore })
      }

      const info = await getMatchOtherPredictions(matchInfo.id, user!.id)
      if (!cancelled) {
        setOtherPredictions(info.predictions)
        setOtherCount(info.count)
        setOtherNames(info.usernames)
      }
    }

    loadOthers()
    return () => { cancelled = true }
  }, [user, match, isLoadingPrediction])

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
        homeGoalsThreshold: prediction.homeGoalsThreshold,
        awayGoalsThreshold: prediction.awayGoalsThreshold,
      }
    )
  }

  if (isLoadingPrediction) {
    return <div className="page"><Spinner /></div>
  }

  const matchClosed = !isMatchOpen(match)

  if (matchClosed) {
    const finished = isMatchFinished(match.date, match.time)

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
              actualHomeScore={matchScores?.home ?? null}
              actualAwayScore={matchScores?.away ?? null}
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
                {matchScores?.home != null && matchScores?.away != null && (
                  <span className="check__score">{matchScores.home}:{matchScores.away}</span>
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
               {otherNames.join(', ')} {otherCount === 1 ? 'сделал' : otherCount < 5 ? 'сделали' : 'сделали'} прогноз
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
        actualHomeScore={matchScores?.home ?? null}
        actualAwayScore={matchScores?.away ?? null}
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
