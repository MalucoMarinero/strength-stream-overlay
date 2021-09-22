import deepDiff from 'deep-diff'

export enum DataSources {
  NoonanCMS = 'noonan-cms'
}

export interface CompleteServerState {
  config: Config
  status: StreamStatus
  data: {
    competition: CompetitionData
    events: CompetitionEvent[]
  }
}

export interface Config {
  src: {
    type: DataSources
    path?: string
    target?: string
  }
  // upcoming: {
  //   title: string
  //   count: number
  //   current_title: string
  // }
}

export enum StreamState {
  NoSource = "no-source",
  ErrorFromSource = "error-from-source",
  Running = "running",
}

export interface StreamStatus {
  state: StreamState
  message?: string
}

export const initialConfig: Config = {
  src: {
    type: DataSources.NoonanCMS,
    path: "",
    target: "",
  }
}

export enum CompetitionEventType {
  SuccessfulLift,
  FailedLift,
  DeclarationChange,
  PhaseEnd,
}

export interface CompetitionEvent {
  event_type: CompetitionEventType
  expiry: number
  data: any
}

export enum AttemptStatus {
  Nil = "nil",
  Declared = "declared",
  Success = "success",
  Pass = "pass",
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
  scoredWeight?: number
  attemptNumber?: number
  attemptWeight?: number
  attemptProgression?: number
  attempts: Array<Attempt>
}

export interface PhaseScorecardLine {
  lot: number
  name: string
  team: string
  runningTotal?: number
  scoredWeight?: number
  attemptNumber?: number
  attemptWeight?: number
  attempts: Array<Attempt>
}

export interface TotalScorecardLine {
  lot: number
  name: string
  team: string
  total?: number
  phases: {[key: string]: Array<Attempt>}
}

export function getEventsFromDiff(before: CompetitionData, after: CompetitionData, timestamp: number) {
  const events: CompetitionEvent[] = []
  const diff = deepDiff.diff(before, after)

  // phase check
  if (before && before.competition_phase && after.scorecard) {
    const phaseCompleted = Object.keys(after.scorecard).every((lot) => {
      const line = after.scorecard[lot]
      return line.phases[before.competition_phase].every((attempt) => {
        return [
          AttemptStatus.Fail,
          AttemptStatus.Pass,
          AttemptStatus.Success,
        ].indexOf(attempt.status) != -1
      })
    })

    if (phaseCompleted) {
      events.push({
        event_type: CompetitionEventType.PhaseEnd,
        data: {
          phaseEnded: before.competition_phase,
        },
        expiry: timestamp + 60000,
      })
    }
  }

  if (diff) {
    diff.forEach((change: any) => {
      if (change.path && change.path[change.path.length - 1] == "weight") {
        if (change.lhs && change.rhs) {
          events.push({
            event_type: CompetitionEventType.DeclarationChange,
            data: {
              lotKey: change.path[1],
              previousWeight: change.lhs,
              newWeight: change.rhs,
            },
            expiry: timestamp + 5000,
          })
        }
      }
      if (change.lhs == "declared" && change.rhs == "success") {
        events.push({
          event_type: CompetitionEventType.SuccessfulLift,
          data: {
            lotKey: change.path[1],
            competitionPhase: change.path[3],
            attempt: change.path[4],
          },
          expiry: timestamp + 5000,
        })
      }
      if (change.lhs == "declared" && change.rhs == "fail") {
        events.push({
          event_type: CompetitionEventType.FailedLift,
          data: {
            lotKey: change.path[1],
            competitionPhase: change.path[3],
            attempt: change.path[4],
          },
          expiry: timestamp + 5000,
        })
      }
    })
  }

  return events
}

export function getLifterOrder(data: CompetitionData): LiftOrderLine[] {
  const lines = Object.keys(data.scorecard)
    .map((lotKey) => data.scorecard[lotKey])
    .filter((line) => {
      const attempts = line.phases[data.competition_phase]
      return attempts.filter((attempt) => attempt.status == AttemptStatus.Declared).length > 0
    })
    .map(line => {
      const attempts = line.phases[data.competition_phase]
      let scoredWeight = 0
      let attemptProgression = 0;
      attempts.forEach((a, ix) => {
        if (a.status == AttemptStatus.Success && a.weight > scoredWeight) {
          scoredWeight = a.weight
        }
        if (attempts[ix - 1]) {
          attemptProgression = a.weight - attempts[ix - 1].weight
        }
      })
      const attemptNumber = attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).length
      const attemptWeight = Math.max(
        ...attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).map(a => a.weight)
      )

      const liftLine: LiftOrderLine = {
        lot: line.lot,
        name: line.name,
        team: line.team,
        attempts: attempts,
        attemptProgression,
        scoredWeight,
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
    if (a.attemptProgression != b.attemptProgression) {
      return b.attemptProgression - a.attemptProgression
    }
    return a.lot - b.lot
  })

  return lines
}

export function getPhaseScorecard(data: CompetitionData, override_phase?: string): PhaseScorecardLine[] {
  const lines = Object.keys(data.scorecard)
    .map((lotKey) => data.scorecard[lotKey])
    .map(line => {
      const attempts = line.phases[override_phase || data.competition_phase]
      let scoredWeight = 0
      attempts.forEach((a) => {
        if (a.status == AttemptStatus.Success && a.weight > scoredWeight) {
          scoredWeight = a.weight
        }
      })
      const attemptNumber = attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).length
      const attemptWeight = Math.max(
        ...attempts.filter((attempt) => attempt.status != AttemptStatus.Nil).map(a => a.weight)
      )
      const liftLine: LiftOrderLine = {
        lot: line.lot,
        name: line.name,
        team: line.team,
        attempts: attempts,
        scoredWeight,
        attemptNumber,
        attemptWeight,
      }

      return liftLine
    })

  lines.sort((a, b) => {
    return b.scoredWeight - a.scoredWeight
  })

  return lines
}

export function getTotalScorecard(data: CompetitionData): TotalScorecardLine[] {
  const lines = Object.keys(data.scorecard)
    .map((lotKey) => data.scorecard[lotKey])
    .map(line => {

      let total = 0

      Object.keys(line.phases).forEach((phase) => {
        const attempts = line.phases[phase]
        let scoredWeight = 0
        attempts.forEach((a) => {
          if (a.status == AttemptStatus.Success && a.weight > scoredWeight) {
            scoredWeight = a.weight
          }
        })
        total += scoredWeight
      })
      const liftLine: TotalScorecardLine = {
        lot: line.lot,
        name: line.name,
        team: line.team,
        phases: line.phases,
        total,
      }

      return liftLine
    })

  lines.sort((a, b) => {
    return b.total - a.total
  })

  return lines
}
