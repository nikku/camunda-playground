const path = require('path');

const polka = require('polka');

const sirv = require('sirv');

const opn = require('open');

const getPort = require('get-port');

const { json } = require('body-parser');

const {
  readFile
} = require('./util');

const middlewares = [ failSafe, compat ];

const EngineApi = require('./engine-api');


const staticDirectory = path.resolve(__dirname + '/../static');

async function create(options) {

  const diagramPath = options.diagramPath;
  const verbose = options.verbose;

  const engine = new EngineApi(options.camundaBase || 'http://localhost:8080');

  const app = polka();

  let uploadedDiagram;

  let diagram;

  let runError;

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
    deployment = null;
    processDefinition = null;
    processInstance = null;
    runError = null;
  }

  async function reload() {

    try {
      diagram = await getDiagram();

      if (!diagram) {
        console.debug('No diagram to load');

        return clear();
      }

      const processInstance = await deployAndRun(diagram);

      if (processInstance) {
        console.log('Process deployed and instance started');
      }
    } catch (err) {
      console.warn('Failed to run diagram: %s', err);
    }
  }

  async function deployAndRun(newDiagram) {

    clear();

    try {
      deployment = await engine.deployDiagram(newDiagram);

      processDefinition = deployment.deployedProcessDefinition;

      if (!processDefinition) {
        runError = {
          message: 'no executable process to run',
          details: 'No process in the diagram marked as isExecutable',
          state: 'NOT_RUNNABLE'
        };

        return;
      }

      processInstance = await engine.startProcessInstance(processDefinition);

      fetchedDetails = getInstanceDetails();

      return processInstance;
    } catch (err) {
      runError = {
        message: err.message,
        details: err.details
      };

      throw err;
    }
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

  app.put('/api/deploy', ...middlewares, async (req, res, next) => {

    const diagram = getDiagram();

    if (!diagram) {
      return res.status(400).json({
        message: 'no diagram'
      });
    }

    try {
      deployment = await engine.deployDiagram(diagram);

      return res.json(deployment);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.status(500).json({
        message: 'failed to deploy diagram'
      });
    }
  });

  app.post('/api/process-instance/start', ...middlewares, async (req, res, next) => {

    if (!processDefinition) {
      return res.status(412).json({
        message: 'no deployed process definition'
      });
    }

    try {
      processInstance = await engine.startProcessInstance(processDefinition);

      console.log('process instance restarted');

      return res.json(processInstance);
    } catch (err) {
      console.error('failed to deploy diagram', err);

      return res.status(500).json({
        message: 'failed to start diagram'
      });
    }
  });

  app.get('/api/diagram', ...middlewares, async (req, res, next) => {

    const diagram = await getDiagram();

    if (!diagram) {
      return res.status(404).json({
        message: 'no diagram'
      });
    }

    return res.json(diagram);
  });

  app.put('/api/diagram', ...middlewares, json(), async (req, res, next) => {

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
      await deployAndRun(uploadedDiagram);
    } catch (err) {
      console.error('failed to deploy uploaded diagram', err);

      return res.status(500).json({
        message: err.message
      });
    }

    return res.status(201).json({});
  });

  app.get('/api/process-instance', ...middlewares, async (req, res, next) => {

    if (runError) {
      return res.status(400).json(runError);
    }

    const details = await fetchedDetails;

    return res.json(details);
  });

  app.post('/api/diagram/open-external', ...middlewares, async (req, res, next) => {

    const diagram = getDiagram();

    if (!diagram) {
      return res.status(404).json({
        message: 'no diagram'
      });
    }

    if (!diagram.path) {
      return res.status(412).json({
        message: 'diagram has no path'
      });
    }

    console.log('Opening diagram in external tool...');

    const app = options.diagramEditor;

    await opn(diagram.path, app ? { app } : {});

    return res.json({});
  });


  // static resources

  app.use('/', sirv(staticDirectory, { dev: process.env.NODE_ENV === 'development'}));

  app.get('/', (req, res, next) => {
    res.sendFile(path.join(staticDirectory, 'index.html'));
  });

  const port = await getPort({ port: options.port });

  setInterval(async function() {

    const t = Date.now();

    try {
      fetchedDetails = getInstanceDetails();

      await fetchedDetails;
      verbose && console.debug('Fetched instance details (t=%sms)', Date.now() - t);
    } catch (err) {
      console.error('Failed to fetch instance details', err);
    }
  }, 2000);

  setTimeout(reload, 0);

  setInterval(async function() {

    try {
      let newDiagram = await getDiagram();

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
  }, 500);


  return new Promise((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve(`http://localhost:${port}`);
    });

  });

}

module.exports.create = create;

// helpers ///////////////

async function failSafe(req, res, next) {

  try {
    await next();
  } catch (err) {
    console.error('unhandled route error', err);

    res.status(500).send();
  }
}

function compat(req, res, next) {

  res.status = function(status) {
    this.statusCode = status;

    return this;
  };

  res.json = function(obj) {
    const json = JSON.stringify(obj);

    this.setHeader('Content-Type', 'application/json');

    return this.end(json);
  };

  next();
}