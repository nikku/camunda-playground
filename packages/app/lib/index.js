const express = require('express')

const path = require('path');

const getPort = require('get-port');

const app = express();

const staticDirectory = path.join(__dirname, '..', '..', 'inspector', 'public');


async function create(options) {

  // api

  app.get('/api/hello', (req, res, next) => {
    res.send('COOL');
  });

  // static resources

  app.use('/', express.static(staticDirectory));

  app.get('/', (req, res, next) => {
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