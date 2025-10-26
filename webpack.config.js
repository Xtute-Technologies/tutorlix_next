const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Export an async function so we can use dynamic import() for ESM-only packages
module.exports = async (webpackConfigEnv, argv) => {
  // dynamic import to support ESM-only versions of webpack-config-single-spa
  let singleSpaDefaultsModule;
  try {
    singleSpaDefaultsModule = await import("webpack-config-single-spa");
  } catch (err) {
    // fallback to require if import fails for some reason
    try {
      // eslint-disable-next-line global-require
      singleSpaDefaultsModule = require("webpack-config-single-spa");
    } catch (err2) {
      console.error(
        "Failed to load webpack-config-single-spa via import() or require():",
        err2
      );
      throw err2;
    }
  }

  const singleSpaDefaults = singleSpaDefaultsModule.default || singleSpaDefaultsModule;

  const orgName = "tutorlix";
  const defaultConfig = await Promise.resolve(
    singleSpaDefaults({
      orgName,
      projectName: "root-config",
      webpackConfigEnv,
      argv,
      disableHtmlGeneration: true,
    })
  );

  // merge and return final config
  return merge(defaultConfig, {
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
