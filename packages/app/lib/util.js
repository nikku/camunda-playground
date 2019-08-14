const fs = require('fs');

const {
  startCamunda,
  stopCamunda
} = require('run-camunda');

function readFile(path) {

  const contents = fs.readFileSync(path, 'utf8');

  const stats = fs.statSync(path);

  return {
    path,
    contents,
    mtimeMs: stats.mtimeMs
  };
}

module.exports.readFile = readFile;
module.exports.startCamunda = startCamunda;
module.exports.stopCamunda = stopCamunda;