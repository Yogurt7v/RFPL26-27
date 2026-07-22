export const SCORING = {
  EXACT_SCORE: 5,
  OUTCOME: 3,
  MAX_POINTS_PER_MATCH: 8,
} as const

export type Outcome = '1' | 'X' | '2'
export type GoalsTeam = 'home' | 'away'

export interface Prediction {
  predictedHomeScore?: number | null
  predictedAwayScore?: number | null
  outcome?: Outcome | null
  goalsTeam?: GoalsTeam | null
  goalsThreshold?: number | null
}

export interface MatchResult {
  homeScore: number
  awayScore: number
}

export function calculatePoints(
  prediction: Prediction,
  result: MatchResult
): number {
  let points = 0

  const actualOutcome: Outcome =
    result.homeScore > result.awayScore
      ? '1'
      : result.homeScore === result.awayScore
        ? 'X'
        : '2'

  if (prediction.predictedHomeScore != null && prediction.predictedAwayScore != null) {
    if (
      prediction.predictedHomeScore === result.homeScore &&
      prediction.predictedAwayScore === result.awayScore
    ) {
      points += SCORING.EXACT_SCORE
    }

    const predictedOutcome: Outcome =
      prediction.predictedHomeScore > prediction.predictedAwayScore
        ? '1'
        : prediction.predictedHomeScore === prediction.predictedAwayScore
          ? 'X'
          : '2'

    if (predictedOutcome === actualOutcome) {
      points += SCORING.OUTCOME
    }
  }

  if (
    prediction.outcome != null &&
    (prediction.predictedHomeScore == null || prediction.predictedAwayScore == null)
  ) {
    if (prediction.outcome === actualOutcome) {
      points += SCORING.OUTCOME
    }
  }

  if (prediction.goalsTeam != null && prediction.goalsThreshold != null) {
    const actualGoals =
      prediction.goalsTeam === 'home' ? result.homeScore : result.awayScore
    if (actualGoals >= prediction.goalsThreshold) {
      points += prediction.goalsThreshold
    }
  }

  return points
}

export function validatePrediction(prediction: Prediction): string[] {
  const errors: string[] = []

  if (prediction.predictedHomeScore != null && prediction.predictedHomeScore < 0) {
    errors.push('Счёт хозяев не может быть отрицательным')
  }
  if (prediction.predictedAwayScore != null && prediction.predictedAwayScore < 0) {
    errors.push('Счёт гостей не может быть отрицательным')
  }
  if (prediction.goalsThreshold != null && prediction.goalsThreshold < 1) {
    errors.push('Порог голов должен быть не менее 1')
  }
  if (prediction.outcome != null && !['1', 'X', '2'].includes(prediction.outcome)) {
    errors.push('Исход должен быть 1, X или 2')
  }

  return errors
}
