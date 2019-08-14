#!/usr/bin/env node

const mri = require('mri');
const Playground = require('..');

const argv = process.argv.slice(2);

const args = mri(argv, {
  default: {
    port: 3301
  }
});

const {
  open,
  port
} = args;

Playground.create(args).catch(err => {
  console.error(err);

  process.exit(1);
});