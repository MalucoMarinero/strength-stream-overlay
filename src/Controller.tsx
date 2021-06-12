import { h, Fragment, render as preactRender, JSX} from "preact"
import { makeObservable, observable, computed, action } from "mobx"
import { observer, useLocalStore, useLocalObservable } from "mobx-react-lite"
import jsonBeautify from 'json-beautify'
import {
  CompleteServerState,
  CompetitionEventType, CompetitionEvent, Config,
  CompetitionData, getLifterOrder, LiftOrderLine,
  getEventsFromDiff,
} from "./Data"

enum ControllerPanels {
  ConfigPanel,
  EventPanel,
}

class ControllerState {
  @observable serverState: CompleteServerState
  @observable streamPath: string
  @observable streamSheet: string
  @observable counter: number

  constructor () {
    makeObservable(this)
    this.counter = 1
  }

  @action.bound
  onChange(e: JSX.TargetedEvent<HTMLInputElement, Event>) {
    const input = e.target as HTMLInputElement

    if (input.name == 'streamPath') {
      this.streamPath = input.value
    }
    if (input.name == 'streamSheet') {
      this.streamSheet = input.value
    }
  }

  @action.bound
  updateFromAPIData(state: CompleteServerState) {
    this.serverState = state
    this.streamPath = state.config.src.path
    this.streamSheet = state.config.src.target
  }

  @action.bound
  incrementCounter() {
    this.counter = this.counter + 1
  }

  @action.bound
  saveStreamDetails(e: JSX.TargetedEvent<HTMLFormElement, Event>) {
    e.preventDefault()
    fetch('/api/config/src', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: "noonan-cms",
        path: this.streamPath,
        target: this.streamSheet,
      })
    }).then((response) => {
      console.log(response)
    })
  }

  @action.bound
  doPing () {
    fetch('/api/ping').then((response) => response.json()).then((jsonIn: any) => {
      this.updateFromAPIData(jsonIn as CompleteServerState)
    })
  }
}
const controllerElem = document.getElementById('controller')
const newState = new ControllerState()


fetch('/api/ping').then((response) => response.json()).then((jsonIn: any) => {
  newState.updateFromAPIData(jsonIn as CompleteServerState)
  const ControllerView = observer(Controller)
  preactRender(<ControllerView state={newState} />, controllerElem)
})

setInterval(newState.doPing, 1000)


interface ControllerProps {
  state: ControllerState
}

function Controller(props: ControllerProps) {
  return <div class="Controller">
    <h1>{"Configuration:"}</h1>
    <form onSubmit={props.state.saveStreamDetails}>
      <label>
        Select streaming file path:
        <br/>
        <input type="text" name="streamPath" value={props.state.streamPath} onChange={props.state.onChange} />
      </label>
      <br/>
      <label>
        Select file workshoot name:
        <br/>
        <input type="text" name="streamSheet" value={props.state.streamSheet} onChange={props.state.onChange} />
      </label>
      <br/>
      <button type="submit">Save Changes</button>
    </form>
    <h1>{"Current State:"}</h1>
    <pre>
      {jsonBeautify(props.state.serverState, null, 2, 80)}
    </pre>
  </div>
}
