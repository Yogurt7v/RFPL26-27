export type Outcome = '1' | 'X' | '2'

export interface Prediction {
  predictedHomeScore?: number | null
  predictedAwayScore?: number | null
  outcome?: Outcome | null
  homeGoalsThreshold?: number | null
  awayGoalsThreshold?: number | null
}

export function validatePrediction(prediction: Prediction): string[] {
  const errors: string[] = []

  if (prediction.predictedHomeScore != null && prediction.predictedHomeScore < 0) {
    errors.push('Счёт хозяев не может быть отрицательным')
  }
  if (prediction.predictedAwayScore != null && prediction.predictedAwayScore < 0) {
    errors.push('Счёт гостей не может быть отрицательным')
  }
  if (prediction.homeGoalsThreshold != null && prediction.homeGoalsThreshold < 1) {
    errors.push('Порог голов хозяев должен быть не менее 1')
  }
  if (prediction.awayGoalsThreshold != null && prediction.awayGoalsThreshold < 1) {
    errors.push('Порог голов гостей должен быть не менее 1')
  }
  if (prediction.outcome != null && !['1', 'X', '2'].includes(prediction.outcome)) {
    errors.push('Исход должен быть 1, X или 2')
  }

  return errors
}
