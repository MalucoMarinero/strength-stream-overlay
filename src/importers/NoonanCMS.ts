import {Config, CompetitionData, ScorecardLine, Attempt, AttemptStatus} from "../Data"
import path from 'path'
import xlsx from 'xlsx'



// console.log(workbook.Sheets['Session 1']['G7'])

export default function(config: Config): Promise<CompetitionData> {
  const workbook = xlsx.readFile(config.src.path, {cellStyles: true})
  const sheetName = config.src.target
  const sheet = workbook.Sheets[sheetName]
  let competition_phase = "snatch"
  let mixedSession = false

  let lotHeaderCell: string = null
  let lookingForCurrentMovement = false
  if (!sheet) {
    return Promise.resolve({
      clock: "2:00",
      competition_phase,
      scorecard: {}
    })
  }
  Object.keys(sheet).some(coords => {
    const cell = sheet[coords]
    if (cell.v == '#') {
      lotHeaderCell = coords
    }
    if (cell.v == 'Sex') {
      mixedSession = true
    }
    if (cell.v == "Current movement = ") {
      lookingForCurrentMovement = true
    }
    if (lookingForCurrentMovement) {
      if (cell.v == "Clean & Jerk") {
        competition_phase = "clean"
        return
      }
      if (cell.v == "Snatch") {
        competition_phase = "snatch"
        return
      }
    }
    return false
  })

  const competitionData: CompetitionData = {
    clock: "2:00",
    competition_phase,
    scorecard: {}
  }

  let startRow = parseInt(lotHeaderCell.split('')[1]) + 1
  let walkRow = startRow
  let endRow = startRow + 20
  let liftGroup = 1

  while (walkRow < endRow) {
    const lot = sheet[`A${walkRow}`].w
    if (!lot && mixedSession) {
      liftGroup++
    }
    if (lot) {
      const line: ScorecardLine = {
        lot: parseInt(lot),
        liftGroup,
        name: sheet[`B${walkRow}`].w,
        team: sheet[`E${walkRow}`].w,
        phases: {
          'snatch': [
            parseAttemptCell(sheet[`G${walkRow}`]),
            parseAttemptCell(sheet[`H${walkRow}`]),
            parseAttemptCell(sheet[`I${walkRow}`]),
          ],
          'clean': [
            parseAttemptCell(sheet[`J${walkRow}`]),
            parseAttemptCell(sheet[`K${walkRow}`]),
            parseAttemptCell(sheet[`L${walkRow}`]),
          ]
        },
      }

      competitionData.scorecard[lot] = line
    }
    walkRow++
  }

  return Promise.resolve(competitionData)
}

function parseAttemptCell(cell: any): Attempt {
  if (cell.v) {
    if (cell.v == "---") {
      return {
        weight: null,
        status: AttemptStatus.Pass,
      }
    }
    if (cell.s && cell.s.fgColor && cell.s.fgColor.rgb == '00B050') {
      return {
        weight: Math.round(cell.v),
        status: AttemptStatus.Success,
      }
    }
    if (cell.s && cell.s.fgColor && cell.s.fgColor.rgb == 'FF5A5A') {
      return {
        weight: Math.round(cell.v),
        status: AttemptStatus.Fail,
      }
    }

    return {
      weight: Math.round(cell.v),
      status: AttemptStatus.Declared
    }
  } else {
    return {
      status: AttemptStatus.Nil,
    }
  }

}