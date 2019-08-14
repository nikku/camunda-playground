const express = require('express')

const path = require('path');

const app = express();

const port = 3000;

const staticDirectory = path.join(__dirname, '..', '..', 'inspector', 'public');

// api

app.get('/api/hello', (req, res, next) => {
  res.sendFile(path.join(staticDirectory, 'index.html'));
});

// static resources

app.use('/', express.static(staticDirectory));

app.get('/', (req, res, next) => {
  res.sendFile(path.join(staticDirectory, 'index.html'));
});

app.listen(port, () => console.log(`camunda-playground backend listening on port ${port}!`));