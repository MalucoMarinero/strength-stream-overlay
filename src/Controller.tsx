import { h, Fragment, render as preactRender } from "preact"
import { observable, computed, action } from "mobx"
import { useObserver, useLocalStore } from "mobx-react-lite"
import {
  CompetitionEventType, CompetitionEvent, Config,
  CompetitionData, getLifterOrder, LiftOrderLine,
  getEventsFromDiff,
} from "./Data"


const controllerElem = document.getElementById('controller')
function renderCycle () {
  preactRender(<Controller />, controllerElem)
}
renderCycle()


function Controller(props: any) {
  return <div class="Controller">
    <label>
      Select stream file path:
      Select file workshoot name:
    </label>
  </div>
}
