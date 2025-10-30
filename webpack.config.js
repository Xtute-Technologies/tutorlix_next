const { merge } = require("webpack-merge");
const singleSpaDefaults = require("webpack-config-single-spa");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (webpackConfigEnv, argv) => {
  const orgName = "tutorlix";

  const defaultConfig = singleSpaDefaults({
    orgName,
    projectName: "root-config",
    webpackConfigEnv,
    argv,
    disableHtmlGeneration: true,
  });

  return merge(defaultConfig, {
    devServer: {
      host: "0.0.0.0",
      allowedHosts: "all",
      port: process.env.PORT || 10001, // 👈 Default port set to 10001
      static: {
        directory: "./dist",
        publicPath: "/",
      },
      historyApiFallback: true,
      client: {
        logging: "info",
      },
    },

    plugins: [
      new HtmlWebpackPlugin({
        inject: false,
        template: "src/index.ejs",
        templateParameters: {
          isLocal: webpackConfigEnv && webpackConfigEnv.isLocal,
          orgName,
        },
      }),
    ],
  });
};
