import { useState } from 'react'
import { useActionState } from 'react'
import { getTeamByName } from '../lib/teams'
import { validatePrediction, type Outcome, type GoalsTeam } from '../lib/scoring'

interface PredictionFormProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  onSubmit: (prediction: PredictionData) => Promise<void>
}

export interface PredictionData {
  matchId: string
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: Outcome | null
  goalsTeam: GoalsTeam | null
  goalsThreshold: number | null
}

type PredictionType = 'score' | 'outcome' | 'goals'

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  onSubmit,
}: PredictionFormProps) {
  const [predictionType, setPredictionType] = useState<PredictionType>('score')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [outcome, setOutcome] = useState<Outcome | ''>('')
  const [goalsTeam, setGoalsTeam] = useState<GoalsTeam | ''>('')
  const [goalsThreshold, setGoalsThreshold] = useState('')

  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  const [formState, formAction, isPending] = useActionState(
    async (_prev: string | null, _formData: FormData) => {
      const prediction: PredictionData = {
        matchId,
        predictedHomeScore: null,
        predictedAwayScore: null,
        outcome: null,
        goalsTeam: null,
        goalsThreshold: null,
      }

      if (predictionType === 'score') {
        if (!homeScore || !awayScore) {
          return 'Введите счёт'
        }
        prediction.predictedHomeScore = parseInt(homeScore)
        prediction.predictedAwayScore = parseInt(awayScore)
      } else if (predictionType === 'outcome') {
        if (!outcome) {
          return 'Выберите исход'
        }
        prediction.outcome = outcome as Outcome
      } else if (predictionType === 'goals') {
        if (!goalsTeam || !goalsThreshold) {
          return 'Выберите команду и порог'
        }
        prediction.goalsTeam = goalsTeam as GoalsTeam
        prediction.goalsThreshold = parseInt(goalsThreshold)
      }

      const errors = validatePrediction(prediction)
      if (errors.length > 0) {
        return errors[0]
      }

      await onSubmit(prediction)
      return null
    },
    null
  )

  return (
    <div className="prediction-form">
      <div className="prediction-form__header">
        <div className="prediction-form__team">
          {home && <img src={home.logo} alt={home.name} className="prediction-form__logo" />}
          <span>{homeTeam}</span>
        </div>
        <span className="prediction-form__vs">vs</span>
        <div className="prediction-form__team">
          <span>{awayTeam}</span>
          {away && <img src={away.logo} alt={away.name} className="prediction-form__logo" />}
        </div>
      </div>

      <div className="prediction-form__tabs">
        <button
          className={predictionType === 'score' ? 'active' : ''}
          onClick={() => setPredictionType('score')}
        >
          Точный счёт
        </button>
        <button
          className={predictionType === 'outcome' ? 'active' : ''}
          onClick={() => setPredictionType('outcome')}
        >
          Исход
        </button>
        <button
          className={predictionType === 'goals' ? 'active' : ''}
          onClick={() => setPredictionType('goals')}
        >
          Порог голов
        </button>
      </div>

      <form action={formAction}>
        {predictionType === 'score' && (
          <div className="prediction-form__score">
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="0"
              className="prediction-form__score-input"
            />
            <span className="prediction-form__score-separator">:</span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="0"
              className="prediction-form__score-input"
            />
          </div>
        )}

        {predictionType === 'outcome' && (
          <div className="prediction-form__outcome">
            <button
              type="button"
              className={outcome === '1' ? 'active' : ''}
              onClick={() => setOutcome('1')}
            >
              П1
            </button>
            <button
              type="button"
              className={outcome === 'X' ? 'active' : ''}
              onClick={() => setOutcome('X')}
            >
              Ничья
            </button>
            <button
              type="button"
              className={outcome === '2' ? 'active' : ''}
              onClick={() => setOutcome('2')}
            >
              П2
            </button>
          </div>
        )}

        {predictionType === 'goals' && (
          <div className="prediction-form__goals">
            <select
              value={goalsTeam}
              onChange={e => setGoalsTeam(e.target.value as GoalsTeam | '')}
            >
              <option value="">Команда</option>
              <option value="home">{homeTeam}</option>
              <option value="away">{awayTeam}</option>
            </select>
            <span className="prediction-form__goals-text">забьёт не менее</span>
            <input
              type="number"
              min="1"
              value={goalsThreshold}
              onChange={e => setGoalsThreshold(e.target.value)}
              placeholder="1"
              className="prediction-form__goals-input"
            />
            <span className="prediction-form__goals-text">голов</span>
          </div>
        )}

        <button type="submit" className="prediction-form__submit" disabled={isPending}>
          {isPending ? 'Отправка...' : 'Отправить прогноз'}
        </button>

        {formState && <div className="prediction-form__error">{formState}</div>}
      </form>
    </div>
  )
}
