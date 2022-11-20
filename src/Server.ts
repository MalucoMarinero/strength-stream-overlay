import express from 'express'
import path from 'path'
import fs from 'fs'
import xlsx from 'xlsx'
import ImportNoonanCMS from "./importers/NoonanCMS"
import {
  CompleteServerState,
  getEventsFromDiff,
  CompetitionEvent,
  initialConfig, DataSources, StreamStatus, StreamState, CompetitionData
} from "./Data"
import {json as jsonParser} from 'body-parser'

const envConfigRoot = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
const serverConfigFile = path.join(envConfigRoot, 'StrengthStreamOverlay', 'config.json')

fs.mkdir(
  path.join(envConfigRoot, 'StrengthStreamOverlay'),
  {recursive: true},
  () => {}
)

let config = initialConfig
try {
  const result = fs.readFileSync(serverConfigFile, {encoding: 'utf8'})
  console.log(`Config loaded from ${serverConfigFile}`)

  config = JSON.parse(result)
} catch (e) {
  console.log("No config file found.")
}

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

  fs.writeFile(
    serverConfigFile,
    JSON.stringify(config),
    {encoding: 'utf8'},
    () => {
      console.log(`Config saved to ${serverConfigFile}`)
    }
  )

  res.json(getLatestServerState())
})

function updateCompetitionData () {
  try {
    if (
      config.src.type == DataSources.NoonanCMS &&
      config.src.path && config.src.target
    ) {
      ImportNoonanCMS(config).then((data) => {
        updateDataAndEvents(data)
      }).catch((e: Error) => {
        console.error(e)
      })
    } else {
      status.state = StreamState.NoSource
    }
  } catch (e) {
    console.error(e);

  }
}

function updateDataAndEvents(newData: CompetitionData) {
  const timestamp = +new Date()
  const newEvents = getEventsFromDiff(currentCompetitionData, newData, timestamp)
  events = events.concat(newEvents).filter((e) => e.expiry > timestamp)

  currentCompetitionData = newData
}

setInterval(updateCompetitionData, 1000)

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

