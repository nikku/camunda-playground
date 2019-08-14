#!/usr/bin/env node

const mri = require('mri');
const path = require('path');

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

const diagram = open ? path.resolve(open) : null;

Playground.create({ diagram, port }).catch(err => {
  console.error(err);

  process.exit(1);
});