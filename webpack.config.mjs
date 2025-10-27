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
    entry: { 'root-config': ENTRY },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? '[name].[contenthash].js' : '[name].js',
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
      new HtmlWebpackPlugin({
        filename: 'index.html',
        inject: false,
        template: TEMPLATE,
        templateParameters: { isLocal: !!(env && env.isLocal), orgName: 'tutorlix' }
      })
    ],
    optimization: { splitChunks: { chunks: 'all' }, runtimeChunk: 'single' },
    devServer: {
      allowedHosts: 'all',         // Fixes "Invalid Host header"
    port: 10001,                 // Your container port
      historyApiFallback: true     // Fixes "Cannot GET /" for SPAs
    },
    devtool: isProd ? false : 'eval-source-map'
  };
};
