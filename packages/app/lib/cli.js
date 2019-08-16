'use strict';

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
    port: 3301,
    open: true,
    diagramEditor: process.env.CAMUNDA_PLAYGROUND_DIAGRAM_EDITOR,
    verbose: false
  },
  alias: {
    diagramEditor: 'diagram-editor',
    version: 'v'
  }
});


if (options.version) {
  console.log(require('../package').version);

  process.exit(0);
}

if (options.help) {
  console.log(`usage: camunda-playground [...options] [diagram]

  Options:
        --diagram-editor      tool to edit the diagram in

    -v, --version             output tool version
        --help                show help


  Examples:
    $ camunda-playground --diagram-editor=camunda-modeler foo.bpmn
`);

  process.exit(0);

}

options.diagram = options._[0];

async function run(options) {

  const {
    diagram,
    diagramEditor,
    port,
    verbose,
    open
  } = options;

  const diagramPath = diagram ? path.resolve(diagram) : null;

  const isRunning = await isCamundaRunning();

  if (isRunning) {
    console.log('Using the Camunda instance that is running on http://localhost:8080');
  } else {
    console.log('Camunda not running yet, fetching and starting it');

    await startCamunda();
  }

  const url = await Playground.create({
    diagramEditor,
    diagramPath,
    verbose,
    port
  });

  console.log(`Playground started at ${url}`);

  if (open) {
    await opn(url);
  }
}

run(options).catch(err => {
  console.error(err);

  process.exit(1);
});