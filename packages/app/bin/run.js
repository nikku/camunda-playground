#!/usr/bin/env node

const mri = require('mri');
const path = require('path');

const opn = require('open');

const {
  startCamunda,
  isCamundaRunning
} = require('run-camunda');

const Playground = require('..');

const argv = process.argv.slice(2);

const options = mri(argv, {
  default: {
    port: 3301
  }
});

async function run(options) {

  const {
    open,
    port
  } = options;

  const diagram = open ? path.resolve(open) : null;

  const isRunning = await isCamundaRunning();

  if (isRunning) {
    console.log('We are going to use the Camunda instance that you got already running');
  } else {
    console.log('Camunda not running yet, fetching and starting it');

    await startCamunda();
  }

  const url = await Playground.create({ diagram, port });

  console.log(`Playground started at ${url}`);

  await opn(url);
}

run(options).catch(err => {
  console.error(err);

  process.exit(1);
});