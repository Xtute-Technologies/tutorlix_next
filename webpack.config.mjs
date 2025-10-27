// webpack.config.mjs
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin'; // << added

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

  console.log(`Webpack mode=${isProd ? 'production' : 'development'}`);

  return {
    mode: isProd ? 'production' : 'development',

    // entry produces a single logical bundle named tutorlix-root-config
    entry: { 'tutorlix-root-config': ENTRY },

    output: {
      path: path.resolve(__dirname, 'dist'),
      // === CHANGE: use contenthash in production to avoid filename collisions ===
      filename: isProd ? 'tutorlix-root-config.[contenthash:8].js' : 'tutorlix-root-config.js',
      // chunkFilename for other chunks (unique names)
      chunkFilename: isProd ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true,
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
      }),

      // === NEW: emit a manifest.json mapping logical names -> hashed files ===
      new WebpackManifestPlugin({
        fileName: 'manifest.json',
        publicPath: '/',
        // only keep entries (avoid clutter)
        generate: (seed, files, entries) => {
          const manifest = {};
          for (const [key, value] of Object.entries(entries)) {
            // entries[key].assets contains the list of files for that entry
            // we choose the first file (normally the main js)
            if (Array.isArray(value.assets) && value.assets.length) {
              manifest[key] = value.assets[0].name || value.assets[0];
            } else if (Array.isArray(files)) {
              // fallback: find a file that starts with the entry name
              const match = files.find(f => f.name && f.name.includes(key));
              if (match) manifest[key] = match.name;
            }
          }
          return manifest;
        }
      })
    ],

    optimization: {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        name: false,
        automaticNameDelimiter: '-',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'all'
          }
        }
      }
    },

    devServer: {
      host: '0.0.0.0',
      allowedHosts: 'all',
      port: 10001,
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/'
      },
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
