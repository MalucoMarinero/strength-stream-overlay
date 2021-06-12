import express from 'express'
import path from 'path'
import xlsx from 'xlsx'
import ImportNoonanCMS from "./importers/NoonanCMS"
import {
  CompleteServerState,
  getEventsFromDiff,
  CompetitionEvent,
  initialConfig, DataSources, StreamStatus, StreamState, CompetitionData
} from "./Data"
import {json as jsonParser} from 'body-parser'

let config = initialConfig
let status: StreamStatus = {
  state: StreamState.NoSource,
  message: "",
}
let currentCompetitionData: CompetitionData = null
let events: CompetitionEvent[] = []

const app = express()
const port = 3010

app.use('/assets', express.static(path.join(__dirname, 'assets')))
app.use(jsonParser())

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/stream', (req, res) => {
  res.sendFile(path.join(__dirname, 'stream.html'))
})

app.get('/controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'controller.html'))
})

app.get('/api/ping', (req, res) => {
  res.json(getLatestServerState())
})

app.post('/api/config/src', (req, res) => {
  config.src.type = req.body.type
  config.src.path = req.body.path
  config.src.target = req.body.target

  res.json(getLatestServerState())
})

function updateCompetitionData () {
  if (
    config.src.type == DataSources.NoonanCMS &&
    config.src.path && config.src.target
  ) {
    ImportNoonanCMS(config).then((data) => {
      updateDataAndEvents(data)
      setTimeout(updateCompetitionData, 1000)
    })
  } else {
    status.state = StreamState.NoSource
    setTimeout(updateCompetitionData, 1000)
  }
}

function updateDataAndEvents(newData: CompetitionData) {
  const timestamp = +new Date()
  const newEvents = getEventsFromDiff(currentCompetitionData, newData, timestamp)
  events = events.concat(newEvents).filter((e) => e.expiry > timestamp)

  currentCompetitionData = newData
}

updateCompetitionData()

function getLatestServerState (): CompleteServerState {
  return {
    config,
    status,
    data: {
      competition: currentCompetitionData,
      events,
    }
  }
}

app.listen(port, () => {
  console.log("Strength Stream Server running at http://localhost:3010")
})

