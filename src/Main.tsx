import { h, Fragment, render as preactRender } from "preact"
import deepDiff from 'deep-diff'
import {CompetitionData, getLifterOrder, LiftOrderLine} from "./Data"

let setConfig: any = null

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
let events: any = []


function renderCycle() {
  collector(setConfig.src)
    .then(competitionData => {
      console.log(deepDiff.diff(lastData, competitionData))
      lastData = competitionData
      console.log(competitionData)

      preactRender(<Overlay competitionData={competitionData} events={events} />, overlayElem)

      setTimeout(renderCycle, 500)
    })
}


interface OverlayProps {
  competitionData: CompetitionData
  events?: any
}

function Overlay(props: OverlayProps) {
  const liftOrder = getLifterOrder(props.competitionData)
  console.log(liftOrder)

  return <div class="Runlist">
  </div>
}
