const anathema = require("./build-tasks/config.js")
const tar = require("tar")
const path = require("path")
const mkdirp = require("mkdirp")
const livereload = require("livereload")
const LocalWebServer = require("local-web-server")
const { exec } = require("child_process")
const rename = require("rename")

require("./build-tasks/styles.js")
require("./build-tasks/assets.js")
require("./build-tasks/scripts.js")
require("./build-tasks/containers.js")

var gitRev = require("git-rev")
var del = require("del")

const { staticOut } = anathema.config.paths
const projectName = anathema.config.projectName
const serverAppName = anathema.config.serverAppName

anathema.task("clean", function (task) {
  return del([anathema.rootDirectory + "/" + staticOut + "/**/*"]).then(
    (paths) => {
      task.stats.filesMatched = task.stats.filesMatched.concat(paths)
      return true
    }
  )
})

anathema.task("clean:dist", function (task) {
  const { distOut } = anathema.config.paths
  return del([anathema.rootDirectory + "/" + distOut + "/**/*"]).then(
    (paths) => {
      task.stats.filesMatched = task.stats.filesMatched.concat(paths)
      return true
    }
  )
})

let livereloadServer


anathema.task('devServer', function(task) {
  const server = LocalWebServer.create({
    port: 3500,
    directory: anathema.rootDirectory + '/build'
  })
  livereloadServer = livereload.createServer()
  livereloadServer.watch(anathema.rootDirectory + '/build')
  console.log("Server running at localhost:3500")
  return Promise.resolve(true)
})

anathema.dashboard("default", function (dashboard) {
  dashboard.task(["clean"])
  dashboard.task(["scripts"])
  dashboard.watch(["styles", "assets", "containers"])
  dashboard.monitor(["webpack"])
  dashboard.task(["devServer"])
})

anathema.task("package:version", function (task) {
  return new Promise((resolve, reject) => {
    gitRev.short((str) => {
      task
        .srcFromString({
          name: "build_version",
          data: str,
        })
        .output("dist")
        .then(resolve, reject)
    })
  })
})

function doPackage(task, folder, name) {
  const tarDir = anathema.rootDirectory + "/dist"
  const tarPath = anathema.rootDirectory + name
  return mkdirp(tarDir).then(() => {
    return Promise.all([
      tar
        .create(
          {
            gzip: true,
            cwd: anathema.rootDirectory + folder,
            file: tarPath,
          },
          ["."]
        )
        .then((out) => {
          task.stats.filesOutput.push(tarPath)
          return true
        }),
    ])
  })
}

anathema.task("package", function (task) {
  return doPackage(task, "/build", "dist.tar.gz")
})

anathema.task("build-static-styleguide", function (task) {
  return new Promise((resolve, reject) => {
    exec(
      `node --icu-data-dir=../../../node_modules/full-icu ${projectName}Components.server.js static`,
      {
        cwd: anathema.rootDirectory + "/build/dist/styleguide",
      },
      (err) => {
        if (err) {
          console.error(err)
          return reject(err)
        }
        resolve(true)
      }
    )
  })
})

function setupBuildVars() {
  // anathema.config.paths.staticOut = "build/dist/server/priv/static"
  anathema.config.packed = true
}

anathema.task("build:dev", async function (task) {
  await anathema.run("clean", { source: "cli" })
  await anathema.run("scripts", { source: "cli" })
  await anathema.run("styles", { source: "cli" })
  await anathema.run("assets", { source: "cli" })
  await anathema.run("containers", { source: "cli" })
  return true
})

anathema.task("build", async function (task) {
  setupBuildVars()
  await anathema.run("build:initial", { source: "cli" })
  await anathema.run("build:scripts", { source: "cli" })
  await anathema.run("build:package", { source: "cli" })
  return true
})

anathema.task("build:initial", async function (task) {
  setupBuildVars()
  await Promise.all([anathema.run("clean:dist", { source: "cli" })])
  await Promise.all([
    anathema.run("styles", { source: "cli" }),
    anathema.run("assets", { source: "cli" }),
  ])
  return true
})

anathema.task("build:scripts", async function (task) {
  setupBuildVars()
  await Promise.all([anathema.run("scripts", { source: "cli" })])
  return true
})

anathema.task("build:package", async function (task) {
  setupBuildVars()


  await Promise.all([
    anathema.run("package", { source: "cli" }),
    anathema.run("package:version", { source: "cli" }),
  ])
  return true
})

module.exports = anathema
