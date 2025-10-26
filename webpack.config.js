// webpack.config.js
const path = require('path');
const { merge } = require('webpack-merge'); // keep if you want to merge with env-specific overrides
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--mode=production');

const baseConfig = {
  mode: isProd ? 'production' : 'development',
  // change the entry if your root-config file name differs
  entry: {
    'root-config': path.resolve(__dirname, 'src', 'root-config.js') // or 'src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name].[contenthash].js' : '[name].js',
    publicPath: '/',               // change if you serve from sub-path
    clean: true,
    library: {
      name: 'rootConfig',
      type: 'umd'                  // UMD works for broad compatibility
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // ensure you have babel-loader + presets installed
          options: {
            cacheDirectory: true,
            presets: [
              ['@babel/preset-env', { targets: { node: '12' }, modules: false }]
            ]
          }
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'] // add postcss-loader if you use it
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.ejs$/,
        use: ['ejs-compiled-loader'] // to use src/index.ejs as template; you can use html-loader instead
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      inject: false,             // you used inject: false previously
      template: path.resolve(__dirname, 'src', 'index.ejs'),
      templateParameters: (compilation, assets, options) => {
        return {
          isLocal: !!process.env.IS_LOCAL,
          orgName: 'tutorlix'
        };
      }
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all'
    },
    runtimeChunk: 'single'
  },
  devtool: isProd ? false : 'eval-source-map'
};

// If you already have environment-specific bits, you can merge them here.
// For now we return baseConfig directly.
module.exports = (env, argv) => {
  return merge({}, baseConfig);
};
