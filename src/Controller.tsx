import { h, Fragment, render as preactRender, JSX} from "preact"
import { observable, computed, action } from "mobx"
import { observer, useLocalStore, useLocalObservable } from "mobx-react-lite"
import {
  CompetitionEventType, CompetitionEvent, Config,
  CompetitionData, getLifterOrder, LiftOrderLine,
  getEventsFromDiff,
} from "./Data"


class ControllerState {
  @observable config: any
  @observable streamPath: string
  @observable streamSheet: string

  constructor () {
    this.streamPath = ""
    this.streamSheet = ""
  }

  @action.bound
  onChange(e: JSX.TargetedEvent<HTMLInputElement, Event>) {
    const input = e.target as HTMLInputElement
    console.log("onchange", input.name, input.value)

    if (input.name == 'streamPath') {
      this.streamPath = input.value
      console.log('updating', this.streamPath)
    }
  }
}

const controllerElem = document.getElementById('controller')
function renderCycle () {
  preactRender(<Controller />, controllerElem)
}
renderCycle()


@observer
function Controller(props: any) {
  const state = useLocalObservable(() => new ControllerState())

  console.log('typing', state.streamPath)
  return <div class="Controller">
    <label>
      Select streaming file path:
      <input type="text" name="streamPath" value={state.streamPath} onChange={state.onChange} />
      Select file workshoot name:
    </label>
  </div>
}
