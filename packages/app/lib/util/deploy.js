const path = require('path');

const FormData = require('form-data');

const got = require('got');


const defaultOptions = {
  baseUrl: 'http://localhost:8080/engine-rest',
};

async function deploy(diagram) {

  const {
    path,
    contents
  } = diagram;

  const form = new FormData();

  form.append('deployment-name', 'camunda-playground-deployment');
  form.append('deployment-source', 'camunda-playground');
  form.append('deploy-changed-only', 'true');

  form.append(path.basename(path), contents);

  const {
    id,
    deployedProcessDefinitions
  } = await got.post('/deployment/create', {
    ...defaultOptions,
    body: form
  });

  return {
    id,
    processes: Object.keys(deployedProcessDefinitions)
  };
}