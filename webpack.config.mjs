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

  return {
    mode: isProd ? 'production' : 'development',

    // entry produces a single bundle named tutorlix-root-config.js
    entry: { 'tutorlix-root-config': ENTRY },

    output: {
      path: path.resolve(__dirname, 'dist'),
      // deterministic filename that import-map expects
      filename: 'tutorlix-root-config.js',
      publicPath: '/',
      clean: true,
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
      // NOTE: input template is src/index.ejs (EJS template) — HtmlWebpackPlugin will
      // process it and emit dist/index.html (browser-consumable). Do NOT serve .ejs.
      new HtmlWebpackPlugin({
        filename: 'index.html', // final file served to browser
        inject: false,
        template: TEMPLATE,
        templateParameters: { isLocal: !!(env && env.isLocal), orgName: 'tutorlix' }
      })
    ],

    optimization: { splitChunks: { chunks: 'all' }, runtimeChunk: 'single' },

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
