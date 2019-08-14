const fs = require('fs');

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