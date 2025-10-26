// webpack.config.mjs
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import singleSpaDefaults from 'webpack-config-single-spa';
import { merge } from 'webpack-merge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// explicit entry (you have this file in src/)
const ENTRY = './src/tutorlix-root-config.js';
const TEMPLATE = path.resolve(__dirname, 'src', 'index.ejs');

function assertEntryExists(entryPath) {
  const abs = path.resolve(__dirname, entryPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Webpack entry not found: ${abs}`);
  }
}

export default async (env, argv) => {
  // sanity check
  assertEntryExists(ENTRY);
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`Html template not found: ${TEMPLATE}`);
  }

  const isProd = process.env.NODE_ENV === 'production' || (argv && argv.mode === 'production');

  // ask single-spa helper for defaults (it should be ESM-compatible now that we're using .mjs & type:module)
  const defaultConfig = await Promise.resolve(
    singleSpaDefaults({
      orgName: 'tutorlix',
      projectName: 'root-config',
      webpackConfigEnv: env,
      argv,
      disableHtmlGeneration: true,
    })
  );

  // Merge and ensure our entry + html template are present
  const final = merge(defaultConfig, {
    mode: isProd ? 'production' : 'development',
    entry: {
      'root-config': ENTRY,
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? '[name].[contenthash].js' : '[name].js',
      publicPath: '/',
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'index.html',
        inject: false, // you used inject:false previously
        template: TEMPLATE,
        templateParameters: {
          isLocal: !!(env && env.isLocal),
          orgName: 'tutorlix',
        },
      }),
    ],
  });

  return final;
};
