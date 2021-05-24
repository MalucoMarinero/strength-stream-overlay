var anathema = require("./config")
var webpack = require("webpack")
var path = require("path")
var ReplacePlugin = require("webpack-plugin-replace")
var BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin
var nodeExternals = require("webpack-node-externals")

const scriptsMonitor = anathema.monitor("webpack")

const serverAppName = anathema.config.serverAppName
const projectName = anathema.config.projectName

function generateWebpackConfig(task) {
  const {
    src,
    staticOut,
    componentServerOut,
    viewLayerOut,
  } = anathema.config.paths
  const PACKED = anathema.config.packed

  // const bundleAnalyzerPlugin = new BundleAnalyzerPlugin({
  //   generateStatsFile: true,
  //   openAn
  // })

  const serverDefinePlugin = anathema.config.packed
    ? new webpack.DefinePlugin({
        "process.env": {
          COMPONENT_MEDIA_SRC: "__dirname + '/../../../front-end/cms-media'",
        },
      })
    : new webpack.DefinePlugin({})

  const COMMON_CONFIG = {
    mode: PACKED ? "production" : "development",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        react: "preact/compat",
        "react-dom/test-utils": "preact/test-utils",
        "react-dom": "preact/compat",
        "react-dom/server": "preact/compat",
      },
    },
    module: {
      rules: PACKED
        ? [
            {
              test: /\.pug$/,
              loader: "pug-loader",
            },
            {
              test: /\.tsx?$/,
              include: path.resolve(__dirname, "../lib"),
              exclude: /(node_modules|bower_components)/,
              use: {
                loader: "ts-loader",
                options: {
                  transpileOnly: true,
                },
              },
            },
          ]
        : [
            {
              test: /\.pug$/,
              loader: "pug-loader",
            },
            {
              test: /\.tsx?$/,
              loader: "ts-loader",
            },
          ],
    },
  }

  const CLIENT_COMMON_CONFIG = {
    externals: {
      jsdom: "false",
    },
    module: {
      rules: PACKED
        ? [
            {
              test: /\.tsx?$/,
              include: path.resolve(__dirname, "../lib"),
              exclude: /(node_modules|bower_components)/,
              use: {
                loader: "ts-loader",
                options: {
                  transpileOnly: true,
                },
              },
            },
            {
              test: /\.pug$/,
              loader: "pug-loader",
            },
            {
              test: /\.js$/,
              include: path.resolve(__dirname, "../lib"),
              exclude: /(node_modules|bower_components)/,
              use: {
                loader: "babel-loader",
                options: {
                  cacheDirectory: true,
                  presets: ["babel-preset-es2015"],
                },
              },
            },
          ]
        : [
            { test: /\.tsx?$/, loader: "ts-loader" },
            // supporting IE10 requires the below rule, add for testing
            {
              test: /\.js$/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-env"],
                },
              },
            },
            {
              test: /\.pug$/,
              loader: "pug-loader",
            },
          ],
    },
  }

  const WEBPACK_CONFIG = [
    Object.assign({}, COMMON_CONFIG, CLIENT_COMMON_CONFIG, {
      entry: anathema.rootDirectory + "/src/Main.tsx",
      // node: { express: "empty", fs: "empty", net: "empty" },
      output: {
        filename: projectName + "Client.pkg.js",
        path: anathema.rootDirectory + "/" + staticOut,
      },
      plugins: PACKED
        ? []
        : [
            new BundleAnalyzerPlugin({
              openAnalyzer: false,
              analyzerPort: 8888,
            }),
          ],
    }),
  ]

  return WEBPACK_CONFIG
}


anathema.task("scripts", function (task) {
  const {
    src,
    staticOut,
    componentServerOut,
    viewLayerOut,
  } = anathema.config.paths
  const PACKED = anathema.config.packed
  const WEBPACK_CONFIG = generateWebpackConfig(task)
  const compiler = webpack(WEBPACK_CONFIG)

  if (task.runContext.dashboard) {
    compiler.watch({}, (err, stats) => {
      if (err) {
        return scriptsMonitor.reportFailure(err)
      }

      if (stats.hasErrors()) {
        return scriptsMonitor.reportFailure(
          stats.toString({
            all: false,
            errors: true,
            colors: true,
            chunks: false,
          })
        )
      }

      const start = Math.min(stats.stats.map((s) => s.startTime))
      const end = Math.max(stats.stats.map((s) => s.endTime))

      scriptsMonitor.reportSuccess(
        stats.toString({ colors: true }),
        end - start
      )
    })
    // task.stats.filesOutput.push("/" + staticOut + "/" + projectName + ".pkg.js")
    // task.stats.filesOutput.push(
    //   "/" + componentServerOut + "/" + projectName + "Components.server.js"
    // )
    // task.stats.filesOutput.push(
    //   "/" + componentServerOut + "/" + projectName + "Components.client.js"
    // )

    return Promise.resolve(true)
  } else {
    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          return reject(err)
        }

        if (stats.hasErrors()) {
          return reject(
            stats.toString({
              all: false,
              errors: true,
              colors: true,
              chunks: false,
            })
          )
        }

        // stats.compilation.fileDependencies.forEach((name) => {
        //   task.stats.filesMatched.push(name)
        // })
        // task.stats.filesOutput.push(
        //   "/" + staticOut + "/" + projectName + ".pkg.js"
        // )
        // task.stats.filesOutput.push(
        //   "/" + componentServerOut + "/" + projectName + "Components.server.js"
        // )
        // task.stats.filesOutput.push(
        //   "/" + componentServerOut + "/" + projectName + "Components.client.js"
        // )

        resolve(stats)
      })
    })
  }
})
