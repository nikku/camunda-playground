/* eslint-env node */

import path from 'path';

import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import { terser } from 'rollup-plugin-terser';

import svelteConfig from './svelte.config.js';

import url from '@rollup/plugin-url';

import css from 'rollup-plugin-css-only';

const distDir = path.resolve(__dirname + '/../app/static');


const production = !process.env.ROLLUP_WATCH;

export default {
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
