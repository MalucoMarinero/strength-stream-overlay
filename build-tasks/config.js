var { Anathema } = require("anathema")
let anathema = new Anathema()

anathema.config = {
  projectName: "StrengthStreamOverlay",
  paths: {
    src: "src",
    srcBase: "src",
    staticOut: "build",
    distOut: "dist",
  },
  packed: false,
}

module.exports = anathema
