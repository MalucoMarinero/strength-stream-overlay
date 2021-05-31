import express from 'express'
import path from 'path'
import xlsx from 'xlsx'

const FILE_PATH = '/run/media/bulk-storage/Dropbox/Weightlifting/WLContest.xlsm'

const workbook = xlsx.readFile(FILE_PATH, {cellStyles: true})
console.log(workbook.Sheets['Session 1']['G7'])

const app = express()
const port = 3010

app.use('/assets', express.static(path.join(__dirname, 'assets')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/stream', (req, res) => {
  res.sendFile(path.join(__dirname, 'overlay.html'))
})

app.get('/controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'controller.html'))
})


app.listen(port, () => {
  console.log("Strength Stream Server running at http://localhost:3010")
})

