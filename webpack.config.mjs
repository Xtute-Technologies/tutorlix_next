// webpack.config.mjs
import path from "path";
import { fileURLToPath } from "url";
import { merge } from "webpack-merge";
import singleSpaDefaults from "webpack-config-single-spa";
import HtmlWebpackPlugin from "html-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (webpackConfigEnv, argv) => {
  const orgName = "tutorlix";

  // Get default single-spa webpack config
  const defaultConfig = singleSpaDefaults({
    orgName,
    projectName: "root-config",
    webpackConfigEnv,
    argv,
    disableHtmlGeneration: true,
  });

  // Merge custom settings
  return merge(defaultConfig, {
    devServer: {
      host: "0.0.0.0",
      allowedHosts: "all",
      port: process.env.PORT || 10001, // 👈 Default port 10001
      static: {
        directory: path.resolve(__dirname, "dist"),
        publicPath: "/",
      },
      historyApiFallback: {
        index: "/index.html",
        disableDotRule: true,
      },
      client: {
        logging: "info",
      },
    },

    plugins: [
      new HtmlWebpackPlugin({
        inject: false,
        template: path.resolve(__dirname, "src", "index.ejs"),
        templateParameters: {
          isLocal: webpackConfigEnv && webpackConfigEnv.isLocal,
          orgName,
        },
      }),
    ],
  });
};
