// webpack.config.mjs
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY = './src/tutorlix-root-config.js';
const TEMPLATE = path.resolve(__dirname, 'src', 'index.ejs');

if (!fs.existsSync(path.resolve(__dirname, ENTRY))) {
  throw new Error(`Webpack entry not found: ${ENTRY}`);
}
if (!fs.existsSync(TEMPLATE)) {
  throw new Error(`Html template not found: ${TEMPLATE}`);
}

export default (env, argv) => {
  const isProd = process.env.NODE_ENV === 'production' || (argv && argv.mode === 'production');

  // debug: helpful on CI to see what entries are being used
  // (will print once at config load time)
  console.log(`Webpack mode=${isProd ? 'production' : 'development'}`);

  return {
    mode: isProd ? 'production' : 'development',

    // entry produces a single bundle named tutorlix-root-config.js
    entry: { 'tutorlix-root-config': ENTRY },

    output: {
      path: path.resolve(__dirname, 'dist'),
      // keep deterministic filename for the main bundle (import-map consumers expect this)
      // if you ever want content-hashed production filename, change here and update import map.
      filename: 'tutorlix-root-config.js',
      // ensure non-entry chunks (vendors, dynamic imports, splitChunks) get unique names
      chunkFilename: isProd ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true,
      // unique name for build to avoid collisions when multiple webpack runtimes present
      uniqueName: 'tutorlix_root_config_' + (isProd ? 'prod' : 'dev'),
      library: { name: 'rootConfig', type: 'umd' }
    },

    resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },

    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              presets: [['@babel/preset-env', { targets: "> 0.25%, not dead", modules: false }]]
            }
          }
        },
        {
          test: /\.html$/i,
          use: [
            {
              loader: 'html-loader',
              options: {
                sources: false,
                minimize: false
              }
            }
          ]
        },
        { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
        { test: /\.(png|jpe?g|gif|svg|ico)$/i, type: 'asset/resource' }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        filename: 'index.html',
        inject: false,
        template: TEMPLATE,
        templateParameters: { isLocal: !!(env && env.isLocal), orgName: 'tutorlix' }
      })
    ],

    optimization: {
      // stable ids and chunk ids between builds
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // single runtime reduces number of emitted runtime files
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        // prevent automatic named chunks which can collide with entry names;
        // rely on chunkFilename pattern instead (which includes contenthash in prod)
        name: false,
        automaticNameDelimiter: '-',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            // don't force a single vendors filename that could conflict — let chunkFilename rule handle uniqueness
            priority: -10,
            chunks: 'all'
          }
        }
      }
    },

    devServer: {
      // allow container/remote access
      host: '0.0.0.0',
      allowedHosts: 'all',
      port: 10001,

      // serve from the dist directory (where build output lands)
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/'
      },

      // ensure dot-containing static files (like /tutorlix-root-config.js) are
      // NOT rewritten to index.html by the SPA fallback
      historyApiFallback: {
        index: '/index.html',
        disableDotRule: true
      },

      client: {
        logging: 'info'
      }
    },

    devtool: isProd ? false : 'eval-source-map'
  };
};
