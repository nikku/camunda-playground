/* eslint-env node */

const path = require('path');

const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser');
const url = require('@rollup/plugin-url');

const svelte = require('rollup-plugin-svelte');
const livereload = require('rollup-plugin-livereload');
const copy = require('rollup-plugin-copy');
const css = require('rollup-plugin-css-only');

const svelteConfig = require('./svelte.config.js');

const distDir = path.resolve(__dirname + '/../app/static');


const production = !process.env.ROLLUP_WATCH;

module.exports = {
  input: 'src/main.js',
  output: {
    sourcemap: !production,
    format: 'iife',
    name: 'app',
    file: `${distDir}/bundle.js`
  },
  plugins: [
    url({
      limit: 3 * 1024
    }),
    svelte({

      compilerOptions: {

        // enable run-time checks during development
        dev: !production,

        immutable: true
      },

      preprocess: svelteConfig.preprocess
    }),

    resolve(),
    commonjs(),
    json(),

    css({
      output: 'bundle.css'
    }),

    !production && livereload(distDir),

    copy({
      targets: [
        { src: 'public/*', dest: distDir }
      ]
    }),

    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};
