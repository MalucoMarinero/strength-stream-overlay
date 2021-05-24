var anathema = require("./config")
var gitRev = require("git-rev")
var path = require("path")

const serverAppName = anathema.config.serverAppName

anathema.task("server:files", function(task) {
  const { serverDist, serverSrc } = anathema.config.paths

  return Promise.all([
    task
      .src("config/**/*.{py,html,js,json,css,svg,pdf,po,txt,ex,exs,eex,yml}", {
        base: "config/../",
      })
      .output(serverDist),
    task
      .src("priv/**/*.{py,html,js,json,css,svg,pdf,po,txt,ex,exs,eex,yml}", {
        base: "priv/../",
      })
      .output(serverDist),
    task
      .src(
        "lib/**/*.{py,html,js,ts,tsx,json,css,svg,pdf,po,txt,ex,exs,eex,yml}",
        {
          base: "lib/../",
        }
      )
      .output(serverDist),
    task
      .src("test/**/*.{py,html,js,json,css,svg,pdf,po,txt,ex,exs,eex,yml}", {
        base: "test/../",
      })
      .output(serverDist),
    task.src("mix.exs").output(serverDist),
    task.src("requirements.txt").output(serverDist),
    task.src("mix.lock").output(serverDist),
  ])
})

anathema.task("viewlayer:files", function(task) {
  const { viewLayerDist, serverSrc } = anathema.config.paths

  return Promise.all([
    task.src("package.json").output(viewLayerDist),
    new Promise((resolve, reject) => {
      gitRev.short((str) => {
        task
          .srcFromString({
            name: "build_version",
            data: str,
          })
          .output(viewLayerDist)
          .then(resolve, reject)
      })
    }),
  ])
})
