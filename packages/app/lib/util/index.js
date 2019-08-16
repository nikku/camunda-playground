const fs = require('fs');
const path = require('path');

var crypto = require('crypto');

function readFile(filePath) {

  const contents = fs.readFileSync(filePath, 'utf8');

  const stats = fs.statSync(filePath);

  return {
    path: filePath,
    name: path.basename(filePath),
    contents,
    mtimeMs: stats.mtimeMs
  };
}

module.exports.readFile = readFile;


function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

module.exports.hash = hash;