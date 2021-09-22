var anathema = require("./config")
var path = require("path")
var gitRev = require("git-rev")

const { srcBase } = anathema.config.paths
const fontExts = ["eot", "woff", "woff2", "ttf"]
const imageExts = ["jpg", "png", "gif", "jpeg", "svg", "ico"]
const videoExts = ["mp4", "mov", "webm"]
const dataExts = ["json", "xml"]
const matcherPath =
  srcBase +
  "/**/*.{" +
  [].concat(fontExts, videoExts, imageExts, dataExts).join(",") +
  "}"

anathema.watcher("assets", matcherPath, ["assets"], { runOnStart: true })
anathema.task("assets", function(task) {
  const { staticOut, componentServerAssetsOut } = anathema.config.paths

  return task
    .src(matcherPath, {
    })
    .setWorkerThreshold(5)
    .transform((file) => {
      // preserve binary data by setting original
      console.log(file.originalPath);
      file.data = file.originalData
    })
    .output(staticOut)
})
