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

const EngineApi = require('./engine-api');


async function failSafe(req, res, next) {

  try {
    await next();
  } catch (err) {
    console.error('unhandled route error', err);

    res.status(500).send();
  }
}

async function create(options) {

  const diagramPath = options.diagramPath;

  const engine = new EngineApi(options.camundaBase || 'http://localhost:8080');

  let uploadedDiagram;

  let diagram;

  let deployment;

  let processDefinition;

  let processInstance;

  let fetchedDetails;

  function getDiagram() {
    return uploadedDiagram || getLocalDiagram();
  }

  function getLocalDiagram() {

    if (!diagramPath) {
      return null;
    }

    return readFile(diagramPath);
  }

  async function getInstanceDetails() {

    if (!processInstance) {
      return null;
    }

    const {
      id,
      definitionId
    } = processInstance;

    const details = await engine.getProcessInstanceDetails(processInstance);

    return {
      id,
      definitionId,
      state: getStateFromDetails(details),
      trace: getTraceFromDetails(details)
    };
  }

  function clear() {
    diagram = null;
    deployment = null;
    processDefinition = null;
    processInstance = null;
  }

  async function reload() {

    try {
      const diagram = await getDiagram();

      if (!diagram) {
        console.debug('No diagram to load');

        return clear();
      }

      const processInstance = await deployAndRun(diagram);

      if (processInstance) {
        console.log('Process deployed and instance started');
      }
    } catch (err) {
      console.warn('Failed to run diagram', err);
    }
  }

  async function deployAndRun(newDiagram) {

    clear();

    diagram = newDiagram;
    deployment = await engine.deployDiagram(newDiagram);
    processDefinition = deployment.deployedProcessDefinition;
    processInstance = await engine.startProcessInstance(processDefinition);

    return processInstance;
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

    const diagram = getDiagram();

    if (!diagram) {
      return res.status(400).json({
        error: 'no diagram'
      });
    }

    try {
      deployment = await deployDiagram(diagram);

      return res.json(deployment);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.status(500).json({
        error: 'failed to deploy diagram'
      });
    }
  });

  app.post('/api/process-instance/start', failSafe, async (req, res, next) => {

    if (deployment) {
      return res.status(412).json({
        error: 'no deployment'
      });
    }

    try {
      processInstance = await startProcessInstance(deployment);

      return res.status(200).json(processInstance);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.status(500).json({
        error: 'failed to start diagram'
      });
    }
  });

  app.get('/api/diagram', failSafe, async (req, res, next) => {

    const diagram = await getDiagram();

    if (!diagram) {
      return res.status(404).json({
        error: 'no diagram'
      });
    }

    return res.json(diagram);
  });

  app.put('/api/diagram', [ failSafe, bodyParser.json() ], async (req, res, next) => {

    const {
      contents,
      path,
      name
    } = req.body;

    uploadedDiagram = {
      contents,
      name,
      path,
      mtimeMs: -1
    };

    try {
      await deployAndRun();
    } catch (err) {
      console.error('failed to deploy uploaded diagram', err);

      return res.status(500).json({
        error: err.message
      });
    }

    return res.status(201).json({});
  });

  app.get('/api/process-instance', failSafe, async (req, res, next) => {

    if (!processInstance) {
      return res.status(412).json({
        error: 'no process instance'
      });
    }

    const details = await fetchedDetails;

    return res.json(details);
  });

  app.post('/api/diagram/open-external', failSafe, async (req, res, next) => {

    const diagram = getDiagram();

    if (!diagram) {
      return res.status(404).json({
        error: 'no diagram'
      });
    }

    if (!diagram.path) {
      return res.status(412).json({
        error: 'diagram has no path'
      });
    }

    console.log('Opening diagram in external tool...');

    const app = options.diagramEditor;

    await opn(diagram.path, app ? { app } : {});

    return res.json({});
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


  setTimeout(reload, 1000);


  if (diagramPath) {

    setInterval(async function() {

      try {
        let newDiagram = await getLocalDiagram();

        let tsOld = diagram ? diagram.mtimeMs : -1;
        let tsNew = newDiagram ? newDiagram.mtimeMs : -1;


        if (tsOld < tsNew) {
          // diagram changed externally, reloading
          console.debug('Diagram changed externally, reloading');

          reload();
        }
      } catch (err) {
        console.error('External change check failed', err);
      }
    }, 2000);
  }


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