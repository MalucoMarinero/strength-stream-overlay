var anathema = require("./config")

const { src } = anathema.config.paths

anathema.watcher("containers", src + "/**/*.html", ["containers"], {
  runOnStart: true,
})
anathema.task("containers", function(task) {
  const { staticOut, serverOut } = anathema.config.paths
  return task
    .src(src + "/**/*.html")
    .transform((file) => {
      if (file.name == "test-container.html") {
        file.name = "index.html"
      }
    })
    .output(serverOut)
})
