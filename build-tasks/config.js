var { Anathema } = require("anathema")
let anathema = new Anathema()

anathema.config = {
  projectName: "StrengthStream",
  paths: {
    src: "src",
    srcBase: "src",
    staticOut: "build/assets",
    serverOut: "build",
    distOut: "dist",
  },
  packed: false,
}

module.exports = anathema
