import { h, Fragment, render as preactRender } from "preact"
import {
  CompetitionEventType, CompetitionEvent, Config,
  CompetitionData, getLifterOrder, LiftOrderLine,
  getEventsFromDiff,
} from "./Data"

let setConfig: Config = null

fetch("./config.json")
  .then(response => response.json())
  .then(config => {
    setConfig = config

    renderCycle()
  })


function collector(srcData: any): Promise<CompetitionData> {
  if (srcData.type == "native-json") {
    return fetch(srcData.url)
      .then(response => response.json() as Promise<CompetitionData>)
  }
}


const overlayElem = document.getElementById('overlay')
let lastData: CompetitionData = null
let events: CompetitionEvent[] = []


function renderCycle() {
  collector(setConfig.src)
    .then(competitionData => {
      const timestamp = +new Date()
      const newEvents = getEventsFromDiff(lastData, competitionData, timestamp)
      events = events.concat(newEvents).filter((e) => e.expiry > timestamp)

      lastData = competitionData

      preactRender(<Overlay config={setConfig} competitionData={competitionData} events={events} />, overlayElem)

      setTimeout(renderCycle, 500)
    })
}


interface OverlayProps {
  competitionData: CompetitionData
  config: Config
  events?: CompetitionEvent[]
}


function Overlay(props: OverlayProps) {
  const liftOrder = getLifterOrder(props.competitionData)
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
    upcomingLifters = liftOrder.slice(0, props.config.upcoming.count).reverse()
  } else {
    currentLifter = liftOrder[0]
    upcomingLifters = liftOrder.slice(1, 1 + props.config.upcoming.count).reverse()
  }

  return <div class="LiftOrder">
    <h3 class="LiftOrder__title">{props.config.upcoming.title}</h3>
    <ul class="LiftOrder__sequence">
    {upcomingLifters.map((line) => {
      return <UpcomingLifterRow key={line.lot} {...line} config={props.config} event={declarationEvents[line.lot]}/>
      }
    )}
    </ul>
    <CurrentLifterRow {...currentLifter} config={props.config} event={scoringEvent || declarationEvents[currentLifter.lot]} />
  </div>
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
    <h3 class="LiftOrder__currentTitle">{props.config.upcoming.current_title}</h3>
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
