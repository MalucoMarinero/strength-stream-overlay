export enum AttemptStatus {
  Nil = "nil",
  Declared = "declared",
  Success = "success",
  Fail = "fail",
}


export interface Attempt {
  weight?: number
  status: AttemptStatus
}

export interface ScorecardLine {
  lot: number
  name: string
  team: string
  phases: {[key: string]: Array<Attempt>}
}

export interface CompetitionData {
  clock: string
  competition_phase: string
  scorecard: {[key: string]: ScorecardLine}
}


export interface LiftOrderLine {
  lot: number
  name: string
  team: string
  attemptNumber: number
  attemptWeight: number
  attempts: Array<Attempt>
}

export function getLifterOrder(data: CompetitionData): LiftOrderLine[] {
  const lines = Object.keys(data.scorecard).map((lotKey) => {
    const line = data.scorecard[lotKey]
    const attempts = line.phases[data.competition_phase]
    const attemptNumber = attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).length
    const attemptWeight = Math.max(
      ...attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).map(a => a.weight)
    )
    const liftLine: LiftOrderLine = {
      lot: line.lot,
      name: line.name,
      team: line.team,
      attempts: attempts,
      attemptNumber,
      attemptWeight,
    }

    return liftLine
  })

  lines.sort((a, b) => {
    if (a.attemptWeight != b.attemptWeight) {
      return a.attemptWeight - b.attemptWeight
    }
    if (a.attemptNumber != b.attemptNumber) {
      return a.attemptNumber - b.attemptNumber
    }
    return a.lot - b.lot
  })

  return lines
}
