const express = require('express')

const path = require('path');

const getPort = require('get-port');

const bodyParser = require('body-parser');

const app = express();

const staticDirectory = path.join(__dirname, '..', '..', 'inspector', 'public');

const {
  readFile,
  startCamunda,
  stopCamunda,
  deployDiagram
} = require('./util');


async function failSafe(req, res, next) {

  try {
    await next();
  } catch (err) {
    console.error('unhandled route error', err);

    res.status(500).send();
  }
}


async function create(options) {

  let starting;

  let uploadedDiagram;

  let localDiagram;

  // api //////////////////////

  app.get('/api/diagram', failSafe, async (req, res, next) => {

    if (uploadedDiagram) {
      return res.json(uploadedDiagram);
    }

    const diagramPath = options.diagram;

    if (!diagramPath) {
      return res.sendStatus(204);
    }

    try {
      const file = await readFile(diagramPath);

      return res.json(file);
    } catch (err) {
      console.error('failed to get diagram stats', err);
    }

    return res.sendStatus(404);
  });

  app.put('/api/diagram', [ failSafe, bodyParser.json() ], async (req, res, next) => {

    const {
      contents,
      name
    } = req.body;

    uploadedDiagram = {
      contents,
      path: name,
      uploaded: true,
      mtimeMs: -1
    };
  });

  app.put('/api/run', failSafe, async (req, res, next) => {
    try {
      starting = starting || startCamunda();

      await starting;

      return res.status(200).json({});
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/hello', failSafe, async (req, res, next) => {
    res.send('COOL');
  });

  // static resources

  app.use('/', express.static(staticDirectory));

  app.get('/', failSafe, (req, res, next) => {
    res.sendFile(path.join(staticDirectory, 'index.html'));
  });


  const port = await getPort({ port: options.port });

  new Promise((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) {
        return reject(err);
      }

      console.log(`camunda-playground backend listening on port ${port}!`);

      return resolve();
    });
  });

};

module.exports.create = create;