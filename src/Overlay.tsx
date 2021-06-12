import { h, Fragment, render as preactRender } from "preact"
import {
  CompleteServerState,
  CompetitionEventType, CompetitionEvent, Config,
  CompetitionData, getLifterOrder, LiftOrderLine,
  PhaseScorecardLine,
  getPhaseScorecard,
  getEventsFromDiff,
} from "./Data"


function collector(): Promise<CompleteServerState> {
  return fetch('/api/ping')
    .then(response => response.json() as Promise<CompleteServerState>)
}


const overlayElem = document.getElementById('overlay')
let lastData: CompetitionData = null
let events: CompetitionEvent[] = []


function renderCycle() {
  collector()
    .then(serverState => {
      preactRender(<Overlay
        config={serverState.config}
        competitionData={serverState.data.competition}
        events={serverState.data.events}
      />, overlayElem)

      setTimeout(renderCycle, 500)
    })
}

renderCycle()

interface OverlayProps {
  competitionData: CompetitionData
  config: Config
  events?: CompetitionEvent[]
}


function Overlay(props: OverlayProps) {
  const liftOrder = getLifterOrder(props.competitionData)
  const phaseScorecard = getPhaseScorecard(props.competitionData)
  const scoringEvents = props.events.filter((e) =>
    e.event_type == CompetitionEventType.FailedLift ||
    e.event_type == CompetitionEventType.SuccessfulLift
  )
  const showScoringEvent = scoringEvents.length > 0
  const scoringEvent = scoringEvents[0]

  const declarationEvents: {[key: string]: CompetitionEvent} = {}
  props.events.forEach((e) => {
    if (e.event_type == CompetitionEventType.DeclarationChange) {
      declarationEvents[e.data.lotKey] = e
    }
  })

  let currentLifter: LiftOrderLine = null
  let upcomingLifters: LiftOrderLine[] = []

  if (showScoringEvent) {
    const eventLine = props.competitionData.scorecard[scoringEvent.data.lotKey]
    currentLifter = {
      lot: eventLine.lot,
      name: eventLine.name,
      team: eventLine.team,
      attempts: eventLine.phases[scoringEvent.data.competitionPhase],
    }
    if (currentLifter.lot != liftOrder[0].lot) {
      upcomingLifters = liftOrder.slice(0, 3).reverse()
    } else {
      upcomingLifters = liftOrder.slice(1, 1 + 3).reverse()
    }
  } else {
    currentLifter = liftOrder[0]
    upcomingLifters = liftOrder.slice(1, 1 + 3).reverse()
  }

  const DIM_UPCOMING_LIFTER_TITLE = 22
  const DIM_UPCOMING_LIFTER_ROW = 29
  const DIM_CURRENT_LIFTER_ROW = 60
  const DIM_SCORING_ROW = 29

  const scorecardHeight = DIM_SCORING_ROW * phaseScorecard.length + 50
  const liftOrderTransform = showScoringEvent ? scorecardHeight * -1 : 0

  return <Fragment>
    <div class="LiftOrder" style={{
      transform: `translateY(${liftOrderTransform}px)`
    }}>
      <h3 class="LiftOrder__title">{"Upcoming"}</h3>
      <ul class="LiftOrder__sequence">
      {upcomingLifters.map((line) => {
        return <UpcomingLifterRow key={line.lot} {...line} config={props.config} event={declarationEvents[line.lot]}/>
        }
      )}
      </ul>
      <CurrentLifterRow {...currentLifter} config={props.config} event={scoringEvent || declarationEvents[currentLifter.lot]} />
    </div>
    <div class="Scorecard" style={{
      transform: `translateY(${liftOrderTransform}px)`
    }}>
      <ol class="Scorecard__rows">
        {phaseScorecard.map((line) => {
          return <PhaseScorecardRow key={line.lot} {...line} config={props.config} />
        })}
      </ol>
    </div>
  </Fragment>
}

interface UpcomingLifterRowProps extends LiftOrderLine {
  config: Config
  event: CompetitionEvent
}


function UpcomingLifterRow (props: UpcomingLifterRowProps) {
  return <li class="LiftOrder__upcoming" key={props.lot}>
      <span class="LiftOrder__upcomingLot">
        {props.lot}
      </span>
      <span class="LiftOrder__upcomingName">
        {props.name}
      </span>
      <span class="LiftOrder__upcomingTeam">
        {props.team}
      </span>
      <span class="LiftOrder__upcomingAttemptStates">
        {props.attempts.map((a) =>
        <span class={`LiftOrder__upcomingAttemptState is-${a.status}`}>
        </span>
        )}
      </span>
      <span class={props.event ? "LiftOrder__upcomingPreviousWeight is-active" : "LiftOrder__upcomingPreviousWeight"}>
        <span class={"LiftOrder__upcomingPreviousWeightEntry"}>
        {props.event && props.event.data.previousWeight }
        </span>
      </span>
      <span class="LiftOrder__upcomingWeight">
        {props.attemptWeight}
      </span>
    </li>
}

interface CurrentLifterRowProps extends LiftOrderLine {
  config: Config
  event: CompetitionEvent
}

function CurrentLifterRow (props: CurrentLifterRowProps) {
  let eventDisplay: any = null

  if (props.event) {
    eventDisplay = (function() {
      switch (props.event.event_type) {
        case CompetitionEventType.SuccessfulLift:
          return <span class="LiftOrder__currentEvent is-success">
            <span class="LiftOrder__currentEventHeading">
              {"Good lift"}
            </span>
            <span class="LiftOrder__currentEventInfo">
            </span>
          </span>
        case CompetitionEventType.FailedLift:
          return <span class="LiftOrder__currentEvent is-fail">
            <span class="LiftOrder__currentEventHeading">
              {"No lift"}
            </span>
            <span class="LiftOrder__currentEventInfo">
            </span>
          </span>
        case CompetitionEventType.DeclarationChange:
          return <span class="LiftOrder__currentEvent is-declaration">
            <span class="LiftOrder__currentEventHeading">
            {"Change"}
            </span>
            <span class="LiftOrder__currentEventInfo">
              {props.event.data.previousWeight}
                {" to "}
              {props.event.data.newWeight}
            </span>
          </span>
      }
      return null
    })()
  }

  return <p class="LiftOrder__current" key={props.lot}>
    <h3 class="LiftOrder__currentTitle">{"Current Lifter"}</h3>
    <span class="LiftOrder__currentContent">
      <span class="LiftOrder__currentLot">
        {props.lot}
      </span>
      <span class="LiftOrder__currentName">
        {props.name}
      </span>
      <span class="LiftOrder__currentTeam">
        {props.team}
      </span>
      <span class="LiftOrder__currentAttemptStates">
        {props.attempts.map((a) =>
        <span class={`LiftOrder__currentAttemptState is-${a.status}`}>
          {a.weight}
        </span>
        )}
      </span>
    </span>
    {eventDisplay}
  </p>
}

interface PhaseScorecardRowProps extends PhaseScorecardLine {
  config: Config
}

function PhaseScorecardRow (props: PhaseScorecardRowProps) {
  return <li class="Scorecard__row" key={props.lot}>
      <span class="Scorecard__rowLot">
        {props.lot}
      </span>
      <span class="Scorecard__rowName">
        {props.name}
      </span>
      <span class="Scorecard__rowTeam">
        {props.team}
      </span>
      <span class="Scorecard__rowAttemptStates">
        {props.attempts.map((a) =>
        <span class={`Scorecard__rowAttemptState is-${a.status}`}>
          {a.weight}
        </span>
        )}
      </span>
    </li>
}