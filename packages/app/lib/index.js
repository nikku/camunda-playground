const express = require('express')

const path = require('path');

const opn = require('open');

const getPort = require('get-port');

const bodyParser = require('body-parser');

const app = express();

const staticDirectory = path.join(__dirname, '..', '..', 'client', 'public');

const {
  readFile
} = require('./util');

const deployDiagram = require('./util/deploy-diagram');

const startProcessInstance = require('./util/start-process-instance');

const getProcessInstanceDetails = require('./util/get-process-instance-details');


async function failSafe(req, res, next) {

  try {
    await next();
  } catch (err) {
    console.error('unhandled route error', err);

    res.status(500).send();
  }
}

async function create(options) {

  let uploadedDiagram;

  let deployment;

  let processDefinition;

  let instance;

  let fetchedDetails;


  function getLocalDiagram() {
    const path = options.diagramPath;

    if (!path) {
      return null;
    }

    return readFile(path);
  }

  async function getInstanceDetails() {

    if (!instance) {
      return null;
    }

    const {
      id
    } = instance;

    const details = await getProcessInstanceDetails(instance);

    return {
      id,
      state: getStateFromDetails(details),
      trace: getTraceFromDetails(details)
    };
  }

  async function deployAndRun() {

    definitions = null;
    instance = null;

    const diagram = uploadedDiagram || await getLocalDiagram();

    if (!diagram) {
      return null;
    }

    deployment = await deployDiagram(diagram);

    processDefinition = deployment.deployedProcessDefinition;

    instance = await startProcessInstance(processDefinition);

    return instance;
  }

  function getStateFromDetails(details) {
    const {
      endTime,
      canceled
    } = details.state;

    if (canceled) {
      return 'canceled';
    }

    if (!endTime) {
      return 'running';
    }

    return 'completed';
  }

  function getTraceFromDetails(details) {

    const { activityInstances } = details;

    return activityInstances.reduce((instancesById, instance) => {

      const {
        id,
        parentActivityInstanceId,
        activityId,
        activityType,
        startTime,
        endTime,
        durationInMillis
      } = instance;

      instancesById[id] = {
        id,
        parentActivityInstanceId,
        activityId,
        activityType,
        startTime,
        endTime,
        durationInMillis
      };

      return instancesById;
    }, {});
  }

  // api //////////////////////

  app.put('/api/deploy', failSafe, async (req, res, next) => {

    const diagram = uploadedDiagram || await getLocalDiagram();

    if (!diagram) {
      return res.sendStatus(400);
    }

    try {
      deployment = await deployDiagram(diagram);

      return res.status(200).json(deployment);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.sendStatus(500);
    }
  });

  app.put('/api/start', failSafe, async (req, res, next) => {

    if (deployment) {
      return res.sendStatus(412);
    }

    try {
      instance = await startProcessInstance(deployment);

      return res.status(200).json(instance);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.sendStatus(500);
    }
  });

  app.get('/api/diagram', failSafe, async (req, res, next) => {

    const diagram = uploadedDiagram || await getLocalDiagram();

    if (!diagram) {
      return res.sendStatus(404);
    }

    return res.json(diagram);
  });

  app.put('/api/diagram', [ failSafe, bodyParser.json() ], async (req, res, next) => {

    const {
      contents,
      name
    } = req.body;

    uploadedDiagram = {
      contents,
      name: name,
      path: name,
      uploaded: true,
      mtimeMs: -1
    };

    try {
      deployAndRun();
    } catch (err) {
      console.error('failed to deploy uploaded diagram', err);

      return res.sendStatus(500);
    }

    return res.sendStatus(201);
  });

  app.get('/api/process-instance', failSafe, async (req, res, next) => {

    if (!instance) {
      return res.sendStatus(412);
    }

    const details = await fetchedDetails;

    return res.json(details);
  });

  app.post('/api/diagram/open-external', failSafe, async (req, res, next) => {

    if (uploadedDiagram) {
      return res.status(412).json({
        error: 'cannot externally open uploaded diagram'
      });
    }

    const diagram = await getLocalDiagram();

    if (!diagram) {
      return res.status(404).json({
        error: 'no local diagram'
      });
    }

    const app = options['diagram-editor'];

    await opn(diagram.path, app ? { app } : {});

    return res.sendStatus(200);
  });


  // static resources

  app.use('/', express.static(staticDirectory));

  app.get('/', failSafe, (req, res, next) => {
    res.sendFile(path.join(staticDirectory, 'index.html'));
  });


  const port = await getPort({ port: options.port });

  setInterval(async function() {

    const t = Date.now();

    try {
      fetchedDetails = getInstanceDetails();

      await fetchedDetails;
      console.debug('Fetched instance details (t=%sms)', Date.now() - t);
    } catch (err) {
      console.error('Failed to fetch instance details', err);
    }
  }, 2000);


  setTimeout(async function() {

    try {
      const instance = await deployAndRun();

      if (instance) {
        console.log('Process deployed and instance started');
      }
    } catch (err) {
      console.warn('failed to run diagram', err);
    }
  }, 1000);

  return new Promise((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve(`http://localhost:${port}`);
    });

  });

};

module.exports.create = create;