/* eslint-env node */

import path from 'path';

import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import { terser } from 'rollup-plugin-terser';

import url from '@rollup/plugin-url';
import { sass } from 'svelte-preprocess-sass';

import css from 'rollup-plugin-css-only';

const distDir = path.resolve(__dirname + '/../app/static');

function scriptProcessor(processors) {

  return function(options) {

    const {
      content,
      ...rest
    } = options;

    const code = processors.reduce((content, processor) => {
      return processor({
        content,
        ...rest
      }).code;
    }, content);

    return {
      code
    };
  };
}

function classProcessor() {

  function process(content) {
    return (
      content
        .replace(
          /export let className([;\n= ]{1})/g,
          'export { className as class }; let className$1'
        )
    );
  }

  return function(options) {

    const {
      content
    } = options;

    const code = process(content);

    return {
      code
    };
  };
}


function emitProcessor() {

  function process(content) {

    if (/\$\$emit\(/.test(content)) {

      content = `
import { createEventDispatcher } from 'svelte';

const __dispatch = createEventDispatcher();

${content}`;

      content = content.replace(/\$\$emit\(/g, '__dispatch(');
    }

    return content;
  }

  return function(options) {

    const {
      content
    } = options;

    const code = process(content);

    return {
      code
    };
  };
}


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
        dev: !production,
        immutable: true,
      },
      preprocess: {
        style: sass({
          includePaths: [
            'src/style',
            'node_modules'
          ]
        }, { name: 'scss' }),
        script: scriptProcessor([
          classProcessor(),
          emitProcessor()
        ])
      }
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
